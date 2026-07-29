import { applyPointOffsets } from '../services/geoCacheService';
import { getInternationalTrainingRegionGroups } from './internationalTrainingConstructionConfig';
import { hasInvalidInternationalTrainingConstructionField } from './internationalTrainingConstructionDataQuality';

export const DEFAULT_INTERNATIONAL_TRAINING_CONSTRUCTION_FILTERS = {
  secondaryRegions: [],
  countries: [],
  productLines: [],
  courses: []
};

export const INTERNATIONAL_TRAINING_CONSTRUCTION_FILTER_FIELDS = [
  { key: 'secondaryRegions', recordField: 'secondaryRegion' },
  { key: 'countries', recordField: 'country' },
  { key: 'productLines', recordField: 'productLine' },
  { key: 'courses', recordField: 'courseName' }
];

export function collectInternationalTrainingConstructionOptions(records) {
  return Object.fromEntries(
    INTERNATIONAL_TRAINING_CONSTRUCTION_FILTER_FIELDS.map(({ key, recordField }) => [
      key,
      sortTextValues(uniqueValues(
        (records || [])
          .filter((record) => !hasInvalidInternationalTrainingConstructionField(record, recordField))
          .map((record) => record[recordField])
      ))
    ])
  );
}

export function buildInternationalTrainingConstructionDynamicOptions(records, filters, fallbackOptions = null) {
  const allOptions = fallbackOptions || collectInternationalTrainingConstructionOptions(records);
  return Object.fromEntries(INTERNATIONAL_TRAINING_CONSTRUCTION_FILTER_FIELDS.map((targetField, targetIndex) => {
    const values = new Set();
    (records || []).forEach((record) => {
      const matchesPreviousFilters = INTERNATIONAL_TRAINING_CONSTRUCTION_FILTER_FIELDS
        .slice(0, targetIndex)
        .every((field) => matchesConstructionDimension(record, field, filters, allOptions));
      if (!matchesPreviousFilters || hasInvalidInternationalTrainingConstructionField(record, targetField.recordField)) return;
      const value = record[targetField.recordField];
      if (value) values.add(value);
    });
    return [
      targetField.key,
      (allOptions[targetField.key] || []).filter((value) => values.has(value))
    ];
  }));
}

export function applyInternationalTrainingConstructionFilters(
  records,
  filters = DEFAULT_INTERNATIONAL_TRAINING_CONSTRUCTION_FILTERS,
  options = {}
) {
  const allOptions = options.allOptions || collectInternationalTrainingConstructionOptions(records);
  return (records || []).filter((record) =>
    INTERNATIONAL_TRAINING_CONSTRUCTION_FILTER_FIELDS.every((field) =>
      matchesConstructionDimension(record, field, filters, allOptions)
    )
  );
}

export function buildInternationalTrainingConstructionDashboard(records, filters = DEFAULT_INTERNATIONAL_TRAINING_CONSTRUCTION_FILTERS) {
  const allOptions = collectInternationalTrainingConstructionOptions(records);
  const filteredRecords = applyInternationalTrainingConstructionFilters(records, filters, { allOptions });
  // A center expands into center-course records. Contract totals must use the
  // unique center layer so a multi-course center is counted only once.
  const centerStats = Object.entries(groupBy(filteredRecords, 'centerName'))
    .map(([centerName, centerRecords]) => buildCenterStat(centerName, centerRecords))
    .filter(Boolean);
  const countryStats = Object.entries(groupBy(centerStats, 'country'))
    .map(([country, items]) => buildCountryStat(country, items))
    .filter(Boolean);

  return {
    filteredRecords,
    summary: {
      totalCenters: centerStats.length,
      signedCenters: centerStats.filter((item) => item.isSigned).length,
      unsignedCenters: centerStats.filter((item) => !item.isSigned && !item.isInternal).length,
      internalCenters: centerStats.filter((item) => item.isInternal).length
    },
    centerStats,
    mapPoints: applyPointOffsets(centerStats.filter((item) => Array.isArray(item.coords) && item.coords.length >= 2)),
    topCenters: [...centerStats].sort((left, right) =>
      right.courseCount - left.courseCount ||
      right.productLineCount - left.productLineCount ||
      left.centerName.localeCompare(right.centerName, 'en')
    ),
    countryStats: [...countryStats].sort((left, right) =>
      right.centerCount - left.centerCount || left.country.localeCompare(right.country, 'en')
    ),
    productLineDistribution: aggregateCentersByValue(centerStats, 'productLines'),
    regionDistribution: buildRegionDistribution(centerStats),
    courseDistribution: aggregateRecordsByValue(filteredRecords, 'courseName')
  };
}

export function buildInternationalTrainingConstructionCenterDetail(centerName, records) {
  const centerRecords = (records || []).filter((record) => record.centerName === centerName);
  const centerStat = buildCenterStat(centerName, centerRecords);
  return {
    centerStat,
    centerRecords,
    productLineDistribution: aggregateRecordsByValue(centerRecords, 'productLine'),
    courseDistribution: aggregateRecordsByValue(centerRecords, 'courseName'),
    detailRows: buildDetailRows(centerRecords[0])
  };
}

export function createAllInternationalTrainingConstructionFilters(options) {
  return Object.fromEntries(
    INTERNATIONAL_TRAINING_CONSTRUCTION_FILTER_FIELDS.map(({ key }) => [key, [...(options?.[key] || [])]])
  );
}

export function cloneInternationalTrainingConstructionFilters(filters) {
  return Object.fromEntries(
    INTERNATIONAL_TRAINING_CONSTRUCTION_FILTER_FIELDS.map(({ key }) => [key, [...(filters?.[key] || [])]])
  );
}

function buildCenterStat(centerName, records) {
  if (!centerName || !records?.length) return null;
  const first = records[0];
  const courseNames = uniqueValues(records.map((record) => record.courseName));
  const productLines = uniqueValues(
    records
      .filter((record) => !hasInvalidInternationalTrainingConstructionField(record, 'productLine'))
      .map((record) => record.productLine)
  );
  return {
    centerName,
    country: first.country || '',
    secondaryRegion: first.secondaryRegion || '',
    city: first.city || '',
    displayLocation: first.displayLocation || '',
    capital: first.capital || '',
    geoSource: first.geoSource || '',
    coords: first.coords,
    centerType: first.centerType || '',
    contractStatus: first.contractStatus || '',
    isSigned: Boolean(first.isSigned),
    isInternal: Boolean(first.isInternal),
    productLines,
    courseNames,
    productLineCount: productLines.length,
    courseCount: courseNames.length,
    relationCount: records.length,
    sourceFile: first.sourceFile || '',
    sourceSheet: first.sourceSheet || '',
    sourceRow: first.sourceRow || 0
  };
}

function buildCountryStat(country, centerStats) {
  if (!country || !centerStats?.length) return null;
  return {
    country,
    secondaryRegion: centerStats[0].secondaryRegion || '',
    centerCount: centerStats.length,
    signedCenters: centerStats.filter((item) => item.isSigned).length,
    unsignedCenters: centerStats.filter((item) => !item.isSigned && !item.isInternal).length,
    internalCenters: centerStats.filter((item) => item.isInternal).length
  };
}

function buildRegionDistribution(centerStats) {
  const byRegion = groupBy(centerStats, 'secondaryRegion');
  return getInternationalTrainingRegionGroups().map((region) => {
    const centers = byRegion[region.name] || [];
    return {
      name: region.name,
      color: region.color,
      centerCount: centers.length,
      signedCenters: centers.filter((item) => item.isSigned).length,
      unsignedCenters: centers.filter((item) => !item.isSigned && !item.isInternal).length,
      internalCenters: centers.filter((item) => item.isInternal).length
    };
  });
}

function aggregateCentersByValue(centerStats, field) {
  const counter = new Map();
  (centerStats || []).forEach((center) => {
    new Set(center[field] || []).forEach((value) => {
      if (!value) return;
      counter.set(value, (counter.get(value) || 0) + 1);
    });
  });
  return sortSeries(counter);
}

function aggregateRecordsByValue(records, field) {
  const counter = new Map();
  (records || []).forEach((record) => {
    if (hasInvalidInternationalTrainingConstructionField(record, field)) return;
    const value = record[field];
    if (!value) return;
    counter.set(value, (counter.get(value) || 0) + 1);
  });
  return sortSeries(counter);
}

function sortSeries(counter) {
  return [...counter.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value || left.name.localeCompare(right.name, 'en'));
}

function buildDetailRows(record) {
  if (!record) return [];
  const rows = [
    ['Secondary Region', record.secondaryRegion],
    ['Country', record.country],
    ['City', record.city || record.capital],
    ['Location Source', formatLocationSource(record.geoSource)],
    ['Center Type', record.centerType],
    ['Contract Status', record.contractStatus || 'Status not maintained'],
    ['Audit Result', record.auditResult],
    ['Mindray Applicant', record.applicant],
    ['Center Contact', record.contact],
    ['Chairs', record.chairs],
    ['Classroom', record.classrooms],
    ['Samples', record.samples],
    ['Capacity', record.capacity],
    ['Channel Lecturers', record.channelLecturers],
    ['Mindray Lecturers', record.mindrayLecturers],
    ['Forecast', record.forecast],
    ['Authorization No.', record.authorizationNo],
    ['Remark', record.remark]
  ];
  return rows
    .filter(([, value]) => String(value ?? '').trim())
    .map(([label, value]) => ({ label, value: String(value).trim() }));
}

function formatLocationSource(source) {
  if (source === 'city-coordinate') return 'City coordinate';
  if (source === 'capital-fallback') return 'Capital fallback';
  return 'Country capital';
}

function matchesConstructionDimension(record, field, filters, allOptions) {
  const selected = Array.isArray(filters?.[field.key]) ? filters[field.key] : [];
  const base = allOptions?.[field.key] || [];
  if (!selected.length) return false;
  if (hasInvalidInternationalTrainingConstructionField(record, field.recordField)) {
    return isAllSelection(selected, base);
  }
  return isAllSelection(selected, base) || selected.includes(record[field.recordField]);
}

function isAllSelection(selectedValues, baseValues) {
  const selected = new Set(selectedValues || []);
  const base = (baseValues || []).filter(Boolean);
  return base.length > 0 && base.every((value) => selected.has(value));
}

function groupBy(records, field) {
  return (records || []).reduce((groups, record) => {
    const key = record?.[field] || 'Unclassified';
    if (!groups[key]) groups[key] = [];
    groups[key].push(record);
    return groups;
  }, {});
}

function uniqueValues(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function sortTextValues(values) {
  return [...new Set(values || [])].sort((left, right) => left.localeCompare(right, 'en'));
}
