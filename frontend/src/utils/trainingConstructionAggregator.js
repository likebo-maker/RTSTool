import { applyPointOffsets } from '../services/geoCacheService';
import { getQualificationRegionGroups } from './branchGeoMap';

export const DEFAULT_TRAINING_CONSTRUCTION_FILTERS = {
  regions: [],
  productLines: [],
  courses: []
};

export const TRAINING_CONSTRUCTION_FILTER_FIELDS = {
  regions: 'mappedRegion',
  productLines: 'productLine',
  courses: 'courseName'
};

const STANDARD_COURSE_SOURCE = '课程标准-国内';

export const TRAINING_CONSTRUCTION_FILTER_KEYS = Object.keys(TRAINING_CONSTRUCTION_FILTER_FIELDS);

export function collectTrainingConstructionOptions(records) {
  return {
    regions: sortTextValues(uniqueValues(records.map((record) => record.mappedRegion)).filter((value) => value !== '未匹配大区')),
    productLines: sortTextValues(uniqueValues(records.map((record) => record.productLine))),
    courses: sortTextValues(uniqueValues(records.map((record) => record.courseName)))
  };
}

export function buildTrainingConstructionDynamicOptions(records, filters, baseOptions) {
  const selectedSets = buildSelectedFilterSets(filters, baseOptions);
  const buckets = Object.fromEntries(TRAINING_CONSTRUCTION_FILTER_KEYS.map((key) => [key, new Set()]));

  records.forEach((record) => {
    TRAINING_CONSTRUCTION_FILTER_KEYS.forEach((targetKey, targetIndex) => {
      for (const key of TRAINING_CONSTRUCTION_FILTER_KEYS.slice(0, targetIndex)) {
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
    TRAINING_CONSTRUCTION_FILTER_KEYS.map((key) => [key, sortTextValues([...buckets[key]])])
  );
}

export function applyTrainingConstructionFilters(records, filters = DEFAULT_TRAINING_CONSTRUCTION_FILTERS) {
  return records.filter((record) => {
    if (!matchesMultiSelect(record.mappedRegion, filters.regions)) return false;
    if (!matchesMultiSelect(record.productLine, filters.productLines)) return false;
    if (!matchesMultiSelect(record.courseName, filters.courses)) return false;
    return true;
  });
}

export function buildTrainingConstructionDashboard(records, filters = DEFAULT_TRAINING_CONSTRUCTION_FILTERS) {
  const filteredRecords = applyTrainingConstructionFilters(records, filters);
  const centerStats = Object.entries(groupBy(filteredRecords, 'centerName'))
    .map(([centerName, centerRecords]) => buildCenterStat(centerName, centerRecords))
    .filter(Boolean);
  const channelCenterStats = centerStats.filter((item) => item.centerType === '渠道');
  const internalCenterStats = centerStats.filter((item) => item.centerType === '内部');
  const regionGroups = getQualificationRegionGroups();

  return {
    filteredRecords,
    summary: {
      totalCenters: centerStats.length,
      internalCenters: internalCenterStats.length,
      channelCenters: channelCenterStats.length,
      coveredCourses: countCoveredStandardCourses(filteredRecords),
      centerCourseRelations: filteredRecords.length,
      missingTeacherCourses: filteredRecords.filter((record) => !record.teachers?.length).length
    },
    centerStats,
    mapPoints: applyPointOffsets(centerStats.filter((item) => Array.isArray(item.coords) && item.coords.length >= 2)),
    topCenters: [...centerStats].sort((left, right) =>
      right.courseCount - left.courseCount ||
      right.productLineCount - left.productLineCount ||
      left.centerName.localeCompare(right.centerName, 'zh-CN')
    ),
    channelTopCenters: [...channelCenterStats].sort((left, right) =>
      right.courseCount - left.courseCount || left.centerName.localeCompare(right.centerName, 'zh-CN')
    ),
    productLineDistribution: aggregateSeries(filteredRecords, 'productLine'),
    centerTypeDistribution: aggregateSeries(filteredRecords, 'centerType'),
    regionDistribution: buildRegionDistribution(filteredRecords, centerStats, regionGroups),
    courseDistribution: aggregateSeries(filteredRecords, 'courseName', 20),
    previewRows: filteredRecords.slice(0, 500)
  };
}

export function buildTrainingConstructionCenterDetail(centerName, records) {
  const centerRecords = records.filter((record) => record.centerName === centerName);
  const centerStat = buildCenterStat(centerName, centerRecords);
  return {
    centerStat,
    centerRecords,
    previewRows: centerRecords.slice(0, 300),
    productLineDistribution: aggregateSeries(centerRecords, 'productLine'),
    teacherDistribution: buildTeacherDistribution(centerRecords),
    courseRows: [...centerRecords].sort((left, right) =>
      left.productLine.localeCompare(right.productLine, 'zh-CN') ||
      left.courseName.localeCompare(right.courseName, 'zh-CN')
    )
  };
}

export function createAllTrainingConstructionFilters(options) {
  return {
    regions: [...(options.regions || [])],
    productLines: [...(options.productLines || [])],
    courses: [...(options.courses || [])]
  };
}

export function cloneTrainingConstructionFilters(filters) {
  return {
    regions: [...(filters.regions || [])],
    productLines: [...(filters.productLines || [])],
    courses: [...(filters.courses || [])]
  };
}

export function buildTrainingConstructionSelectedSets(filters, baseOptions) {
  return buildSelectedFilterSets(filters, baseOptions);
}

function buildSelectedFilterSets(filters, baseOptions) {
  return Object.fromEntries(
    TRAINING_CONSTRUCTION_FILTER_KEYS.map((key) => [key, buildEffectiveSelectedSet(filters[key] || [], baseOptions?.[key] || [])])
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
  return record?.[TRAINING_CONSTRUCTION_FILTER_FIELDS[key]] || '';
}

function matchesMultiSelect(value, selectedValues) {
  if (!Array.isArray(selectedValues)) return true;
  if (!selectedValues.length) return false;
  return selectedValues.includes(value);
}

function countCoveredStandardCourses(records) {
  return uniqueValues(records.map(getStandardCourseKey).filter(Boolean)).length;
}

function getStandardCourseKey(record) {
  if (!record) return '';
  if (record.standardCourseKey) return record.standardCourseKey;
  if (record.productLineSource === STANDARD_COURSE_SOURCE) return record.courseKey || record.courseName || '';
  return '';
}

function buildCenterStat(centerName, records) {
  if (!centerName || !records.length) return null;
  const firstRecord = records[0] || {};
  const uniqueCourses = uniqueValues(records.map((record) => record.courseName));
  const uniqueProductLines = uniqueValues(records.map((record) => record.productLine));
  const uniqueTeachers = uniqueValues(records.flatMap((record) => record.teachers || []));
  return {
    branch: centerName,
    centerName,
    centerType: firstRecord.centerType || '渠道',
    mappedRegion: firstRecord.mappedRegion || '未匹配大区',
    city: firstRecord.city || '',
    province: firstRecord.province || '',
    address: firstRecord.address || '',
    branchName: firstRecord.branchName || '',
    contact: firstRecord.contact || '',
    phone: firstRecord.phone || '',
    level: firstRecord.level || '',
    classroom: firstRecord.classroom || '',
    sampleModel: firstRecord.sampleModel || '',
    coords: firstRecord.coords,
    courseCount: uniqueCourses.length,
    relationCount: records.length,
    productLineCount: uniqueProductLines.length,
    teacherCount: uniqueTeachers.length,
    missingTeacherCourseCount: records.filter((record) => !record.teachers?.length).length,
    primaryProductLines: uniqueProductLines.slice(0, 4).join('、') || '暂无',
    primaryCourses: uniqueCourses.slice(0, 4).join('、') || '暂无',
    courseNames: uniqueCourses,
    productLines: uniqueProductLines
  };
}

function buildRegionDistribution(records, centerStats, regionGroups) {
  const recordsByRegion = groupBy(records, 'mappedRegion');
  const centersByRegion = groupBy(centerStats, 'mappedRegion');
  return regionGroups.map((region) => {
    const regionRecords = recordsByRegion[region.name] || [];
    const regionCenters = centersByRegion[region.name] || [];
    return {
      name: region.name,
      value: regionRecords.length,
      centerCount: regionCenters.length,
      courseCount: uniqueValues(regionRecords.map((record) => record.courseName)).length
    };
  });
}

function buildTeacherDistribution(records) {
  const counter = new Map();
  records.forEach((record) => {
    if (!record.teachers?.length) {
      counter.set('讲师信息暂未维护', (counter.get('讲师信息暂未维护') || 0) + 1);
      return;
    }
    record.teachers.forEach((teacher) => {
      counter.set(teacher, (counter.get(teacher) || 0) + 1);
    });
  });
  return [...counter.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value || left.name.localeCompare(right.name, 'zh-CN'))
    .slice(0, 10);
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

function uniqueValues(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function sortTextValues(values) {
  return [...new Set((values || []).filter(Boolean))].sort((left, right) => left.localeCompare(right, 'zh-CN'));
}
