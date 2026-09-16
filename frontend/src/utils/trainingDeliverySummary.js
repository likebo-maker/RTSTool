export function countUniqueTrainingTrainees(
  records,
  resolveKey,
  { fallbackToRecordCountWhenEmpty = false } = {}
) {
  const keys = (records || [])
    .map((record) => String(resolveKey?.(record) || '').trim())
    .filter(Boolean);
  if (keys.length) return new Set(keys).size;
  return fallbackToRecordCountWhenEmpty ? (records || []).length : 0;
}

export function buildTrainingDeliveryRegionStats(
  records,
  {
    regionField,
    resolveTraineeKey,
    fallbackToRecordCountWhenEmpty = false
  }
) {
  const groups = new Map();
  (records || []).forEach((record) => {
    const name = String(record?.[regionField] || '').trim();
    if (!name) return;
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(record);
  });

  return [...groups.entries()].map(([name, regionRecords]) => ({
    name,
    recordCount: regionRecords.length,
    traineeCount: countUniqueTrainingTrainees(regionRecords, resolveTraineeKey, {
      fallbackToRecordCountWhenEmpty
    })
  }));
}

export function buildTrainingDeliverySourceLegendItem(name, color, records, identityFields) {
  const keys = new Set();
  let unknownCount = 0;
  (records || []).forEach((record) => {
    const parts = (identityFields || []).map((field) => normalizeIdentity(record?.[field]));
    if (parts.some(Boolean)) keys.add(parts.join('|'));
    else unknownCount += 1;
  });

  return {
    key: String(name || '').toLowerCase(),
    name,
    color,
    count: (records || []).length,
    recordCount: (records || []).length,
    traineeCount: keys.size + unknownCount
  };
}

export function formatChinaTrainingDeliveryLegendText(item = {}) {
  const recordCount = Number(item.recordCount || 0).toLocaleString('zh-CN');
  const traineeCount = Number(item.traineeCount || 0).toLocaleString('zh-CN');
  return `培训人次 ${recordCount} · 培训人数 ${traineeCount}`;
}

export function resolveTrainingDeliveryFocusBranch(tabKey, rows = [], index = 0) {
  if (!['branch', 'failRate', 'failCount'].includes(tabKey)) return '';
  return rows[index]?.branch || '';
}

export function resolveTrainingDeliveryDistributionFocus(tabKey, rows = [], index = 0) {
  const labels = {
    product: { label: '产线', kicker: 'PRODUCT LINE' },
    type: { label: '课程', kicker: 'COURSE' }
  };
  const config = labels[tabKey];
  const row = rows[index];
  if (!config || !row?.name) return null;
  return {
    key: tabKey,
    ...config,
    name: row.name,
    value: Number(row.value || 0),
    rank: index + 1
  };
}

export function findTrainingDeliveryBranchIndex(rows = [], branch = '') {
  if (!branch) return -1;
  return rows.findIndex((row) => row?.branch === branch);
}

function normalizeIdentity(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, '');
}
