export const TRAINING_END_TIME_FIELDS = ['培训结束时间', '培训结束日期'];

/**
 * Normalizes the delivery report's training end time to YYYY-MM-DD without
 * applying a timezone shift. Business users call this filter simply "Time".
 * Supported inputs include Date objects, Excel serial dates, YYYYMMDD values,
 * and common Chinese or slash-separated date strings.
 */
export function normalizeTrainingTime(value) {
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

/**
 * Rehydrates both newly imported records and previously cached records.
 * New data uses trainingTime. The legacy settlementDate field is last so an
 * actual training end date always wins when both values are present.
 */
export function normalizeTrainingTimeRecord(record = {}) {
  const sourceValue = firstMaintainedValue([
    record.trainingTime,
    record.endTime,
    record.endDate,
    record.rawData?.[TRAINING_END_TIME_FIELDS[0]],
    record.rawData?.[TRAINING_END_TIME_FIELDS[1]],
    record.settlementDate
  ]);
  return {
    ...record,
    trainingTime: normalizeTrainingTime(sourceValue)
  };
}

export function normalizeTrainingTimeRecords(records = []) {
  return (records || []).map(normalizeTrainingTimeRecord);
}

export function resolveTrainingTimeBounds(records = []) {
  const dates = (records || [])
    .map((record) => normalizeTrainingTimeRecord(record).trainingTime)
    .filter(Boolean)
    .sort();
  return {
    minimum: dates[0] || '',
    maximum: dates.at(-1) || ''
  };
}

export function createTrainingTimeRange(bounds = {}) {
  return {
    startDate: bounds.minimum || '',
    endDate: bounds.maximum || ''
  };
}

export function isTrainingTimeInRange(record, filters = {}) {
  const startDate = normalizeTrainingTime(filters.startDate);
  const endDate = normalizeTrainingTime(filters.endDate);
  if (!startDate && !endDate) return true;

  const trainingTime = normalizeTrainingTimeRecord(record).trainingTime;
  if (!trainingTime) return false;
  if (startDate && trainingTime < startDate) return false;
  if (endDate && trainingTime > endDate) return false;
  return true;
}

export function filterTrainingRecordsByTime(records = [], filters = {}) {
  return (records || []).filter((record) => isTrainingTimeInRange(record, filters));
}

export function validateTrainingTimeRange(filters = {}) {
  const startDate = normalizeTrainingTime(filters.startDate);
  const endDate = normalizeTrainingTime(filters.endDate);
  if (!startDate || !endDate) return { valid: false, reason: 'missing' };
  if (startDate > endDate) return { valid: false, reason: 'reversed' };
  return { valid: true, startDate, endDate };
}

function firstMaintainedValue(values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim()) ?? '';
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
