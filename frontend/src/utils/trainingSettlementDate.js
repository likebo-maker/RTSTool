export const TRAINING_SETTLEMENT_DATE_FIELD = '培训结算时间';

/**
 * Normalizes Excel date values to YYYY-MM-DD without applying a timezone shift.
 * Supported inputs include Date objects, Excel serial dates, YYYYMMDD values,
 * and common Chinese or slash-separated date strings.
 */
export function normalizeTrainingSettlementDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDateParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value >= 19000101 && value <= 29991231 && Number.isInteger(value)) {
      return normalizeCompactDate(String(value));
    }
    if (value > 0 && value < 100000) {
      const excelEpoch = Date.UTC(1899, 11, 30);
      const excelDate = new Date(excelEpoch + Math.floor(value) * 86400000);
      return formatDateParts(excelDate.getUTCFullYear(), excelDate.getUTCMonth() + 1, excelDate.getUTCDate());
    }
  }

  const text = String(value ?? '').trim();
  if (!text) return '';
  if (/^\d{8}$/.test(text)) return normalizeCompactDate(text);

  const matched = text.match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})(?:日|\s|T|$)/);
  if (matched) return formatDateParts(Number(matched[1]), Number(matched[2]), Number(matched[3]));

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return '';
  return formatDateParts(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
}

export function normalizeTrainingSettlementRecord(record = {}) {
  const sourceValue = record.settlementDate ?? record.rawData?.[TRAINING_SETTLEMENT_DATE_FIELD];
  return {
    ...record,
    settlementDate: normalizeTrainingSettlementDate(sourceValue)
  };
}

export function normalizeTrainingSettlementRecords(records = []) {
  return (records || []).map(normalizeTrainingSettlementRecord);
}

export function resolveTrainingSettlementDateBounds(records = []) {
  const dates = (records || [])
    .map((record) => normalizeTrainingSettlementDate(record?.settlementDate ?? record?.rawData?.[TRAINING_SETTLEMENT_DATE_FIELD]))
    .filter(Boolean)
    .sort();
  return {
    minimum: dates[0] || '',
    maximum: dates.at(-1) || ''
  };
}

export function createTrainingSettlementDateRange(bounds = {}) {
  return {
    startDate: bounds.minimum || '',
    endDate: bounds.maximum || ''
  };
}

export function isTrainingSettlementDateInRange(record, filters = {}) {
  const startDate = normalizeTrainingSettlementDate(filters.startDate);
  const endDate = normalizeTrainingSettlementDate(filters.endDate);
  if (!startDate && !endDate) return true;

  const settlementDate = normalizeTrainingSettlementDate(
    record?.settlementDate ?? record?.rawData?.[TRAINING_SETTLEMENT_DATE_FIELD]
  );
  if (!settlementDate) return false;
  if (startDate && settlementDate < startDate) return false;
  if (endDate && settlementDate > endDate) return false;
  return true;
}

export function filterTrainingRecordsBySettlementDate(records = [], filters = {}) {
  return (records || []).filter((record) => isTrainingSettlementDateInRange(record, filters));
}

export function validateTrainingSettlementDateRange(filters = {}) {
  const startDate = normalizeTrainingSettlementDate(filters.startDate);
  const endDate = normalizeTrainingSettlementDate(filters.endDate);
  if (!startDate || !endDate) return { valid: false, reason: 'missing' };
  if (startDate > endDate) return { valid: false, reason: 'reversed' };
  return { valid: true, startDate, endDate };
}

function normalizeCompactDate(value) {
  return formatDateParts(
    Number(value.slice(0, 4)),
    Number(value.slice(4, 6)),
    Number(value.slice(6, 8))
  );
}

function formatDateParts(year, month, day) {
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year
    || candidate.getUTCMonth() + 1 !== month
    || candidate.getUTCDate() !== day
  ) {
    return '';
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
