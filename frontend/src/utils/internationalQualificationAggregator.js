import { resolveWorldCountryCentroid } from './globalRegionMap';

export const DEFAULT_INTERNATIONAL_QUALIFICATION_FILTERS = {
  secondaryRegions: [],
  countries: [],
  productLines: [],
  subProductLines: [],
  modelCategories: [],
  qualificationTypes: []
};

export function collectInternationalQualificationOptions(records) {
  return {
    secondaryRegions: sortTextValues(uniqueValues(records.map((record) => record.secondaryRegion))),
    countries: sortTextValues(uniqueValues(records.map((record) => record.country))),
    productLines: sortTextValues(uniqueValues(records.map((record) => record.productLine))),
    subProductLines: sortTextValues(uniqueValues(records.map((record) => record.subProductLine))),
    modelCategories: sortTextValues(uniqueValues(records.map((record) => record.modelCategory))),
    qualificationTypes: sortTextValues(uniqueValues(records.map((record) => record.qualificationType)))
  };
}

export function buildInternationalDynamicFilterOptions(records, filters, fallbackOptions = null) {
  const baseOptions = fallbackOptions || collectInternationalQualificationOptions(records);
  return {
    secondaryRegions: restrictOptions(baseOptions.secondaryRegions, collectFieldOptions(records, filters, 'secondaryRegions', 'secondaryRegion')),
    countries: restrictOptions(baseOptions.countries, collectFieldOptions(records, filters, 'countries', 'country')),
    productLines: restrictOptions(baseOptions.productLines, collectFieldOptions(records, filters, 'productLines', 'productLine')),
    subProductLines: restrictOptions(baseOptions.subProductLines, collectFieldOptions(records, filters, 'subProductLines', 'subProductLine')),
    modelCategories: restrictOptions(baseOptions.modelCategories, collectFieldOptions(records, filters, 'modelCategories', 'modelCategory')),
    qualificationTypes: restrictOptions(baseOptions.qualificationTypes, collectFieldOptions(records, filters, 'qualificationTypes', 'qualificationType'))
  };
}

export function applyInternationalQualificationFilters(records, filters = DEFAULT_INTERNATIONAL_QUALIFICATION_FILTERS, options = {}) {
  const skipField = options.skipField || '';
  return records.filter((record) => {
    if (skipField !== 'secondaryRegions' && !matchesMultiSelect(record.secondaryRegion, filters.secondaryRegions)) return false;
    if (skipField !== 'countries' && !matchesMultiSelect(record.country, filters.countries)) return false;
    if (skipField !== 'productLines' && !matchesMultiSelect(record.productLine, filters.productLines)) return false;
    if (skipField !== 'subProductLines' && !matchesMultiSelect(record.subProductLine, filters.subProductLines)) return false;
    if (skipField !== 'modelCategories' && !matchesMultiSelect(record.modelCategory, filters.modelCategories)) return false;
    if (skipField !== 'qualificationTypes' && !matchesMultiSelect(record.qualificationType, filters.qualificationTypes)) return false;
    return true;
  });
}

export function buildInternationalQualificationDashboard(records, filters = DEFAULT_INTERNATIONAL_QUALIFICATION_FILTERS) {
  const filteredRecords = applyInternationalQualificationFilters(records, filters);
  const countryMap = groupBy(filteredRecords, 'country');
  const countryStats = Object.entries(countryMap)
    .map(([country, countryRecords]) => buildCountryStat(country, countryRecords))
    .filter(Boolean);

  const summary = {
    totalPeople: countUniquePeople(filteredRecords),
    validQualifications: filteredRecords.filter((record) => record.isCurrentlyValid).length,
    totalQualifications: filteredRecords.length,
    coveredCountries: countryStats.length,
    coveredPartners: countUniquePartners(filteredRecords)
  };

  return {
    filteredRecords,
    summary,
    countryStats,
    mapPoints: countryStats.map(buildInternationalMapPoint).filter(Boolean),
    topValidCountries: [...countryStats]
      .sort((left, right) => right.validQualifications - left.validQualifications || right.totalPeople - left.totalPeople),
    topRiskCountries: [...countryStats]
      .sort(
        (left, right) =>
          right.expiredQualifications - left.expiredQualifications ||
          right.expiring30 - left.expiring30 ||
          right.expiring60 - left.expiring60 ||
          right.validQualifications - left.validQualifications
      ),
    productLineDistribution: aggregateValueSeries(filteredRecords.filter((record) => record.isCurrentlyValid), 'productLine'),
    subProductLineDistribution: aggregateValueSeries(filteredRecords.filter((record) => record.isCurrentlyValid), 'subProductLine'),
    modelCategoryDistribution: aggregateValueSeries(filteredRecords.filter((record) => record.isCurrentlyValid), 'modelCategory'),
    qualificationTypeDistribution: aggregateValueSeries(filteredRecords.filter((record) => record.isCurrentlyValid), 'qualificationType'),
    expiryTrend: [
      { label: 'Expiring in 30 days', value: countByExpiryWindow(filteredRecords, 0, 30) },
      { label: 'Expiring in 60 days', value: countByExpiryWindow(filteredRecords, 31, 60) },
      { label: 'Expiring in 90 days', value: countByExpiryWindow(filteredRecords, 61, 90) },
      { label: 'Expired', value: countExpired(filteredRecords) }
    ]
  };
}

export function buildInternationalCountryDetail(country, records) {
  const countryRecords = records.filter((record) => record.country === country);
  const countryStat = buildCountryStat(country, countryRecords);
  return {
    countryRecords,
    countryStat,
    productLineDistribution: aggregateValueSeries(countryRecords.filter((record) => record.isCurrentlyValid), 'productLine'),
    subProductLineDistribution: aggregateValueSeries(countryRecords.filter((record) => record.isCurrentlyValid), 'subProductLine'),
    qualificationTypeDistribution: aggregateValueSeries(countryRecords.filter((record) => record.isCurrentlyValid), 'qualificationType'),
    expiryDistribution: [
      { label: 'Valid', value: countryRecords.filter((record) => record.isCurrentlyValid).length },
      { label: 'Expiring in 30 days', value: countByExpiryWindow(countryRecords, 0, 30) },
      { label: 'Expiring in 60 days', value: countByExpiryWindow(countryRecords, 31, 60) },
      { label: 'Expiring in 90 days', value: countByExpiryWindow(countryRecords, 61, 90) },
      { label: 'Expired', value: countExpired(countryRecords) }
    ]
  };
}

export function formatInternationalQualificationStatus(record) {
  if (!record) return 'Unknown';
  if (isExpired(record)) return 'Expired';
  if (isInExpiryWindow(record, 0, 30)) return 'Expiring in 30 days';
  if (isInExpiryWindow(record, 31, 60)) return 'Expiring in 60 days';
  if (isInExpiryWindow(record, 61, 90)) return 'Expiring in 90 days';
  if (record.isCurrentlyValid) return 'Valid';
  return 'Unknown';
}

function buildCountryStat(country, records) {
  if (!country || !records.length) return null;
  const productLineDistribution = aggregateValueSeries(records.filter((record) => record.isCurrentlyValid), 'productLine', 3);
  const expiredQualifications = countExpired(records);
  const expiring30 = countByExpiryWindow(records, 0, 30);
  const expiring60 = countByExpiryWindow(records, 31, 60);
  const expiring90 = countByExpiryWindow(records, 61, 90);
  const validQualifications = records.filter((record) => record.isCurrentlyValid).length;

  return {
    country,
    secondaryRegion: records[0]?.secondaryRegion || '',
    totalPeople: countUniquePeople(records),
    validQualifications,
    totalQualifications: records.length,
    coveredPartners: countUniquePartners(records),
    expiring30,
    expiring60,
    expiring90,
    expiredQualifications,
    riskLevel: getRiskLevel({ expiredQualifications, expiring30, expiring60, totalCount: records.length }),
    primaryProductLines: productLineDistribution.map((item) => item.name).join(', ') || 'No valid qualification',
    productLineDistribution
  };
}

function buildInternationalMapPoint(item) {
  const coords = resolveWorldCountryCentroid(item.country);
  if (!coords) return null;
  return {
    ...item,
    region: item.secondaryRegion,
    coords,
    geoSource: 'offline-world'
  };
}

function collectFieldOptions(records, filters, skipField, recordField) {
  return sortTextValues(uniqueValues(
    applyInternationalQualificationFilters(records, filters, { skipField }).map((record) => record[recordField])
  ));
}

function restrictOptions(baseOptions, dynamicOptions) {
  const dynamicSet = new Set(dynamicOptions);
  return baseOptions.filter((option) => dynamicSet.has(option));
}

function matchesMultiSelect(value, selectedValues) {
  if (!Array.isArray(selectedValues)) return true;
  if (!selectedValues.length) return false;
  return selectedValues.includes(value);
}

function getRiskLevel({ expiredQualifications, expiring30, expiring60, totalCount }) {
  if (expiredQualifications > 0 || expiring30 >= Math.max(3, Math.ceil(totalCount * 0.08))) {
    return 'High Risk';
  }
  if (expiring30 > 0 || expiring60 > 0) {
    return 'Attention';
  }
  return 'Normal';
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
    .sort((left, right) => right.value - left.value || left.name.localeCompare(right.name, 'en'))
    .slice(0, limit);
}

function countUniquePeople(records) {
  const keys = new Set(
    records.map((record) => {
      const employeeId = String(record.employeeId || '').trim();
      const personName = String(record.personName || '').trim();
      if (employeeId || personName) return `${employeeId}|${personName}`;
      return `${record.country || ''}|${record.partnerName || ''}|${record.sourceRow || ''}`;
    })
  );
  return keys.size;
}

function countUniquePartners(records) {
  return new Set(
    records
      .map((record) => String(record.partnerName || '').trim())
      .filter(Boolean)
  ).size;
}

function countByExpiryWindow(records, minDays, maxDays) {
  return records.filter((record) => isInExpiryWindow(record, minDays, maxDays)).length;
}

function countExpired(records) {
  return records.filter(isExpired).length;
}

function isExpired(record) {
  return Number.isFinite(record.daysUntilExpiry) && record.daysUntilExpiry < 0;
}

function isInExpiryWindow(record, minDays, maxDays) {
  return record.isCurrentlyValid &&
    Number.isFinite(record.daysUntilExpiry) &&
    record.daysUntilExpiry >= minDays &&
    record.daysUntilExpiry <= maxDays;
}

function groupBy(records, field) {
  return records.reduce((accumulator, record) => {
    const key = record[field] || 'Unclassified';
    if (!accumulator[key]) accumulator[key] = [];
    accumulator[key].push(record);
    return accumulator;
  }, {});
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function sortTextValues(values) {
  return [...values].sort((left, right) => left.localeCompare(right, 'en'));
}
