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

function normalizeIdentity(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, '');
}
