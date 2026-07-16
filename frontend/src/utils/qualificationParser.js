import * as XLSX from 'xlsx';
import { buildQualificationStatus, formatDateText } from './qualificationTypes';
import { resolveBranchRegion } from './branchGeoMap';
import {
  resolveContractorFilterValue,
  resolveQualificationBranch,
  SHENZHEN_HEADQUARTERS,
  UNMATCHED_BRANCH
} from './qualificationBranchResolver';

const TARGET_SHEET_NAMES = new Set(['渠道商', '中国区']);
const IGNORED_SHEET_NAMES = new Set(['国际区']);
const ROW_YIELD_INTERVAL = 2000;

const HEADER_ALIASES = {
  employeeId: ['员工/分包商/经销商编号', '人工编号', '员工编号', '人员编号', '工号', '员工号'],
  personName: ['员工/分包商/经销商名称', '人员姓名', '姓名', '员工姓名', '工程师姓名'],
  contractorCode: ['分包商编码', '渠道商编码', '渠道编码'],
  contractorName: ['分包商名称', '渠道商', '渠道商名称', '渠道名称'],
  branch: ['所属分公司', '分公司', '所属公司'],
  region: ['区域', '大区'],
  productLine: ['产品线描述'],
  productLineFallback: ['产品线', '大产线', '产线', '部门'],
  machineModel: ['机器型号', '型号', '机型'],
  qualificationType: ['服务资质类别描述', '服务资质类型', '资质类型', '服务资质类别'],
  qualificationTypeCode: ['服务资质类别编码'],
  startDate: ['有效起始日期', '有效开始日期', '资质有效起始日期'],
  expiryDate: ['有效截止日期', '资质有效期', '有效期', '截止日期', '资质有效截止日期', '有效截止时间'],
  organization: ['经销商', '单位', '机构', '所属机构', '服务机构']
};

const NORMALIZED_ALIAS_LOOKUP = Object.fromEntries(
  Object.entries(HEADER_ALIASES).map(([field, aliases]) => [
    field,
    aliases.map(normalizeHeaderText)
  ])
);

const EXCLUDED_BRANCH_NAMES = new Set(['法国', '荷兰', '英国']);

export async function parseQualificationFiles(fileList, options = {}) {
  const files = Array.from(fileList || []).filter(Boolean);
  if (!files.length) {
    throw new Error('请先选择至少一个资质表文件');
  }

  const reportProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
  const records = [];
  const warnings = [];
  const unmatchedBranchSamples = new Set();
  let unmatchedBranchCount = 0;

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
      cellDates: true,
      dense: true
    });
    const sheetNames = resolveSheetNamesToParse(workbook.SheetNames);

    reportProgress?.({
      step: 'read',
      status: 'processing',
      progress: scaleProgress((fileIndex + 1) / Math.max(files.length, 1), 8, 22),
      message: `已读取 ${file.name}，正在检查 Sheet 结构`
    });

    for (const [sheetIndex, sheetName] of sheetNames.entries()) {
      const worksheet = workbook.Sheets[sheetName];
      const range = getWorksheetRange(worksheet);
      if (!worksheet || !range) continue;

      reportProgress?.({
        step: 'structure',
        status: 'processing',
        progress: scaleProgress((fileIndex + sheetIndex / Math.max(sheetNames.length, 1)) / Math.max(files.length, 1), 18, 36),
        message: `正在解析第 ${sheetIndex + 1} 个 Sheet：${sheetName}`
      });

      const headerRowIndex = findHeaderRowIndex(worksheet, range);
      if (headerRowIndex === -1) {
        warnings.push(`${file.name} / ${sheetName} 未识别到有效表头，已跳过`);
        continue;
      }

      const headerRow = getRowValues(worksheet, headerRowIndex, range);
      const columnIndexMap = buildColumnIndexMap(headerRow);
      const missingCoreFields = getMissingCoreFields(columnIndexMap);
      if (missingCoreFields.length) {
        warnings.push(`${file.name} / ${sheetName} 缺少关键字段：${missingCoreFields.join('、')}，已跳过`);
        continue;
      }

      const totalRows = Math.max(range.e.r - headerRowIndex, 1);
      for (let rowIndex = headerRowIndex + 1; rowIndex <= range.e.r; rowIndex += 1) {
        const row = getRowValues(worksheet, rowIndex, range);
        if (isBlankRow(row)) continue;

        if ((rowIndex - headerRowIndex) % ROW_YIELD_INTERVAL === 0) {
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
          await yieldToBrowser();
        }

        const record = buildRecordFromRow({
          row,
          columnIndexMap,
          fileName: file.name,
          sheetName,
          rowNumber: rowIndex + 1
        });
        if (!record) continue;
        if (record.__skipReason === 'unmatchedBranch') {
          unmatchedBranchCount += 1;
          if (unmatchedBranchSamples.size < 10) {
            unmatchedBranchSamples.add(record.contractorName || record.rawBranch || `${sheetName} 第 ${rowIndex + 1} 行`);
          }
          continue;
        }
        records.push(record);
      }
    }
  }

  if (unmatchedBranchSamples.size) {
    warnings.push(`未纳入统计 ${unmatchedBranchCount} 条：未能按离线规则匹配到六个大区内的分公司。示例：${[...unmatchedBranchSamples].join('、')}`);
  }

  if (!records.length) {
    if (warnings.some((warning) => warning.includes('缺少关键字段'))) {
      throw new Error('未识别到必要字段：产品线、机器型号、资质类型、有效截止日期。请检查 Excel 表头是否正确。');
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

function buildRecordFromRow({ row, columnIndexMap, fileName, sheetName, rowNumber }) {
  const employeeId = pickFirstMeaningfulValue(row, columnIndexMap, ['employeeId']);
  const personNameCandidate = pickFirstMeaningfulValue(row, columnIndexMap, ['personName']);
  const contractorName = pickFirstMeaningfulValue(row, columnIndexMap, ['contractorName']);
  const contractorCode = pickFirstMeaningfulValue(row, columnIndexMap, ['contractorCode']);
  const organization = contractorName || pickFirstMeaningfulValue(row, columnIndexMap, ['organization']);
  const rawBranch = pickFirstMeaningfulValue(row, columnIndexMap, ['branch']);
  const rawRegion = pickFirstMeaningfulValue(row, columnIndexMap, ['region']);
  const productLine = resolveProductLine(row, columnIndexMap);
  const machineModel = pickFirstMeaningfulValue(row, columnIndexMap, ['machineModel']);
  const qualificationType = pickFirstMeaningfulValue(row, columnIndexMap, ['qualificationType', 'qualificationTypeCode']);
  const startRaw = readCellValue(row, columnIndexMap.startDate);
  const expiryRaw = readCellValue(row, columnIndexMap.expiryDate);

  if (!employeeId && !personNameCandidate && !contractorName && !rawBranch && !productLine && !machineModel && !qualificationType && !expiryRaw) {
    return null;
  }

  const branch = resolveQualificationBranch({ rawBranch, contractorName, sourceSheet: sheetName });
  if (!branch) {
    return rawBranch && !shouldExcludeBranch(rawBranch)
      ? {
          __skipReason: 'unmatchedBranch',
          rawBranch,
          contractorName,
          sourceSheet: sheetName,
          sourceRow: rowNumber
        }
      : null;
  }
  if (shouldExcludeBranch(branch)) return null;

  const statusMeta = buildQualificationStatus(expiryRaw);
  const mappedRegion = resolveBranchRegion(branch);
  if (branch === UNMATCHED_BRANCH || !mappedRegion) {
    if (branch === SHENZHEN_HEADQUARTERS) return null;
    return {
      __skipReason: 'unmatchedBranch',
      rawBranch,
      contractorName,
      sourceSheet: sheetName,
      sourceRow: rowNumber
    };
  }
  const personName = personNameCandidate || contractorName || organization || '未命名人员';
  const normalizedSheetName = normalizeSheetName(sheetName);

  return {
    id: `${fileName}-${sheetName}-${rowNumber}`,
    employeeId,
    personName,
    branch,
    rawBranch,
    mappedRegion,
    region: rawRegion || mappedRegion,
    productLine: productLine || '未分类产品线',
    machineModel: machineModel || '未标注型号',
    qualificationType: qualificationType || '未标注资质类型',
    startDate: formatDateText(startRaw),
    expiryDate: statusMeta.expiryDateText || formatDateText(expiryRaw),
    qualificationStatus: statusMeta.status,
    statusTone: statusMeta.status === '已过期' ? 'critical' : statusMeta.status === '有效' ? 'good' : 'warning',
    daysUntilExpiry: statusMeta.daysUntilExpiry,
    isCurrentlyValid: statusMeta.isCurrentlyValid,
    organization,
    contractorCode,
    contractorName,
    contractorFilterValue: resolveContractorFilterValue(contractorName),
    isChannelPartner: normalizedSheetName === '渠道商',
    geoLocationName: branch,
    sourceFile: fileName,
    sourceSheet: sheetName,
    sourceRow: rowNumber
  };
}

function resolveSheetNamesToParse(sheetNames = []) {
  const targetSheets = sheetNames.filter((sheetName) => TARGET_SHEET_NAMES.has(normalizeSheetName(sheetName)));
  if (targetSheets.length) return targetSheets;
  return sheetNames.filter((sheetName) => !IGNORED_SHEET_NAMES.has(normalizeSheetName(sheetName)));
}

function getMissingCoreFields(columnIndexMap) {
  const missingCoreFields = [];
  if (columnIndexMap.expiryDate === undefined) missingCoreFields.push('有效截止日期');
  if (columnIndexMap.machineModel === undefined) missingCoreFields.push('机器型号');
  if (columnIndexMap.productLine === undefined && columnIndexMap.productLineFallback === undefined) missingCoreFields.push('产品线');
  if (columnIndexMap.qualificationType === undefined && columnIndexMap.qualificationTypeCode === undefined) missingCoreFields.push('服务资质类别');
  return missingCoreFields;
}

function scaleProgress(ratio, start, end) {
  const safeRatio = Math.max(0, Math.min(1, ratio || 0));
  return start + (end - start) * safeRatio;
}

function findHeaderRowIndex(worksheet, range) {
  let bestMatch = { rowIndex: -1, score: 0 };
  const scanEnd = Math.min(range.e.r, range.s.r + 11);

  for (let rowIndex = range.s.r; rowIndex <= scanEnd; rowIndex += 1) {
    const normalizedRow = getRowValues(worksheet, rowIndex, range).map(normalizeHeaderText);
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

  return bestMatch.score >= 4 ? bestMatch.rowIndex : -1;
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
  const nonNumeric = preferredCandidates.find((value) => /[A-Za-z\u4e00-\u9fa5]/u.test(value) && !/^\d+$/u.test(value));
  return nonNumeric || preferredCandidates[0] || '';
}

function pickFirstMeaningfulValue(row, columnIndexMap, fields) {
  const candidates = fields
    .map((field) => readCellValue(row, columnIndexMap[field]))
    .filter(Boolean);
  return candidates[0] || '';
}

function getWorksheetRange(worksheet) {
  if (!worksheet?.['!ref']) return null;
  return XLSX.utils.decode_range(worksheet['!ref']);
}

function getRowValues(worksheet, rowIndex, range) {
  const row = [];
  for (let columnIndex = range.s.c; columnIndex <= range.e.c; columnIndex += 1) {
    row.push(readWorksheetCellValue(worksheet, rowIndex, columnIndex));
  }
  return row;
}

function readWorksheetCellValue(worksheet, rowIndex, columnIndex) {
  const denseCell = Array.isArray(worksheet) ? worksheet[rowIndex]?.[columnIndex] : null;
  const cell = denseCell || worksheet?.[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })];
  if (!cell) return '';
  if (cell.v instanceof Date) return formatDateText(cell.v);
  if (cell.v !== undefined && cell.v !== null) return cell.v;
  if (cell.w !== undefined && cell.w !== null) return cell.w;
  return '';
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
  return /[A-Za-z]/u.test(normalizedBranch);
}

function normalizeSheetName(value) {
  return String(value ?? '').replace(/\s+/g, '').trim();
}

function normalizeHeaderText(value) {
  return String(value ?? '')
    .replace(/\s+/g, '')
    .replace(/[()（）【】[\]\/\\_-]/g, '')
    .replace(/资质有效截止日期/g, '资质有效期')
    .replace(/有效截止日期/g, '截止日期')
    .trim();
}

function yieldToBrowser() {
  return new Promise((resolve) => globalThis.setTimeout(resolve, 0));
}
