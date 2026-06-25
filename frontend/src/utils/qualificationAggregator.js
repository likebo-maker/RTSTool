import { QUALIFICATION_STATUS_OPTIONS } from './qualificationTypes';
import { resolveBranchGeo } from './branchGeoMap';

export const DEFAULT_QUALIFICATION_FILTERS = {
  regions: [],
  branches: [],
  productLines: [],
  machineModels: [],
  qualificationTypes: [],
  status: '全部'
};

export function collectQualificationOptions(records) {
  return {
    regions: sortTextValues(uniqueValues(records.map((record) => record.mappedRegion))),
    branches: sortTextValues(uniqueValues(records.map((record) => record.branch))),
    productLines: sortTextValues(uniqueValues(records.map((record) => record.productLine))),
    machineModels: sortTextValues(uniqueValues(records.map((record) => record.machineModel))),
    qualificationTypes: sortTextValues(uniqueValues(records.map((record) => record.qualificationType))),
    statusOptions: QUALIFICATION_STATUS_OPTIONS
  };
}

export function applyQualificationFilters(records, filters = DEFAULT_QUALIFICATION_FILTERS) {
  return records.filter((record) => {
    if (filters.regions?.length && !filters.regions.includes(record.mappedRegion)) return false;
    if (filters.branches?.length && !filters.branches.includes(record.branch)) return false;
    if (filters.productLines?.length && !filters.productLines.includes(record.productLine)) return false;
    if (filters.machineModels?.length && !filters.machineModels.includes(record.machineModel)) return false;
    if (filters.qualificationTypes?.length && !filters.qualificationTypes.includes(record.qualificationType)) return false;
    if (filters.status && filters.status !== '全部' && record.qualificationStatus !== filters.status) return false;
    return true;
  });
}

export function buildQualificationDashboard(records, filters = DEFAULT_QUALIFICATION_FILTERS) {
  const filteredRecords = applyQualificationFilters(records, filters);
  const branchMap = groupBy(filteredRecords, 'branch');
  const branchStats = Object.entries(branchMap)
    .map(([branch, branchRecords]) => buildBranchStat(branch, branchRecords))
    .filter(Boolean);

  const summary = {
    totalPeople: countUniquePeople(filteredRecords),
    validQualifications: filteredRecords.filter((record) => record.isCurrentlyValid).length,
    expiringSoon: filteredRecords.filter((record) => record.qualificationStatus === '30天内到期').length,
    expiredQualifications: filteredRecords.filter((record) => record.qualificationStatus === '已过期').length,
    coveredBranches: branchStats.length
  };

  return {
    filteredRecords,
    summary,
    branchStats,
    mapPoints: branchStats
      .map((item) => {
        const geo = resolveBranchGeo(item.branch);
        if (!geo) return null;
        return {
          ...item,
          region: item.region || geo.region || '',
          city: geo.city,
          coords: geo.coords
        };
      })
      .filter(Boolean),
    topValidBranches: [...branchStats]
      .sort((left, right) => right.validQualifications - left.validQualifications || right.totalPeople - left.totalPeople)
      .slice(0, 10),
    topRiskBranches: [...branchStats]
      .sort(
        (left, right) =>
          right.expiredQualifications - left.expiredQualifications ||
          right.expiring30 - left.expiring30 ||
          right.expiring60 - left.expiring60
      )
      .slice(0, 10),
    productLineDistribution: aggregateValueSeries(filteredRecords.filter((record) => record.isCurrentlyValid), 'productLine', 10),
    qualificationTypeDistribution: aggregateValueSeries(filteredRecords.filter((record) => record.isCurrentlyValid), 'qualificationType'),
    expiryTrend: [
      { label: '30天内到期', value: filteredRecords.filter((record) => record.qualificationStatus === '30天内到期').length },
      { label: '60天内到期', value: filteredRecords.filter((record) => record.qualificationStatus === '60天内到期').length },
      { label: '90天内到期', value: filteredRecords.filter((record) => record.qualificationStatus === '90天内到期').length },
      { label: '已过期', value: filteredRecords.filter((record) => record.qualificationStatus === '已过期').length }
    ],
    previewRows: filteredRecords.slice(0, 80)
  };
}

export function buildBranchDetail(branch, records) {
  const branchRecords = records.filter((record) => record.branch === branch);
  const branchStat = buildBranchStat(branch, branchRecords);
  return {
    branchRecords,
    branchStat,
    productLineDistribution: aggregateValueSeries(branchRecords.filter((record) => record.isCurrentlyValid), 'productLine'),
    qualificationTypeDistribution: aggregateValueSeries(branchRecords.filter((record) => record.isCurrentlyValid), 'qualificationType'),
    expiryDistribution: [
      { label: '有效', value: branchRecords.filter((record) => record.qualificationStatus === '有效').length },
      { label: '30天内到期', value: branchRecords.filter((record) => record.qualificationStatus === '30天内到期').length },
      { label: '60天内到期', value: branchRecords.filter((record) => record.qualificationStatus === '60天内到期').length },
      { label: '90天内到期', value: branchRecords.filter((record) => record.qualificationStatus === '90天内到期').length },
      { label: '已过期', value: branchRecords.filter((record) => record.qualificationStatus === '已过期').length }
    ]
  };
}

function buildBranchStat(branch, records) {
  if (!branch || !records.length) return null;
  const productLineDistribution = aggregateValueSeries(records.filter((record) => record.isCurrentlyValid), 'productLine', 3);
  const expiredQualifications = records.filter((record) => record.qualificationStatus === '已过期').length;
  const expiring30 = records.filter((record) => record.qualificationStatus === '30天内到期').length;
  const expiring60 = records.filter((record) => record.qualificationStatus === '60天内到期').length;
  const expiring90 = records.filter((record) => record.qualificationStatus === '90天内到期').length;
  const validQualifications = records.filter((record) => record.isCurrentlyValid).length;
  return {
    branch,
    region: records[0]?.mappedRegion || '',
    totalPeople: countUniquePeople(records),
    validQualifications,
    expiring30,
    expiring60,
    expiring90,
    expiredQualifications,
    riskLevel: getRiskLevel({ expiredQualifications, expiring30, expiring60, totalCount: records.length }),
    primaryProductLines: productLineDistribution.map((item) => item.name).join('、') || '暂无',
    productLineDistribution
  };
}

function getRiskLevel({ expiredQualifications, expiring30, expiring60, totalCount }) {
  if (expiredQualifications > 0 || expiring30 >= Math.max(3, Math.ceil(totalCount * 0.08))) {
    return '高风险';
  }
  if (expiring30 > 0 || expiring60 > 0) {
    return '关注';
  }
  return '正常';
}

function aggregateValueSeries(records, field, limit = Infinity) {
  const counter = new Map();
  records.forEach((record) => {
    const key = record[field];
    if (!key) return;
    counter.set(key, (counter.get(key) || 0) + 1);
  });
  return [...counter.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value || left.name.localeCompare(right.name, 'zh-CN'))
    .slice(0, limit);
}

function countUniquePeople(records) {
  const keys = new Set(
    records.map((record) => `${record.personName || '未命名人员'}|${record.branch || ''}|${record.organization || ''}`)
  );
  return keys.size;
}

function groupBy(records, field) {
  return records.reduce((accumulator, record) => {
    const key = record[field] || '未归类';
    if (!accumulator[key]) accumulator[key] = [];
    accumulator[key].push(record);
    return accumulator;
  }, {});
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function sortTextValues(values) {
  return [...values].sort((left, right) => left.localeCompare(right, 'zh-CN'));
}
