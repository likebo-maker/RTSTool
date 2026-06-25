import * as XLSX from 'xlsx';
import { buildQualificationStatus, formatDateText } from './qualificationTypes';
import { resolveBranchRegion } from './branchGeoMap';

const HEADER_ALIASES = {
  branch: ['所属分公司', '分公司', '所属公司'],
  region: ['区域', '大区'],
  productLine: ['产品线描述'],
  productLineFallback: ['产品线', '大产线', '产线', '部门'],
  machineModel: ['机器型号', '型号', '机型'],
  qualificationType: ['服务资质类别描述', '服务资质类型', '资质类型', '服务资质类别'],
  qualificationTypeCode: ['服务资质类别编码'],
  expiryDate: ['资质有效期', '有效期', '截止日期', '有效截止日期', '资质有效截止日期', '有效截止时间'],
  personName: ['人员姓名', '姓名', '员工姓名', '工程师姓名', '员工/分包商/经销商名称'],
  organization: ['经销商', '单位', '分包商名称', '员工/分包商/经销商名称']
};

const NORMALIZED_ALIAS_LOOKUP = Object.fromEntries(
  Object.entries(HEADER_ALIASES).map(([field, aliases]) => [
    field,
    aliases.map(normalizeHeaderText)
  ])
);

const EXCLUDED_BRANCH_NAMES = new Set(['法国', '荷兰', '英国', '总部']);

export async function parseQualificationFiles(fileList, options = {}) {
  const files = Array.from(fileList || []).filter(Boolean);
  if (!files.length) {
    throw new Error('请先选择至少一个资质表文件');
  }

  const reportProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
  const records = [];
  const warnings = [];

  for (const [fileIndex, file] of files.entries()) {
    reportProgress?.({
      step: 'read',
      status: 'processing',
      progress: scaleProgress(fileIndex / Math.max(files.length, 1), 0, 18),
      message: `正在读取第 ${fileIndex + 1} 个 Excel 文件：${file.name}`
    });
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      cellDates: true
    });
    reportProgress?.({
      step: 'read',
      status: 'processing',
      progress: scaleProgress((fileIndex + 1) / Math.max(files.length, 1), 8, 22),
      message: `已读取 ${file.name}，正在检查 Sheet 结构`
    });

    for (const [sheetIndex, sheetName] of workbook.SheetNames.entries()) {
      const worksheet = workbook.Sheets[sheetName];
      const matrix = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        raw: true
      });
      if (!matrix.length) continue;

      reportProgress?.({
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
      reportProgress?.({
        step: 'structure',
        status: 'processing',
        progress: scaleProgress((sheetIndex + 1) / Math.max(workbook.SheetNames.length, 1), 24, 40),
        message: `正在识别「分公司 / 产品线 / 机器型号 / 服务资质类型」字段...`
      });
      const missingCoreFields = ['branch', 'machineModel', 'expiryDate'].filter((field) => columnIndexMap[field] === undefined);
      if (columnIndexMap.productLine === undefined && columnIndexMap.productLineFallback === undefined) {
        missingCoreFields.push('productLine');
      }
      if (columnIndexMap.qualificationType === undefined && columnIndexMap.qualificationTypeCode === undefined) {
        missingCoreFields.push('qualificationType');
      }
      if (missingCoreFields.length >= 3) {
        warnings.push(`${file.name} / ${sheetName} 缺少关键字段，已跳过`);
        continue;
      }

      const totalRows = Math.max(matrix.length - headerRowIndex - 1, 1);
      for (let rowIndex = headerRowIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
        const row = matrix[rowIndex];
        if (isBlankRow(row)) continue;

        if ((rowIndex - headerRowIndex) % 2000 === 0) {
          const rowProgress = (rowIndex - headerRowIndex) / totalRows;
          reportProgress?.({
            step: 'clean',
            status: 'processing',
            progress: scaleProgress(rowProgress, 40, 66),
            message: `正在清洗资质数据：${sheetName} 第 ${rowIndex + 1} 行`
          });
          reportProgress?.({
            step: 'status',
            status: 'processing',
            progress: scaleProgress(rowProgress, 52, 84),
            message: '正在计算资质有效期状态...'
          });
        }

        const productLine = resolveProductLine(row, columnIndexMap);
        const machineModel = pickFirstMeaningfulValue(row, columnIndexMap, ['machineModel']);
        const qualificationType = pickFirstMeaningfulValue(row, columnIndexMap, ['qualificationType', 'qualificationTypeCode']);
        const branch = pickFirstMeaningfulValue(row, columnIndexMap, ['branch']);
        const expiryRaw = readCellValue(row, columnIndexMap.expiryDate);

        if (!branch && !productLine && !machineModel && !qualificationType && !expiryRaw) continue;
        if (shouldExcludeBranch(branch)) continue;

        const organization = pickFirstMeaningfulValue(row, columnIndexMap, ['organization']);
        const personNameCandidate = pickFirstMeaningfulValue(row, columnIndexMap, ['personName']);
        const personName = personNameCandidate || organization || '未命名人员';
        const statusMeta = buildQualificationStatus(expiryRaw);
        const mappedRegion = resolveBranchRegion(branch);

        records.push({
          id: `${file.name}-${sheetName}-${rowIndex + 1}`,
          personName,
          branch,
          mappedRegion,
          region: pickFirstMeaningfulValue(row, columnIndexMap, ['region']),
          productLine: productLine || '未分类产品线',
          machineModel: machineModel || '未标注型号',
          qualificationType: qualificationType || '未标注资质类型',
          expiryDate: statusMeta.expiryDateText || formatDateText(expiryRaw),
          qualificationStatus: statusMeta.status,
          statusTone: statusMeta.status === '已过期' ? 'critical' : statusMeta.status === '有效' ? 'good' : 'warning',
          daysUntilExpiry: statusMeta.daysUntilExpiry,
          isCurrentlyValid: statusMeta.isCurrentlyValid,
          organization,
          sourceFile: file.name,
          sourceSheet: sheetName,
          sourceRow: rowIndex + 1
        });
      }
    }
  }

  if (!records.length) {
    if (warnings.some((warning) => warning.includes('缺少关键字段'))) {
      throw new Error('未识别到必要字段：分公司、产品线、资质有效期。请检查 Excel 表头是否正确。');
    }
    throw new Error('未从导入文件中识别到有效资质数据');
  }

  reportProgress?.({
    step: 'read',
    status: 'completed',
    progress: 18,
    message: 'Excel 文件读取完成'
  });
  reportProgress?.({
    step: 'structure',
    status: 'completed',
    progress: 38,
    message: '字段结构识别完成'
  });
  reportProgress?.({
    step: 'clean',
    status: 'completed',
    progress: 64,
    message: '资质数据清洗完成'
  });
  reportProgress?.({
    step: 'status',
    status: 'completed',
    progress: 84,
    message: '资质状态计算完成'
  });

  return {
    records,
    warnings
  };
}

function scaleProgress(ratio, start, end) {
  const safeRatio = Math.max(0, Math.min(1, ratio || 0));
  return start + (end - start) * safeRatio;
}

function findHeaderRowIndex(matrix) {
  let bestMatch = { rowIndex: -1, score: 0 };
  const scanLimit = Math.min(matrix.length, 12);

  for (let rowIndex = 0; rowIndex < scanLimit; rowIndex += 1) {
    const normalizedRow = matrix[rowIndex].map(normalizeHeaderText);
    let score = 0;
    for (const aliases of Object.values(NORMALIZED_ALIAS_LOOKUP)) {
      if (aliases.some((alias) => normalizedRow.includes(alias))) {
        score += 1;
      }
    }
    if (score > bestMatch.score) {
      bestMatch = { rowIndex, score };
    }
  }

  return bestMatch.score >= 3 ? bestMatch.rowIndex : -1;
}

function buildColumnIndexMap(headerRow) {
  const normalizedHeaders = headerRow.map(normalizeHeaderText);
  const columnIndexMap = {};

  Object.entries(NORMALIZED_ALIAS_LOOKUP).forEach(([field, aliases]) => {
    const matchedIndex = normalizedHeaders.findIndex((header) => aliases.includes(header));
    if (matchedIndex !== -1) {
      columnIndexMap[field] = matchedIndex;
    }
  });

  return columnIndexMap;
}

function resolveProductLine(row, columnIndexMap) {
  const preferredCandidates = [
    readCellValue(row, columnIndexMap.productLine),
    readCellValue(row, columnIndexMap.productLineFallback)
  ].filter(Boolean);
  const nonNumeric = preferredCandidates.find((value) => /[A-Za-z\u4e00-\u9fa5]/.test(value) && !/^\d+$/.test(value));
  return nonNumeric || preferredCandidates[0] || '';
}

function pickFirstMeaningfulValue(row, columnIndexMap, fields) {
  const candidates = fields
    .map((field) => readCellValue(row, columnIndexMap[field]))
    .filter(Boolean);
  return candidates[0] || '';
}

function readCellValue(row, index) {
  if (index === undefined || index === null || index >= row.length) return '';
  const value = row[index];
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return formatDateText(value);
  return String(value).replace(/\u00a0/g, ' ').trim();
}

function isBlankRow(row) {
  return !row?.some((cell) => String(cell ?? '').trim());
}

function shouldExcludeBranch(branch) {
  const normalizedBranch = String(branch || '').trim();
  if (!normalizedBranch) return false;
  if (EXCLUDED_BRANCH_NAMES.has(normalizedBranch)) return true;
  if (normalizedBranch.includes('长春分公司')) return true;
  return /[A-Za-z]/.test(normalizedBranch);
}

function normalizeHeaderText(value) {
  return String(value ?? '')
    .replace(/\s+/g, '')
    .replace(/[()（）【】\[\]\/\\_-]/g, '')
    .replace(/资质有效截止日期/g, '资质有效期')
    .replace(/有效截止日期/g, '截止日期')
    .trim();
}
