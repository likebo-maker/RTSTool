export const INTERNATIONAL_TRAINING_CONSTRUCTION_PRODUCT_LINES = Object.freeze([
  'IVD',
  'IVD-A',
  'MIS',
  'PMLS'
]);

const VALID_PRODUCT_LINE_SET = new Set(INTERNATIONAL_TRAINING_CONSTRUCTION_PRODUCT_LINES);

/**
 * Product Line is a controlled filter dimension. Invalid values do not remove
 * a center from the map or center totals; they are hidden only from Product
 * Line filters and distributions and are exported for source-data correction.
 */
export function isValidInternationalTrainingConstructionProductLine(value) {
  return VALID_PRODUCT_LINE_SET.has(normalizeProductLineKey(value));
}

export function canonicalizeInternationalTrainingConstructionProductLine(value) {
  const key = normalizeProductLineKey(value);
  return VALID_PRODUCT_LINE_SET.has(key) ? key : String(value || '').trim();
}

export function withInternationalTrainingConstructionDataQuality(record) {
  const productLine = canonicalizeInternationalTrainingConstructionProductLine(record?.productLine);
  const invalidFilterFields = new Set(record?.invalidFilterFields || []);
  const dataQualityIssues = Array.isArray(record?.dataQualityIssues) ? [...record.dataQualityIssues] : [];

  if (!isValidInternationalTrainingConstructionProductLine(productLine)) {
    invalidFilterFields.add('productLine');
    if (!dataQualityIssues.some((issue) => issue?.field === 'productLine')) {
      dataQualityIssues.push({
        field: 'productLine',
        reason: buildInvalidProductLineReason(productLine)
      });
    }
  }

  return {
    ...record,
    productLine,
    invalidFilterFields: [...invalidFilterFields],
    dataQualityIssues
  };
}

export function hasInvalidInternationalTrainingConstructionField(record, recordField) {
  return Array.isArray(record?.invalidFilterFields) && record.invalidFilterFields.includes(recordField);
}

/**
 * Rebuild retained dirty rows from normalized records so datasets imported by
 * an older application version immediately receive the current quality rules.
 */
export function buildRetainedInternationalTrainingConstructionDirtyRows(records) {
  const rowsBySource = new Map();

  (records || []).forEach((record) => {
    if (!hasInvalidInternationalTrainingConstructionField(record, 'productLine')) return;
    const key = buildSourceRowKey(record);
    if (rowsBySource.has(key)) return;
    const issue = (record.dataQualityIssues || []).find((item) => item?.field === 'productLine');
    const rawProductLine = Object.prototype.hasOwnProperty.call(record.rawData || {}, '认证产线')
      ? record.rawData['认证产线']
      : record.productLine;
    rowsBySource.set(key, {
      category: 'International training center retained row',
      handling: 'Retained; invalid Product Line is hidden from filters and distributions.',
      affectedFields: ['Product Line'],
      reason: rawProductLine === ''
        ? buildInvalidProductLineReason('')
        : issue?.reason || buildInvalidProductLineReason(record.productLine),
      sourceFile: record.sourceFile || '',
      sourceSheet: record.sourceSheet || '',
      sourceRow: record.sourceRow || '',
      centerName: record.centerName || '',
      rawData: record.rawData || {}
    });
  });

  return [...rowsBySource.values()];
}

export function mergeInternationalTrainingConstructionDirtyRows(existingRows, generatedRows) {
  const merged = [];
  const keys = new Set();

  [...(existingRows || []), ...(generatedRows || [])].forEach((row) => {
    const fields = Array.isArray(row?.affectedFields) ? row.affectedFields.join('|') : String(row?.affectedFields || '');
    const key = `${buildSourceRowKey(row)}|${fields || row?.reason || ''}`;
    if (keys.has(key)) return;
    keys.add(key);
    merged.push(row);
  });

  return merged;
}

export function buildInvalidProductLineReason(value) {
  const displayValue = String(value || '').trim() || '(blank)';
  return `Product Line is not one of IVD, IVD-A, MIS, or PMLS: ${displayValue}`;
}

function normalizeProductLineKey(value) {
  return String(value || '').trim().toUpperCase();
}

function buildSourceRowKey(record) {
  return [
    record?.sourceFile || '',
    record?.sourceSheet || '',
    record?.sourceRow || '',
    record?.centerName || ''
  ].join('|');
}
