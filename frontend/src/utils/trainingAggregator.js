import { formatPassRate } from './trainingStatusNormalizer';
import { resolveTrainingCenterGeo } from './trainingCenterMap';

export const DEFAULT_TRAINING_FILTERS = {
  branches: [],
  regions: [],
  productLines: [],
  cycles: [],
  result: '全部',
  trainingCenters: [],
  trainingTypes: []
};

export function collectTrainingOptions(records) {
  return {
    branches: sortTextValues(uniqueValues(records.map((record) => record.branch))),
    regions: sortTextValues(uniqueValues(records.map((record) => record.mappedRegion))),
    productLines: sortTextValues(uniqueValues(records.map((record) => record.productLine))),
    cycles: sortTextValues(uniqueValues(records.map((record) => record.trainingCycle))),
    results: ['全部', '合格', '不合格'],
    trainingCenters: sortTextValues(uniqueValues(records.map((record) => record.trainingCenter))),
    trainingTypes: sortTextValues(uniqueValues(records.map((record) => record.trainingType)))
  };
}

export function applyTrainingFilters(records, filters = DEFAULT_TRAINING_FILTERS) {
  return records.filter((record) => {
    if (filters.regions?.length && !filters.regions.includes(record.mappedRegion)) return false;
    if (filters.branches?.length && !filters.branches.includes(record.branch)) return false;
    if (filters.productLines?.length && !filters.productLines.includes(record.productLine)) return false;
    if (filters.cycles?.length && !filters.cycles.includes(record.trainingCycle)) return false;
    if (filters.result !== '全部' && record.trainingResult !== filters.result) return false;
    if (filters.trainingCenters?.length && !filters.trainingCenters.includes(record.trainingCenter)) return false;
    if (filters.trainingTypes?.length && !filters.trainingTypes.includes(record.trainingType)) return false;
    return true;
  });
}

export function buildTrainingDashboard(records, filters = DEFAULT_TRAINING_FILTERS) {
  const filteredRecords = applyTrainingFilters(records, filters);
  const branchMap = groupBy(filteredRecords, 'branch');
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
    mapPoints: centerStats
      .map((item) => {
        const geo = resolveTrainingCenterGeo(item.trainingCenter, item.trainingCenterCity);
        if (!geo) return null;
        return { ...item, branch: item.trainingCenter, city: geo.city, coords: geo.coords };
      })
      .filter(Boolean),
    topBranches: [...branchStats]
      .sort((left, right) => right.recordCount - left.recordCount || right.traineeCount - left.traineeCount)
      .slice(0, 10),
    riskBranches: [...branchStats]
      .sort((left, right) => right.failCount - left.failCount || left.passRateValue - right.passRateValue)
      .slice(0, 10),
    productLineDistribution: aggregateSeries(filteredRecords, 'productLine', 8),
    trainingTypeDistribution: aggregateSeries(filteredRecords, 'trainingType', 8),
    trendSeries: buildTrainingTrendSeries(filteredRecords),
    previewRows: filteredRecords.slice(0, 500)
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
    trainingTypeDistribution: aggregateSeries(branchRecords, 'trainingType', 8),
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
  const effectiveCount = records.filter((record) => record.isEffectiveResult).length;
  const passCount = records.filter((record) => record.isPass).length;
  const passRateValue = effectiveCount ? (passCount / effectiveCount) * 100 : null;
  return {
    branch,
    mappedRegion: records[0]?.mappedRegion || '未匹配大区',
    traineeCount,
    recordCount,
    sessionCount: countTrainingSessions(records),
    passRate: formatPassRate(passCount, effectiveCount),
    passRateValue,
    failCount,
    primaryProductLines: aggregateSeries(records, 'productLine', 3).map((item) => item.name).join('、') || '暂无',
    primaryTrainingTypes: aggregateSeries(records, 'trainingType', 3).map((item) => item.name).join('、') || '暂无',
    hasEffectiveResult: effectiveCount > 0
  };
}

function buildTrainingCenterStat(trainingCenter, records) {
  if (!trainingCenter || !records.length || trainingCenter === '未知培训中心') return null;
  const traineeCount = countTrainees(records);
  const recordCount = records.length;
  const failCount = records.filter((record) => record.isFail).length;
  const effectiveCount = records.filter((record) => record.isEffectiveResult).length;
  const passCount = records.filter((record) => record.isPass).length;
  const passRateValue = effectiveCount ? (passCount / effectiveCount) * 100 : null;
  return {
    branch: trainingCenter,
    trainingCenter,
    trainingCenterCity: records[0]?.trainingCenterCity || '',
    mappedRegion: records[0]?.mappedRegion || '未匹配大区',
    traineeCount,
    recordCount,
    sessionCount: countTrainingSessions(records),
    passRate: formatPassRate(passCount, effectiveCount),
    passRateValue,
    failCount,
    primaryProductLines: aggregateSeries(records, 'productLine', 3).map((item) => item.name).join('、') || '暂无',
    primaryTrainingTypes: aggregateSeries(records, 'trainingType', 3).map((item) => item.name).join('、') || '暂无',
    hasEffectiveResult: effectiveCount > 0
  };
}

export function resolveTrainingPointTone(point, mode) {
  if (mode === 'training-count') {
    if (point.traineeCount >= 120) return 'good';
    if (point.traineeCount >= 60) return 'warning';
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
  return record.studentName ? `${record.studentName}|${record.branch}|${record.studentOrg}` : '__unknown__';
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function sortTextValues(values) {
  return [...values].sort((left, right) => left.localeCompare(right, 'zh-CN'));
}
