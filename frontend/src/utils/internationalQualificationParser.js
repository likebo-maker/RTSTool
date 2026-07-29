import * as XLSX from 'xlsx';
import { buildQualificationStatus, formatDateText } from './qualificationTypes';
import {
  hasCountryCapitalCoordinate,
  resolveCountrySecondaryRegion,
  resolveGlobalCountry,
  resolveGlobalSecondaryRegion
} from './globalRegionMap';
import {
  auditInternationalQualificationDimensions,
  formatInternationalDimensionIssues
} from './internationalQualificationDataQuality';

const ROW_YIELD_INTERVAL = 2000;
const INTERNATIONAL_REGION_LABEL = 'International Region';
const ENABLED_STATUS = 'enable';

const HEADER_ALIASES = {
  employeeId: ['*账号', '账号', '工号', '人工编号', '人员编号', '员工编号'],
  personName: ['*姓名', '姓名', '员工姓名', '人员姓名'],
  accountStatus: ['账号状态', '账户状态'],
  partnerCode: ['渠道商编号'],
  partnerName: ['渠道商名称', '渠道商', '经销商'],
  branch: ['分公司', '国家'],
  rawRegion: ['地区', '区域'],
  trainingCenter: ['培训中心'],
  departmentName: ['部门名称'],
  productLine: ['产线', '产品线'],
  subProductLine: ['子产线'],
  modelCategory: ['机型大类'],
  modelSubCategory: ['机型小类'],
  qualificationTypeCode: ['*资质类型编号', '资质类型编号'],
  qualificationType: ['*资质类型', '资质类型'],
  startDate: ['*有效起始日期', '有效起始日期'],
  expiryDate: ['*有效截止日期', '有效截止日期', '有效期至'],
  certificateType: ['*证书类型', '证书类型'],
  certificateStatus: ['证书状态'],
  dedupeFlag: ['去重筛选']
};

const REQUIRED_FIELDS = [
  'employeeId',
  'personName',
  'accountStatus',
  'branch',
  'rawRegion',
  'departmentName',
  'productLine',
  'subProductLine',
  'modelCategory',
  'qualificationType',
  'expiryDate'
];

const NORMALIZED_ALIAS_LOOKUP = Object.fromEntries(
  Object.entries(HEADER_ALIASES).map(([field, aliases]) => [
    field,
    aliases.map(normalizeHeaderText)
  ])
);

export async function parseInternationalQualificationFiles(fileList, options = {}) {
  const files = Array.from(fileList || []).filter(Boolean);
  if (!files.length) {
    throw new Error('Please select at least one international qualification Excel file.');
  }

  const reportProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
  const records = [];
  const dirtyRows = [];
  const warnings = [];

  for (const [fileIndex, file] of files.entries()) {
    reportProgress?.({
      step: 'read',
      status: 'processing',
      progress: scaleProgress(fileIndex / Math.max(files.length, 1), 0, 18),
      message: `Reading Excel file ${fileIndex + 1}/${files.length}: ${file.name}`
    });

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      cellDates: true,
      dense: true
    });

    reportProgress?.({
      step: 'structure',
      status: 'processing',
      progress: scaleProgress((fileIndex + 0.2) / Math.max(files.length, 1), 18, 34),
      message: `Checking workbook structure: ${file.name}`
    });

    for (const [sheetIndex, sheetName] of workbook.SheetNames.entries()) {
      const worksheet = workbook.Sheets[sheetName];
      const range = getWorksheetRange(worksheet);
      if (!worksheet || !range) continue;

      const headerRowIndex = findHeaderRowIndex(worksheet, range);
      if (headerRowIndex === -1) {
        warnings.push(`${file.name} / ${sheetName}: header row was not recognized and the sheet was skipped.`);
        continue;
      }

      const headerRow = getRowValues(worksheet, headerRowIndex, range);
      const columnIndexMap = buildColumnIndexMap(headerRow);
      const missingFields = REQUIRED_FIELDS.filter((field) => columnIndexMap[field] === undefined);
      if (missingFields.length) {
        warnings.push(`${file.name} / ${sheetName}: missing required fields ${missingFields.join(', ')} and the sheet was skipped.`);
        continue;
      }

      const dataColumnIndexes = getDataColumnIndexes(columnIndexMap);
      const totalRows = Math.max(range.e.r - headerRowIndex, 1);
      for (let rowIndex = headerRowIndex + 1; rowIndex <= range.e.r; rowIndex += 1) {
        const fullRow = getRowValues(worksheet, rowIndex, range);
        if (isBlankRow(fullRow)) continue;
        const row = getSparseRowValuesFromFullRow(fullRow, dataColumnIndexes, range.s.c);

        if ((rowIndex - headerRowIndex) % ROW_YIELD_INTERVAL === 0) {
          const rowProgress = (rowIndex - headerRowIndex) / totalRows;
          reportProgress?.({
            step: 'clean',
            status: 'processing',
            progress: scaleProgress(rowProgress, 34, 72),
            message: `Cleaning ${sheetName}, row ${rowIndex + 1}`
          });
          await yieldToBrowser();
        }

        const rawData = buildRawData(headerRow, fullRow);
        const result = buildRecordFromRow({
          row,
          columnIndexMap,
          fileName: file.name,
          sheetName,
          rowNumber: rowIndex + 1,
          rawData
        });

        if (!result) continue;
        if (result.dirtyRow) {
          dirtyRows.push(result.dirtyRow);
        }
        if (result.warning) {
          warnings.push(result.warning);
        }
        if (result.record) {
          records.push(result.record);
        }
      }

      reportProgress?.({
        step: 'status',
        status: 'processing',
        progress: scaleProgress((sheetIndex + 1) / Math.max(workbook.SheetNames.length, 1), 72, 90),
        message: `Calculated qualification status for ${sheetName}`
      });
    }
  }

  reportProgress?.({ step: 'read', status: 'completed', progress: 20, message: 'Excel files loaded.' });
  reportProgress?.({ step: 'structure', status: 'completed', progress: 36, message: 'Headers recognized.' });
  reportProgress?.({ step: 'clean', status: 'completed', progress: 74, message: 'Rows cleaned and matched.' });
  reportProgress?.({ step: 'status', status: 'completed', progress: 90, message: 'Qualification status calculated.' });
  reportProgress?.({ step: 'chart', status: 'completed', progress: 100, message: 'Map and charts are ready.' });

  if (!records.length) {
    throw new Error('No valid international qualification rows were recognized. Please check region, country, account status, and required headers.');
  }

  return {
    records,
    dirtyRows,
    warnings
  };
}

function buildRecordFromRow({ row, columnIndexMap, fileName, sheetName, rowNumber, rawData }) {
  const accountStatus = pickFirstMeaningfulValue(row, columnIndexMap, ['accountStatus']);
  const rawRegion = pickFirstMeaningfulValue(row, columnIndexMap, ['rawRegion']);
  const rawBranch = pickFirstMeaningfulValue(row, columnIndexMap, ['branch']);
  const departmentName = pickFirstMeaningfulValue(row, columnIndexMap, ['departmentName']);
  const productLine = pickFirstMeaningfulValue(row, columnIndexMap, ['productLine']);
  const subProductLine = pickFirstMeaningfulValue(row, columnIndexMap, ['subProductLine']);
  const modelCategory = pickFirstMeaningfulValue(row, columnIndexMap, ['modelCategory']);
  const qualificationType = pickFirstMeaningfulValue(row, columnIndexMap, ['qualificationType', 'qualificationTypeCode']);
  const expiryRaw = readCellValue(row, columnIndexMap.expiryDate);

  if (!rawRegion && !rawBranch && !departmentName && !productLine && !modelCategory && !qualificationType && !expiryRaw) {
    return null;
  }

  const dirtyContext = {
    rawData,
    fileName,
    sheetName,
    rowNumber,
    rawRegion,
    rawBranch,
    departmentName
  };

  if (normalizeText(accountStatus).toLowerCase() !== ENABLED_STATUS) {
    return createDirtyResult(dirtyContext, `Account status is not Enable: ${accountStatus || 'blank'}`);
  }

  const regionIsInternational = normalizeText(rawRegion).toLowerCase() === INTERNATIONAL_REGION_LABEL.toLowerCase();
  const sourceSecondaryRegion = regionIsInternational
    ? resolveGlobalSecondaryRegion(rawBranch)
    : resolveGlobalSecondaryRegion(rawRegion);
  const countryCandidates = regionIsInternational
    ? [departmentName]
    : [rawBranch, departmentName];
  const countryRaw = countryCandidates.find((candidate) => resolveGlobalCountry(candidate)) || countryCandidates[0] || '';
  const country = resolveGlobalCountry(countryRaw);

  if (!country) {
    return createDirtyResult(dirtyContext, `Country was not recognized: ${countryRaw || 'blank'}`);
  }

  const expectedRegion = resolveCountrySecondaryRegion(country);
  const secondaryRegion = expectedRegion || sourceSecondaryRegion;
  if (!secondaryRegion) {
    throw new Error(
      `Local secondary-region configuration is missing for recognized country ${country}. ` +
      'Add the country to globalRegionConfig.json before importing this workbook.'
    );
  }

  if (!hasCountryCapitalCoordinate(country)) {
    throw new Error(
      `Local capital-coordinate configuration is missing for recognized country ${country}. ` +
      'Add its capital and coordinates to globalRegionConfig.json before importing this workbook.'
    );
  }

  const statusMeta = buildQualificationStatus(expiryRaw);
  const employeeId = pickFirstMeaningfulValue(row, columnIndexMap, ['employeeId']);
  const personName = pickFirstMeaningfulValue(row, columnIndexMap, ['personName']);
  const partnerName = pickFirstMeaningfulValue(row, columnIndexMap, ['partnerName']);
  const dimensionAudit = auditInternationalQualificationDimensions({
    productLine,
    subProductLine,
    modelCategory,
    qualificationType
  });
  const retainedDirtyRow = dimensionAudit.issues.length
    ? createRetainedDimensionDirtyRow(dirtyContext, dimensionAudit)
    : null;

  return {
    record: {
      id: `${fileName}-${sheetName}-${rowNumber}`,
      employeeId,
      personName: personName || partnerName || 'Unnamed Engineer',
      accountStatus,
      partnerCode: pickFirstMeaningfulValue(row, columnIndexMap, ['partnerCode']),
      partnerName,
      rawBranch,
      rawRegion,
      departmentName,
      trainingCenter: pickFirstMeaningfulValue(row, columnIndexMap, ['trainingCenter']),
      secondaryRegion,
      country,
      productLine: productLine || 'Unclassified Product Line',
      subProductLine: subProductLine || 'Unclassified Sub-line',
      modelCategory: modelCategory || 'Unclassified Model Category',
      modelSubCategory: pickFirstMeaningfulValue(row, columnIndexMap, ['modelSubCategory']),
      qualificationType: qualificationType || 'Unclassified Qualification Type',
      qualificationTypeCode: pickFirstMeaningfulValue(row, columnIndexMap, ['qualificationTypeCode']),
      startDate: formatDateText(readCellValue(row, columnIndexMap.startDate)),
      expiryDate: statusMeta.expiryDateText || formatDateText(expiryRaw),
      qualificationStatus: statusMeta.status,
      daysUntilExpiry: statusMeta.daysUntilExpiry,
      isCurrentlyValid: statusMeta.isCurrentlyValid,
      certificateType: pickFirstMeaningfulValue(row, columnIndexMap, ['certificateType']),
      certificateStatus: pickFirstMeaningfulValue(row, columnIndexMap, ['certificateStatus']),
      sourceFile: fileName,
      sourceSheet: sheetName,
      sourceRow: rowNumber,
      invalidFilterFields: dimensionAudit.invalidFilterFields,
      dataQualityIssues: dimensionAudit.issues
    },
    dirtyRow: retainedDirtyRow
  };
}

function createDirtyResult(context, reason) {
  return {
    dirtyRow: {
      category: 'International qualification excluded row',
      handling: 'Excluded',
      affectedFields: ['record'],
      reason,
      sourceFile: context.fileName,
      sourceSheet: context.sheetName,
      sourceRow: context.rowNumber,
      rawRegion: context.rawRegion || '',
      rawBranch: context.rawBranch || '',
      departmentName: context.departmentName || '',
      rawData: context.rawData || {}
    }
  };
}

function createRetainedDimensionDirtyRow(context, dimensionAudit) {
  return {
    category: 'International qualification retained dimension issue',
    handling: 'Retained; affected dimensions hidden from filters and distributions',
    affectedFields: dimensionAudit.invalidFilterFields,
    reason: formatInternationalDimensionIssues(dimensionAudit.issues),
    sourceFile: context.fileName,
    sourceSheet: context.sheetName,
    sourceRow: context.rowNumber,
    rawRegion: context.rawRegion || '',
    rawBranch: context.rawBranch || '',
    departmentName: context.departmentName || '',
    rawData: context.rawData || {}
  };
}

function buildColumnIndexMap(headerRow) {
  const normalizedHeaders = headerRow.map(normalizeHeaderText);
  const columnIndexMap = {};
  Object.entries(NORMALIZED_ALIAS_LOOKUP).forEach(([field, aliases]) => {
    const index = normalizedHeaders.findIndex((header) => aliases.includes(header));
    if (index >= 0) {
      columnIndexMap[field] = index;
    }
  });
  return columnIndexMap;
}

function findHeaderRowIndex(worksheet, range) {
  const maxProbeRow = Math.min(range.e.r, range.s.r + 10);
  for (let rowIndex = range.s.r; rowIndex <= maxProbeRow; rowIndex += 1) {
    const headerRow = getRowValues(worksheet, rowIndex, range);
    const columnIndexMap = buildColumnIndexMap(headerRow);
    const matchedCount = REQUIRED_FIELDS.filter((field) => columnIndexMap[field] !== undefined).length;
    if (matchedCount >= 8) return rowIndex;
  }
  return -1;
}

function getWorksheetRange(worksheet) {
  if (!worksheet?.['!ref']) return null;
  return XLSX.utils.decode_range(worksheet['!ref']);
}

function getRowValues(worksheet, rowIndex, range) {
  const values = [];
  for (let columnIndex = range.s.c; columnIndex <= range.e.c; columnIndex += 1) {
    values.push(getCellValue(worksheet, rowIndex, columnIndex));
  }
  return values;
}

function getSparseRowValues(worksheet, rowIndex, columnIndexes) {
  const row = {};
  columnIndexes.forEach((columnIndex) => {
    row[columnIndex] = getCellValue(worksheet, rowIndex, columnIndex);
  });
  return row;
}

function getSparseRowValuesFromFullRow(fullRow, columnIndexes, startColumnIndex) {
  const row = {};
  columnIndexes.forEach((columnIndex) => {
    row[columnIndex] = fullRow[columnIndex - startColumnIndex] ?? '';
  });
  return row;
}

function getCellValue(worksheet, rowIndex, columnIndex) {
  const cell = Array.isArray(worksheet)
    ? worksheet[rowIndex]?.[columnIndex]
    : worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })];
  if (!cell) return '';
  return cell.w ?? cell.v ?? '';
}

function getDataColumnIndexes(columnIndexMap) {
  return [...new Set(Object.values(columnIndexMap).filter((index) => Number.isInteger(index)))];
}

function buildRawData(headerRow, row) {
  return headerRow.reduce((accumulator, header, headerOffset) => {
    const label = normalizeText(header) || `Column ${headerOffset + 1}`;
    accumulator[label] = row[headerOffset] ?? '';
    return accumulator;
  }, {});
}

function readCellValue(row, columnIndex) {
  if (columnIndex === undefined || columnIndex === null) return '';
  return row[columnIndex] ?? '';
}

function pickFirstMeaningfulValue(row, columnIndexMap, fields) {
  for (const field of fields) {
    const value = readCellValue(row, columnIndexMap[field]);
    const text = normalizeText(value);
    if (text) return text;
  }
  return '';
}

function isBlankRow(row) {
  return !Object.values(row).some((value) => normalizeText(value));
}

function normalizeHeaderText(value) {
  return normalizeText(value).replace(/\s+/g, '').toLowerCase();
}

function normalizeText(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function scaleProgress(value, min, max) {
  const normalized = Math.max(0, Math.min(1, value || 0));
  return Math.round(min + (max - min) * normalized);
}

function yieldToBrowser() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => resolve(), { timeout: 32 });
      return;
    }
    setTimeout(resolve, 0);
  });
}
