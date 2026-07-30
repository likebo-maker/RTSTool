import { applyPointOffsets } from '../services/geoCacheService';
import {
  filterTrainingRecordsByTime,
  resolveTrainingTimeBounds
} from './trainingTime';
import { buildTrainingDeliveryRegionStats } from './trainingDeliverySummary';
import {
  matchesInternationalDeliveryRegion,
  visibleInternationalDeliveryRegions
} from './internationalTrainingDeliveryScope';

export const DEFAULT_INTERNATIONAL_TRAINING_DELIVERY_FILTERS = {
  startDate: '',
  endDate: '',
  secondaryRegions: [],
  countries: [],
  productLines: [],
  courses: []
};

export const INTERNATIONAL_TRAINING_DELIVERY_FILTER_FIELDS = [
  { key: 'secondaryRegions', recordField: 'secondaryRegion' },
  { key: 'countries', recordField: 'country' },
  { key: 'productLines', recordField: 'productLine' },
  { key: 'courses', recordField: 'courseName' }
];

export function collectInternationalTrainingDeliveryOptions(records) {
  return {
    dateBounds: resolveTrainingTimeBounds(records),
    ...Object.fromEntries(INTERNATIONAL_TRAINING_DELIVERY_FILTER_FIELDS.map(({ key, recordField }) => {
      const values = uniqueValues((records || []).map((record) => record[recordField]));
      return [
        key,
        sortTextValues(key === 'secondaryRegions'
          ? visibleInternationalDeliveryRegions(values)
          : values)
      ];
    }))
  };
}

export function buildInternationalTrainingDeliveryDynamicOptions(records, filters, fallbackOptions = null) {
  const allOptions = fallbackOptions || collectInternationalTrainingDeliveryOptions(records);
  const selectedSets = Object.fromEntries(INTERNATIONAL_TRAINING_DELIVERY_FILTER_FIELDS.map(({ key }) => [key, buildEffectiveSelection(filters?.[key] || [], allOptions[key] || [])]));
  const buckets = Object.fromEntries(INTERNATIONAL_TRAINING_DELIVERY_FILTER_FIELDS.map(({ key }) => [key, new Set()]));
  const dateScopedRecords = filterTrainingRecordsByTime(records, filters);
  dateScopedRecords.forEach((record) => {
    INTERNATIONAL_TRAINING_DELIVERY_FILTER_FIELDS.forEach((targetField) => {
      const matchesOtherFilters = INTERNATIONAL_TRAINING_DELIVERY_FILTER_FIELDS.every((field) => field.key === targetField.key || !selectedSets[field.key].size || selectedSets[field.key].has(record[field.recordField]));
      if (matchesOtherFilters && record[targetField.recordField]) buckets[targetField.key].add(record[targetField.recordField]);
    });
  });
  return Object.fromEntries(INTERNATIONAL_TRAINING_DELIVERY_FILTER_FIELDS.map(({ key }) => [key, (allOptions[key] || []).filter((value) => buckets[key].has(value))]));
}

export function applyInternationalTrainingDeliveryFilters(records, filters = DEFAULT_INTERNATIONAL_TRAINING_DELIVERY_FILTERS) {
  const baseOptions = collectInternationalTrainingDeliveryOptions(records);
  return filterTrainingRecordsByTime(records, filters).filter((record) => INTERNATIONAL_TRAINING_DELIVERY_FILTER_FIELDS.every(({ key, recordField }) => {
    const selected = filters?.[key];
    if (key === 'secondaryRegions') {
      return matchesInternationalDeliveryRegion(
        record[recordField],
        selected,
        baseOptions.secondaryRegions
      );
    }
    return Array.isArray(selected) && selected.length > 0 && selected.includes(record[recordField]);
  }));
}

export function buildInternationalTrainingDeliveryDashboard(records, filters = DEFAULT_INTERNATIONAL_TRAINING_DELIVERY_FILTERS) {
  const filteredRecords = applyInternationalTrainingDeliveryFilters(records, filters);
  // pointKey is the normalized Training Location / center name. It deliberately
  // does not include the report's Training Organizer, which can vary for one center.
  const pointStats = Object.entries(groupBy(filteredRecords, 'pointKey')).map(([pointKey, pointRecords]) => buildPointStat(pointKey, pointRecords)).filter(Boolean);
  const effectiveRecords = filteredRecords.filter((record) => record.isEffectiveResult);
  const passCount = effectiveRecords.filter((record) => record.isPass).length;
  return {
    filteredRecords,
    summary: {
      traineeCount: countTrainees(filteredRecords),
      recordCount: filteredRecords.length,
      sessionCount: uniqueValues(filteredRecords.map((record) => record.sessionKey)).length,
      passRate: formatRate(passCount, effectiveRecords.length),
      passRateValue: effectiveRecords.length ? (passCount / effectiveRecords.length) * 100 : null,
      failCount: filteredRecords.filter((record) => record.isFail).length
    },
    pointStats,
    mapPoints: applyPointOffsets(pointStats.filter((item) => Array.isArray(item.coords) && item.coords.length >= 2)),
    topPoints: [...pointStats].sort(compareTrainingCount),
    failRatePoints: [...pointStats].filter((item) => item.hasEffectiveResult).sort(compareFailRate),
    failCountPoints: [...pointStats].sort(compareFailCount),
    productLineDistribution: aggregateRecords(filteredRecords, 'productLine'),
    courseDistribution: aggregateRecords(filteredRecords, 'courseName'),
    countryDistribution: aggregatePointStats(pointStats, 'country'),
    regionStats: buildTrainingDeliveryRegionStats(filteredRecords, {
      regionField: 'secondaryRegion',
      resolveTraineeKey
    }),
    trendSeries: buildTrendSeries(filteredRecords)
  };
}

export function buildInternationalTrainingDeliveryPointDetail(pointKey, records) {
  const pointRecords = (records || []).filter((record) => record.pointKey === pointKey);
  const pointStat = buildPointStat(pointKey, pointRecords);
  return {
    pointStat,
    pointRecords,
    productLineDistribution: aggregateRecords(pointRecords, 'productLine'),
    courseDistribution: aggregateRecords(pointRecords, 'courseName'),
    trendSeries: buildTrendSeries(pointRecords),
    detailRows: buildDetailRows(pointRecords)
  };
}

export function createAllInternationalTrainingDeliveryFilters(options) {
  return {
    startDate: options?.dateBounds?.minimum || '',
    endDate: options?.dateBounds?.maximum || '',
    ...Object.fromEntries(INTERNATIONAL_TRAINING_DELIVERY_FILTER_FIELDS.map(({ key }) => [key, [...(options?.[key] || [])]]))
  };
}

export function cloneInternationalTrainingDeliveryFilters(filters) {
  return {
    startDate: filters?.startDate || '',
    endDate: filters?.endDate || '',
    ...Object.fromEntries(INTERNATIONAL_TRAINING_DELIVERY_FILTER_FIELDS.map(({ key }) => [key, [...(filters?.[key] || [])]]))
  };
}

function buildPointStat(pointKey, records) {
  if (!pointKey || !records?.length) return null;
  const first = records[0];
  const effectiveRecords = records.filter((record) => record.isEffectiveResult);
  const passCount = effectiveRecords.filter((record) => record.isPass).length;
  const failCount = records.filter((record) => record.isFail).length;
  const failPersonCount = countTrainees(records.filter((record) => record.isFail));
  return {
    pointKey,
    organizer: first.organizer,
    trainingLocation: first.trainingLocation,
    sourceOrganizers: uniqueValues(records.map((record) => record.sourceOrganizer)),
    matchedConstructionCenter: first.matchedConstructionCenter || '',
    secondaryRegion: first.secondaryRegion,
    country: first.country,
    city: first.city || '',
    capital: first.capital || '',
    displayLocation: first.displayLocation || first.country,
    coords: first.coords,
    geoSource: first.geoSource,
    traineeCount: countTrainees(records),
    recordCount: records.length,
    sessionCount: uniqueValues(records.map((record) => record.sessionKey)).length,
    passRate: formatRate(passCount, effectiveRecords.length),
    passRateValue: effectiveRecords.length ? (passCount / effectiveRecords.length) * 100 : null,
    failRate: formatRate(failCount, effectiveRecords.length),
    failRateValue: effectiveRecords.length ? (failCount / effectiveRecords.length) * 100 : 0,
    failCount,
    failPersonCount,
    hasEffectiveResult: effectiveRecords.length > 0,
    productLines: uniqueValues(records.map((record) => record.productLine)),
    courses: uniqueValues(records.map((record) => record.courseName))
  };
}

function buildDetailRows(records) {
  const record = records?.[0];
  if (!record) return [];
  return [
    ['Training Center', record.organizer],
    ['Source Training Organizer', uniqueValues(records.map((item) => item.sourceOrganizer)).join(', ')],
    ['Matched Construction Center', record.matchedConstructionCenter],
    ['Secondary Region', record.secondaryRegion],
    ['Country', record.country],
    ['Map Location', record.displayLocation],
    ['Location Source', formatLocationSource(record.geoSource)],
    ['Source Training Center', record.sourceTrainingCenter],
    ['Time Zone', record.timeZone],
    ['Remark', record.remark]
  ].filter(([, value]) => String(value ?? '').trim()).map(([label, value]) => ({ label, value: String(value).trim() }));
}

function formatLocationSource(source) {
  return source === 'construction-center' ? 'Construction center coordinate' : 'Local country-capital mapping';
}

function buildTrendSeries(records) {
  const buckets = new Map();
  (records || []).forEach((record) => {
    const label = record.trainingCycle || 'Unscheduled';
    const current = buckets.get(label) || { label, recordCount: 0, traineeKeys: new Set(), passCount: 0, effectiveCount: 0 };
    current.recordCount += 1;
    current.traineeKeys.add(resolveTraineeKey(record));
    if (record.isPass) current.passCount += 1;
    if (record.isEffectiveResult) current.effectiveCount += 1;
    buckets.set(label, current);
  });
  return [...buckets.values()].map((item) => ({ label: item.label, recordCount: item.recordCount, traineeCount: [...item.traineeKeys].filter(Boolean).length, passRateValue: item.effectiveCount ? Number(((item.passCount / item.effectiveCount) * 100).toFixed(1)) : null })).sort((left, right) => left.label.localeCompare(right.label, 'en'));
}

function aggregateRecords(records, field) {
  const counter = new Map();
  (records || []).forEach((record) => {
    const value = record[field];
    if (value) counter.set(value, (counter.get(value) || 0) + 1);
  });
  return sortSeries(counter);
}

function aggregatePointStats(points, field) {
  const counter = new Map();
  (points || []).forEach((point) => {
    const value = point[field];
    if (value) counter.set(value, (counter.get(value) || 0) + 1);
  });
  return sortSeries(counter);
}

function sortSeries(counter) {
  return [...counter.entries()].map(([name, value]) => ({ name, value })).sort((left, right) => right.value - left.value || left.name.localeCompare(right.name, 'en'));
}

function compareTrainingCount(left, right) {
  return right.recordCount - left.recordCount || right.traineeCount - left.traineeCount || left.organizer.localeCompare(right.organizer, 'en');
}

function compareFailRate(left, right) {
  return right.failRateValue - left.failRateValue || right.failCount - left.failCount || compareTrainingCount(left, right);
}

function compareFailCount(left, right) {
  return right.failPersonCount - left.failPersonCount || right.failCount - left.failCount || compareFailRate(left, right);
}

function groupBy(records, field) {
  return (records || []).reduce((groups, record) => {
    const key = record?.[field] || 'Unclassified';
    if (!groups[key]) groups[key] = [];
    groups[key].push(record);
    return groups;
  }, {});
}

function countTrainees(records) {
  const keys = (records || []).map(resolveTraineeKey).filter(Boolean);
  return keys.length ? new Set(keys).size : 0;
}

function resolveTraineeKey(record) {
  return record?.learnerAccount || record?.learnerName || '';
}

function uniqueValues(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function sortTextValues(values) {
  return [...new Set(values || [])].sort((left, right) => left.localeCompare(right, 'en'));
}

function buildEffectiveSelection(selectedValues, baseValues) {
  const base = (baseValues || []).filter(Boolean);
  const selected = new Set((selectedValues || []).filter((value) => base.includes(value)));
  return base.length > 0 && base.every((value) => selected.has(value)) ? new Set() : selected;
}

function formatRate(numerator, denominator) {
  if (!denominator) return '-';
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}
