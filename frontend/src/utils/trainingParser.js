import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { normalizeTrainingResult } from './trainingStatusNormalizer';
import { normalizeTrainingBranchName, resolveTrainingRegion } from './branchRegionMap';

const HEADER_ALIASES = {
  branch: ['区域', '分公司', '所属分公司', '服务区域'],
  region: ['大区', '区域大区', '所属大区', '班次所在大区'],
  productLine: ['产线', '产品线', '小产线', '业务线'],
  trainingYear: ['培训年度', '年度', '年份'],
  trainingMonth: ['培训月份', '月份'],
  trainingResult: ['完成情况', '成绩结果', '培训结果', '是否合格', '状态'],
  location: ['培训组织方', '培训地点', '培训中心', '组织方', '举办地点'],
  trainingType: ['培训类型', '课程类型', '培训形式', '课程形式'],
  courseName: ['培训名称', '课程名称'],
  lecturer: ['讲师', '讲师账号/姓名/组织'],
  studentName: ['学员姓名', '姓名'],
  studentOrg: ['学员组织', '学员组织名称'],
  score: ['成绩'],
  durationHours: ['课时'],
  startDate: ['培训开始时间', '培训开始日期'],
  endDate: ['培训结束时间', '培训结束日期'],
  batchId: ['班次ID'],
  organizer: ['培训组织方'],
  trainingPlace: ['培训地点']
};

const NORMALIZED_ALIAS_LOOKUP = Object.fromEntries(
  Object.entries(HEADER_ALIASES).map(([field, aliases]) => [field, aliases.map(normalizeHeaderText)])
);

const EXCLUDED_TRAINING_BRANCHES = new Set([
  '国际用户服务部',
  '生命信息与支持用户服务部',
  '体外诊断用户服务部',
  '医学影像用户服务部',
  '中国区用户服务部'
]);

export async function parseTrainingFiles(fileList, options = {}) {
  const files = Array.from(fileList || []).filter(Boolean);
  if (!files.length) {
    throw new Error('请先选择至少一个培训表文件');
  }

  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
  const records = [];
  const warnings = [];

  for (const [fileIndex, file] of files.entries()) {
    onProgress?.({
      step: 'read',
      status: 'processing',
      progress: scaleProgress(fileIndex / Math.max(files.length, 1), 0, 18),
      message: `正在读取第 ${fileIndex + 1} 个 Excel 文件：${file.name}`
    });

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

    for (const [sheetIndex, sheetName] of workbook.SheetNames.entries()) {
      const worksheet = workbook.Sheets[sheetName];
      const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: true });
      if (!matrix.length) continue;

      onProgress?.({
        step: 'structure',
        status: 'processing',
        progress: scaleProgress((fileIndex + sheetIndex / Math.max(workbook.SheetNames.length, 1)) / Math.max(files.length, 1), 18, 36),
        message: `正在解析第 ${sheetIndex + 1} 个 Sheet：${sheetName}`
      });

      const headerRowIndex = findHeaderRowIndex(matrix);
      if (headerRowIndex === -1) {
        warnings.push(`${file.name} / ${sheetName} 未识别到有效表头，已跳过`);
        continue;
      }

      const headerRow = matrix[headerRowIndex];
      const columnIndexMap = buildColumnIndexMap(headerRow);
      const requiredFields = ['branch', 'productLine', 'trainingResult'];
      const missingFields = requiredFields.filter((field) => columnIndexMap[field] === undefined);
      if (columnIndexMap.trainingYear === undefined && columnIndexMap.startDate === undefined) missingFields.push('trainingYear');
      if (columnIndexMap.trainingMonth === undefined && columnIndexMap.startDate === undefined) missingFields.push('trainingMonth');
      if (missingFields.length >= 3) {
        warnings.push(`${file.name} / ${sheetName} 缺少关键字段，已跳过`);
        continue;
      }

      const totalRows = Math.max(matrix.length - headerRowIndex - 1, 1);
      for (let rowIndex = headerRowIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
        const row = matrix[rowIndex];
        if (isBlankRow(row)) continue;

        if ((rowIndex - headerRowIndex) % 2000 === 0) {
          const rowProgress = (rowIndex - headerRowIndex) / totalRows;
          onProgress?.({
            step: 'clean',
            status: 'processing',
            progress: scaleProgress(rowProgress, 36, 62),
            message: `正在清洗培训数据：${sheetName} 第 ${rowIndex + 1} 行`
          });
          onProgress?.({
            step: 'result',
            status: 'processing',
            progress: scaleProgress(rowProgress, 52, 84),
            message: '正在计算培训结果和培训周期...'
          });
        }

        const rawBranch = pickFirstMeaningfulValue(row, columnIndexMap, ['branch']);
        const branch = normalizeTrainingBranchName(rawBranch);
        const mappedRegion = columnIndexMap.region !== undefined
          ? resolveRegionFallback(readCellValue(row, columnIndexMap.region), branch)
          : resolveRegionFallback('', branch);
        const productLine = pickFirstMeaningfulValue(row, columnIndexMap, ['productLine']);
        const trainingType = pickFirstMeaningfulValue(row, columnIndexMap, ['trainingType']) || '未知';
        const location = pickFirstMeaningfulValue(row, columnIndexMap, ['location', 'trainingPlace', 'organizer']) || '未知';
        const courseName = pickFirstMeaningfulValue(row, columnIndexMap, ['courseName']) || '未知课程';
        const lecturer = pickFirstMeaningfulValue(row, columnIndexMap, ['lecturer']) || '未知';
        const studentName = pickFirstMeaningfulValue(row, columnIndexMap, ['studentName']);
        const studentOrg = pickFirstMeaningfulValue(row, columnIndexMap, ['studentOrg']) || '未知';
        const trainingResultMeta = normalizeTrainingResult(pickFirstMeaningfulValue(row, columnIndexMap, ['trainingResult']));
        const cycle = resolveTrainingCycle(row, columnIndexMap);
        const score = pickFirstMeaningfulValue(row, columnIndexMap, ['score']);
        const batchId = pickFirstMeaningfulValue(row, columnIndexMap, ['batchId']);
        const startDate = pickFirstMeaningfulValue(row, columnIndexMap, ['startDate']);
        const endDate = pickFirstMeaningfulValue(row, columnIndexMap, ['endDate']);
        const durationHours = pickFirstMeaningfulValue(row, columnIndexMap, ['durationHours']);

        if (!branch && !productLine && !cycle && !trainingType) continue;
        if (shouldExcludeTrainingBranch(branch)) continue;

        const sessionKey = buildTrainingSessionKey({
          batchId,
          cycle,
          location,
          trainingType,
          courseName,
          productLine
        });

        records.push({
          id: `${file.name}-${sheetName}-${rowIndex + 1}`,
          branch: branch || '未匹配分公司',
          mappedRegion,
          productLine: productLine || '未知',
          trainingCycle: cycle || '未知',
          trainingResult: trainingResultMeta.normalized,
          trainingType,
          trainingLocation: location,
          organizer: pickFirstMeaningfulValue(row, columnIndexMap, ['organizer']) || location,
          courseName,
          lecturer,
          studentName: studentName || '',
          studentOrg,
          score: score || '',
          durationHours: durationHours || '',
          startDate: formatDateCell(startDate),
          endDate: formatDateCell(endDate),
          trainingYear: extractYearValue(row, columnIndexMap),
          trainingMonth: extractMonthValue(row, columnIndexMap),
          sessionKey,
          batchId,
          isPass: trainingResultMeta.isPass,
          isFail: trainingResultMeta.isFail,
          isEffectiveResult: trainingResultMeta.isEffective,
          sourceFile: file.name,
          sourceSheet: sheetName,
          sourceRow: rowIndex + 1
        });
      }
    }
  }

  if (!records.length) {
    throw new Error('导入失败：未识别到必要字段「区域、产线、培训年度、培训月份、完成情况」。');
  }

  onProgress?.({ step: 'read', status: 'completed', progress: 18, message: 'Excel 文件读取完成' });
  onProgress?.({ step: 'structure', status: 'completed', progress: 36, message: '培训字段识别完成' });
  onProgress?.({ step: 'clean', status: 'completed', progress: 62, message: '培训数据清洗完成' });
  onProgress?.({ step: 'result', status: 'completed', progress: 84, message: '培训结果计算完成' });

  return { records, warnings };
}

function resolveTrainingCycle(row, columnIndexMap) {
  const year = extractYearValue(row, columnIndexMap);
  const month = extractMonthValue(row, columnIndexMap);
  if (year && month) return `${year}-${String(month).padStart(2, '0')}`;

  const fallbackDate = readCellValue(row, columnIndexMap.startDate);
  if (!fallbackDate) return '';
  const parsed = dayjs(fallbackDate);
  return parsed.isValid() ? parsed.format('YYYY-MM') : '';
}

function extractYearValue(row, columnIndexMap) {
  return readCellValue(row, columnIndexMap.trainingYear).replace(/\D/g, '').slice(0, 4);
}

function extractMonthValue(row, columnIndexMap) {
  const rawMonth = readCellValue(row, columnIndexMap.trainingMonth).replace(/\D/g, '');
  if (rawMonth) return String(Number(rawMonth)).padStart(2, '0');
  const fallbackDate = readCellValue(row, columnIndexMap.startDate);
  const parsed = dayjs(fallbackDate);
  return parsed.isValid() ? parsed.format('MM') : '';
}

function resolveRegionFallback(rawRegion, branch) {
  const value = String(rawRegion || '').trim();
  if (value && value !== '中国区') return value;
  return resolveTrainingRegion(branch);
}

function buildTrainingSessionKey({ batchId, cycle, location, trainingType, courseName, productLine }) {
  if (batchId) return batchId;
  return [cycle, location, trainingType, courseName, productLine].filter(Boolean).join('|');
}

function findHeaderRowIndex(matrix) {
  let bestMatch = { rowIndex: -1, score: 0 };
  const scanLimit = Math.min(matrix.length, 12);
  for (let rowIndex = 0; rowIndex < scanLimit; rowIndex += 1) {
    const normalizedRow = matrix[rowIndex].map(normalizeHeaderText);
    let score = 0;
    for (const aliases of Object.values(NORMALIZED_ALIAS_LOOKUP)) {
      if (aliases.some((alias) => normalizedRow.includes(alias))) score += 1;
    }
    if (score > bestMatch.score) bestMatch = { rowIndex, score };
  }
  return bestMatch.score >= 4 ? bestMatch.rowIndex : -1;
}

function buildColumnIndexMap(headerRow) {
  const normalizedHeaders = headerRow.map(normalizeHeaderText);
  const columnIndexMap = {};
  Object.entries(NORMALIZED_ALIAS_LOOKUP).forEach(([field, aliases]) => {
    const matchedIndex = normalizedHeaders.findIndex((header) => aliases.includes(header));
    if (matchedIndex !== -1) columnIndexMap[field] = matchedIndex;
  });
  return columnIndexMap;
}

function scaleProgress(ratio, start, end) {
  const safeRatio = Math.max(0, Math.min(1, ratio || 0));
  return start + (end - start) * safeRatio;
}

function pickFirstMeaningfulValue(row, columnIndexMap, fields) {
  const candidates = fields.map((field) => readCellValue(row, columnIndexMap[field])).filter(Boolean);
  return candidates[0] || '';
}

function readCellValue(row, index) {
  if (index === undefined || index === null || index >= row.length) return '';
  const value = row[index];
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return dayjs(value).format('YYYY-MM-DD HH:mm:ss');
  return String(value).replace(/\u00a0/g, ' ').trim();
}

function formatDateCell(value) {
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : String(value || '').trim();
}

function isBlankRow(row) {
  return !row?.some((cell) => String(cell ?? '').trim());
}

function shouldExcludeTrainingBranch(branch) {
  const normalizedBranch = String(branch || '').trim();
  if (!normalizedBranch) return false;
  return EXCLUDED_TRAINING_BRANCHES.has(normalizedBranch);
}

function normalizeHeaderText(value) {
  return String(value ?? '')
    .replace(/\s+/g, '')
    .replace(/[()（）【】\[\]\/\\_-]/g, '')
    .trim();
}
