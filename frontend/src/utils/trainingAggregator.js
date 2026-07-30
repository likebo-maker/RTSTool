import { formatPassRate } from './trainingStatusNormalizer';
import { resolveTrainingCenterGeo } from './trainingCenterMap';
import { applyPointOffsets, geoInfoToPoint, resolveGeoFromMap } from '../services/geoCacheService';
import {
  filterTrainingRecordsByTime,
  resolveTrainingTimeBounds
} from './trainingTime';
import { buildTrainingDeliveryRegionStats } from './trainingDeliverySummary';

export const DEFAULT_TRAINING_FILTERS = {
  startDate: '',
  endDate: '',
  regions: [],
  productLines: [],
  trainingCenters: [],
  courses: []
};

export const TRAINING_DELIVERY_FILTER_FIELDS = {
  regions: 'mappedRegion',
  productLines: 'productLine',
  trainingCenters: 'trainingCenter',
  courses: 'courseName'
};

export const TRAINING_DELIVERY_FILTER_KEYS = Object.keys(TRAINING_DELIVERY_FILTER_FIELDS);

export function collectTrainingOptions(records) {
  return {
    dateBounds: resolveTrainingTimeBounds(records),
    regions: sortTextValues(uniqueValues(records.map((record) => record.mappedRegion)).filter((value) => value !== '未匹配大区')),
    productLines: sortTextValues(uniqueValues(records.map((record) => record.productLine))),
    trainingCenters: sortTextValues(uniqueValues(records.map((record) => record.trainingCenter))),
    courses: sortTextValues(uniqueValues(records.map((record) => record.courseName)))
  };
}

export function applyTrainingFilters(records, filters = DEFAULT_TRAINING_FILTERS) {
  return filterTrainingRecordsByTime(records, filters).filter((record) => {
    if (!matchesMultiSelect(record.mappedRegion, filters.regions)) return false;
    if (!matchesMultiSelect(record.productLine, filters.productLines)) return false;
    if (!matchesMultiSelect(record.trainingCenter, filters.trainingCenters)) return false;
    if (!matchesMultiSelect(record.courseName, filters.courses)) return false;
    return true;
  });
}

export function buildTrainingDynamicOptions(records, filters, baseOptions) {
  const selectedSets = buildSelectedFilterSets(filters, baseOptions);
  const buckets = Object.fromEntries(TRAINING_DELIVERY_FILTER_KEYS.map((key) => [key, new Set()]));
  const dateScopedRecords = filterTrainingRecordsByTime(records, filters);

  dateScopedRecords.forEach((record) => {
    TRAINING_DELIVERY_FILTER_KEYS.forEach((targetKey, targetIndex) => {
      for (const key of TRAINING_DELIVERY_FILTER_KEYS.slice(0, targetIndex)) {
        const selectedSet = selectedSets[key];
        if (!selectedSet?.size) continue;
        if (!selectedSet.has(getRecordFilterValue(record, key))) {
          return;
        }
      }
      const value = getRecordFilterValue(record, targetKey);
      if (value && value !== '未匹配大区') buckets[targetKey].add(value);
    });
  });

  return Object.fromEntries(
    TRAINING_DELIVERY_FILTER_KEYS.map((key) => [key, sortTextValues([...buckets[key]])])
  );
}

export function createAllTrainingFilters(options) {
  return {
    startDate: options?.dateBounds?.minimum || '',
    endDate: options?.dateBounds?.maximum || '',
    regions: [...(options.regions || [])],
    productLines: [...(options.productLines || [])],
    trainingCenters: [...(options.trainingCenters || [])],
    courses: [...(options.courses || [])]
  };
}

export function cloneTrainingFilters(filters) {
  return {
    startDate: filters?.startDate || '',
    endDate: filters?.endDate || '',
    regions: [...(filters.regions || [])],
    productLines: [...(filters.productLines || [])],
    trainingCenters: [...(filters.trainingCenters || [])],
    courses: [...(filters.courses || [])]
  };
}

function matchesMultiSelect(value, selectedValues) {
  if (!Array.isArray(selectedValues)) return true;
  if (!selectedValues.length) return false;
  return selectedValues.includes(value);
}

export function buildTrainingDashboard(records, filters = DEFAULT_TRAINING_FILTERS, geoMap = {}) {
  const filteredRecords = applyTrainingFilters(records, filters);
  const branchMap = groupBy(filteredRecords, 'trainingCenter');
  const centerMap = groupBy(filteredRecords, 'trainingCenter');
  const branchStats = Object.entries(branchMap)
    .map(([branch, branchRecords]) => buildTrainingBranchStat(branch, branchRecords))
    .filter(Boolean);
  const centerStats = Object.entries(centerMap)
    .map(([center, centerRecords]) => buildTrainingCenterStat(center, centerRecords))
    .filter(Boolean);

  const passCount = filteredRecords.filter((record) => record.isPass).length;
  const effectiveCount = filteredRecords.filter((record) => record.isEffectiveResult).length;

  return {
    filteredRecords,
    summary: {
      traineeCount: countTrainees(filteredRecords),
      recordCount: filteredRecords.length,
      sessionCount: countTrainingSessions(filteredRecords),
      passRate: formatPassRate(passCount, effectiveCount),
      failCount: filteredRecords.filter((record) => record.isFail).length
    },
    mapPoints: applyPointOffsets(centerStats.map((item) => buildTrainingMapPoint(item, geoMap))),
    topBranches: [...branchStats]
      .sort((left, right) => right.recordCount - left.recordCount || right.traineeCount - left.traineeCount),
    riskBranches: [...branchStats]
      .sort((left, right) => right.failCount - left.failCount || left.passRateValue - right.passRateValue),
    failRateBranches: [...branchStats]
      .filter((item) => item.hasEffectiveResult)
      .sort((left, right) => right.failRateValue - left.failRateValue || right.failCount - left.failCount),
    failCountBranches: [...branchStats]
      .sort((left, right) => right.failPersonCount - left.failPersonCount || right.failCount - left.failCount || right.failRateValue - left.failRateValue),
    productLineDistribution: aggregateSeries(filteredRecords, 'productLine'),
    courseDistribution: aggregateSeries(filteredRecords, 'courseName'),
    trainingTypeDistribution: aggregateSeries(filteredRecords, 'courseName'),
    regionStats: buildTrainingDeliveryRegionStats(filteredRecords, {
      regionField: 'mappedRegion',
      resolveTraineeKey,
      fallbackToRecordCountWhenEmpty: true
    }),
    trendSeries: buildTrainingTrendSeries(filteredRecords),
    previewRows: filteredRecords.slice(0, 500)
  };
}

function buildTrainingMapPoint(item, geoMap) {
  let geo = null;
  if (Array.isArray(item.coords) && item.coords.length >= 2) {
    geo = {
      city: item.city || item.trainingCenterCity || '',
      coords: [...item.coords],
      geoSource: item.geoSource || 'construction'
    };
  } else {
    const cachedGeo = resolveGeoFromMap(geoMap, item.geoLocationName || item.trainingCenter);
    const fallbackGeo = resolveTrainingCenterGeo(item.trainingCenter, item.trainingCenterCity);
    geo = cachedGeo
      ? geoInfoToPoint(cachedGeo)
      : fallbackGeo
        ? { city: fallbackGeo.city, coords: fallbackGeo.coords, geoSource: 'local' }
        : geoInfoToPoint(null);
  }

  return {
    ...item,
    branch: item.trainingCenter,
    city: geo.city,
    coords: geo.coords,
    geoSource: geo.geoSource
  };
}

export function buildTrainingBranchDetail(branch, records, scope = 'branch') {
  let branchRecords = [];
  let branchStat = null;
  if (scope === 'trainingCenter') {
    branchRecords = records.filter((record) => record.trainingCenter === branch);
    branchStat = buildTrainingCenterStat(branch, branchRecords);
  } else {
    branchRecords = records.filter((record) => record.branch === branch);
    branchStat = buildTrainingBranchStat(branch, branchRecords);
    if (!branchRecords.length) {
      branchRecords = records.filter((record) => record.trainingCenter === branch);
      branchStat = buildTrainingCenterStat(branch, branchRecords);
    }
  }
  return {
    branchRecords: branchRecords.slice(0, 300),
    fullBranchRecords: branchRecords,
    branchStat,
    productLineDistribution: aggregateSeries(branchRecords, 'productLine', 8),
    courseDistribution: aggregateSeries(branchRecords, 'courseName', 8),
    trainingTypeDistribution: aggregateSeries(branchRecords, 'courseName', 8),
    trendSeries: buildTrainingTrendSeries(branchRecords),
    recentRecords: [...branchRecords]
      .sort((left, right) => (right.trainingCycle || '').localeCompare(left.trainingCycle || '', 'zh-CN'))
      .slice(0, 12)
  };
}

function buildTrainingBranchStat(branch, records) {
  if (!branch || !records.length) return null;
  const traineeCount = countTrainees(records);
  const recordCount = records.length;
  const failCount = records.filter((record) => record.isFail).length;
  const failPersonCount = countTrainees(records.filter((record) => record.isFail));
  const effectiveCount = records.filter((record) => record.isEffectiveResult).length;
  const passCount = records.filter((record) => record.isPass).length;
  const passRateValue = effectiveCount ? (passCount / effectiveCount) * 100 : null;
  const failRateValue = effectiveCount ? (failCount / effectiveCount) * 100 : 0;
  return {
    branch,
    mappedRegion: records[0]?.mappedRegion || '未匹配大区',
    traineeCount,
    recordCount,
    sessionCount: countTrainingSessions(records),
    passRate: formatPassRate(passCount, effectiveCount),
    passRateValue,
    failRate: formatPassRate(failCount, effectiveCount),
    failRateValue,
    effectiveCount,
    failCount,
    failPersonCount,
    primaryProductLines: aggregateSeries(records, 'productLine', 3).map((item) => item.name).join('、') || '暂无',
    primaryCourses: aggregateSeries(records, 'courseName', 3).map((item) => item.name).join('、') || '暂无',
    primaryTrainingTypes: aggregateSeries(records, 'courseName', 3).map((item) => item.name).join('、') || '暂无',
    hasEffectiveResult: effectiveCount > 0
  };
}

function buildTrainingCenterStat(trainingCenter, records) {
  if (!trainingCenter || !records.length || trainingCenter === '未知培训中心') return null;
  const traineeCount = countTrainees(records);
  const recordCount = records.length;
  const failCount = records.filter((record) => record.isFail).length;
  const failPersonCount = countTrainees(records.filter((record) => record.isFail));
  const effectiveCount = records.filter((record) => record.isEffectiveResult).length;
  const passCount = records.filter((record) => record.isPass).length;
  const passRateValue = effectiveCount ? (passCount / effectiveCount) * 100 : null;
  const failRateValue = effectiveCount ? (failCount / effectiveCount) * 100 : 0;
  return {
    branch: trainingCenter,
    trainingCenter,
    trainingCenterCity: records[0]?.trainingCenterCity || '',
    city: records[0]?.city || records[0]?.trainingCenterCity || '',
    province: records[0]?.province || '',
    centerType: records[0]?.centerType || '',
    coords: records[0]?.coords,
    geoSource: records[0]?.geoSource || 'construction',
    geoLocationName: records[0]?.geoLocationName || trainingCenter,
    mappedRegion: records[0]?.mappedRegion || '未匹配大区',
    traineeCount,
    recordCount,
    sessionCount: countTrainingSessions(records),
    passRate: formatPassRate(passCount, effectiveCount),
    passRateValue,
    failRate: formatPassRate(failCount, effectiveCount),
    failRateValue,
    effectiveCount,
    failCount,
    failPersonCount,
    primaryProductLines: aggregateSeries(records, 'productLine', 3).map((item) => item.name).join('、') || '暂无',
    primaryCourses: aggregateSeries(records, 'courseName', 3).map((item) => item.name).join('、') || '暂无',
    primaryTrainingTypes: aggregateSeries(records, 'courseName', 3).map((item) => item.name).join('、') || '暂无',
    hasEffectiveResult: effectiveCount > 0
  };
}

export function resolveTrainingPointTone(point, mode) {
  if (mode === 'training-count') {
    if (point.recordCount >= 120) return 'good';
    if (point.recordCount >= 60) return 'warning';
    return 'info';
  }
  if (mode === 'session-count') {
    if (point.sessionCount >= 20) return 'good';
    if (point.sessionCount >= 8) return 'warning';
    return 'info';
  }
  if (mode === 'risk') {
    if (point.failCount >= 12) return 'critical';
    if (point.failCount >= 4) return 'warning';
    return point.hasEffectiveResult ? 'good' : 'info';
  }

  if (!point.hasEffectiveResult) return 'info';
  if ((point.passRateValue ?? 0) >= 90) return 'good';
  if ((point.passRateValue ?? 0) >= 70) return 'warning';
  return 'critical';
}

function buildTrainingTrendSeries(records) {
  const cycleMap = new Map();
  records.forEach((record) => {
    const key = record.trainingCycle || '未知';
    const current = cycleMap.get(key) || { label: key, recordCount: 0, traineeKeys: new Set(), passCount: 0, effectiveCount: 0 };
    current.recordCount += 1;
    current.traineeKeys.add(resolveTraineeKey(record));
    if (record.isPass) current.passCount += 1;
    if (record.isEffectiveResult) current.effectiveCount += 1;
    cycleMap.set(key, current);
  });

  return [...cycleMap.values()]
    .map((item) => ({
      label: item.label,
      recordCount: item.recordCount,
      traineeCount: item.traineeKeys.size,
      passRateValue: item.effectiveCount ? Number(((item.passCount / item.effectiveCount) * 100).toFixed(1)) : null
    }))
    .sort((left, right) => left.label.localeCompare(right.label, 'zh-CN'));
}

function aggregateSeries(records, field, limit = Infinity) {
  const counter = new Map();
  records.forEach((record) => {
    const key = record[field] || '未知';
    counter.set(key, (counter.get(key) || 0) + 1);
  });
  return [...counter.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value || left.name.localeCompare(right.name, 'zh-CN'))
    .slice(0, limit);
}

function groupBy(records, field) {
  return records.reduce((accumulator, record) => {
    const key = record[field] || '未归类';
    if (!accumulator[key]) accumulator[key] = [];
    accumulator[key].push(record);
    return accumulator;
  }, {});
}

function countTrainees(records) {
  const names = records.map(resolveTraineeKey).filter((value) => value && value !== '__unknown__');
  return names.length ? new Set(names).size : records.length;
}

function countTrainingSessions(records) {
  return uniqueValues(records.map((record) => record.sessionKey || record.batchId)).length;
}

function resolveTraineeKey(record) {
  if (record.studentAccount) return `${record.studentAccount}|${record.trainingCenter || record.branch}`;
  return record.studentName ? `${record.studentName}|${record.trainingCenter || record.branch}|${record.studentOrg}` : '__unknown__';
}

function buildSelectedFilterSets(filters, baseOptions) {
  return Object.fromEntries(
    TRAINING_DELIVERY_FILTER_KEYS.map((key) => [key, buildEffectiveSelectedSet(filters[key] || [], baseOptions?.[key] || [])])
  );
}

function buildEffectiveSelectedSet(selectedValues, baseValues) {
  const selected = (selectedValues || []).filter(Boolean);
  const base = (baseValues || []).filter(Boolean);
  const baseSet = new Set(base);
  const selectedSet = new Set(selected);
  const allBaseSelected = base.length > 0 && base.every((value) => selectedSet.has(value));
  if (allBaseSelected) return new Set();
  return new Set(selected.filter((value) => baseSet.has(value)));
}

function getRecordFilterValue(record, key) {
  return record?.[TRAINING_DELIVERY_FILTER_FIELDS[key]] || '';
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function sortTextValues(values) {
  return [...values].sort((left, right) => left.localeCompare(right, 'zh-CN'));
}
