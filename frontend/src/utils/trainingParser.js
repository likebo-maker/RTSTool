import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { normalizeTrainingResult } from './trainingStatusNormalizer';
import {
  INTERNAL_TRAINING_CENTERS,
  normalizeCenterName,
  normalizeCourseName
} from './trainingConstructionConfig';
import { normalizeTrainingTime } from './trainingTime';

const HEADER_ALIASES = {
  branch: ['区域', '分公司', '所属分公司', '服务区域'],
  region: ['大区', '区域大区', '所属大区', '班次所在大区'],
  productLine: ['产线', '产品线', '小产线', '业务线'],
  trainingYear: ['培训年度', '年度', '年份'],
  trainingMonth: ['培训月份', '月份'],
  trainingResult: ['完成情况', '成绩结果', '培训结果', '是否合格', '状态'],
  location: ['培训中心', '举办地点'],
  trainingType: ['培训类型', '课程类型', '培训形式', '课程形式'],
  courseName: ['培训名称', '课程名称'],
  coursePlan: ['所属方案', '课程方案', '已授权课程方案', '授权面授课程'],
  lecturer: ['讲师', '讲师账号/姓名/组织'],
  studentAccount: ['学员账号', '学员工号', '员工编号', '人工编号'],
  studentName: ['学员姓名', '姓名'],
  studentOrg: ['学员组织', '学员组织名称'],
  score: ['成绩'],
  durationHours: ['课时'],
  startDate: ['培训开始时间', '培训开始日期'],
  endDate: ['培训结束时间', '培训结束日期'],
  batchId: ['班次ID'],
  organizer: ['培训组织方'],
  trainingPlace: ['培训地点']
};

const NORMALIZED_ALIAS_LOOKUP = Object.fromEntries(
  Object.entries(HEADER_ALIASES).map(([field, aliases]) => [field, aliases.map(normalizeHeaderText)])
);

export async function parseTrainingFiles(fileList, options = {}) {
  const files = Array.from(fileList || []).filter(Boolean);
  if (!files.length) {
    throw new Error('请先选择至少一个培训表文件');
  }

  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
  const constructionContext = buildDeliveryConstructionContext(options.constructionRecords || []);
  if (!constructionContext.centers.length) {
    throw new Error('请先导入中国区培训中心建设地图数据，再导入培训中心交付数据。');
  }

  const records = [];
  const validation = createDeliveryValidation();

  for (const [fileIndex, file] of files.entries()) {
    onProgress?.({
      step: 'read',
      status: 'processing',
      progress: scaleProgress(fileIndex / Math.max(files.length, 1), 0, 18),
      message: `正在读取第 ${fileIndex + 1} 个 Excel 文件：${file.name}`
    });

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

    for (const [sheetIndex, sheetName] of workbook.SheetNames.entries()) {
      const worksheet = workbook.Sheets[sheetName];
      const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: true });
      if (!matrix.length) continue;

      onProgress?.({
        step: 'structure',
        status: 'processing',
        progress: scaleProgress((fileIndex + sheetIndex / Math.max(workbook.SheetNames.length, 1)) / Math.max(files.length, 1), 18, 36),
        message: `正在解析第 ${sheetIndex + 1} 个 Sheet：${sheetName}`
      });

      const headerRowIndex = findHeaderRowIndex(matrix);
      if (headerRowIndex === -1) {
        validation.skippedSheets.push(`${file.name} / ${sheetName} 未识别到有效表头，已跳过`);
        pushDeliveryDirtyRow(validation, {
          category: 'Sheet未识别',
          reason: '未识别到有效表头，已跳过',
          sourceFile: file.name,
          sourceSheet: sheetName,
          sourceRow: '',
          rawData: {}
        });
        continue;
      }

      const headerRow = matrix[headerRowIndex];
      const columnIndexMap = buildColumnIndexMap(headerRow);
      const requiredFields = ['organizer', 'courseName', 'trainingResult'];
      const missingFields = requiredFields.filter((field) => columnIndexMap[field] === undefined);
      if (columnIndexMap.trainingYear === undefined && columnIndexMap.startDate === undefined) missingFields.push('trainingYear');
      if (columnIndexMap.trainingMonth === undefined && columnIndexMap.startDate === undefined) missingFields.push('trainingMonth');
      if (missingFields.length >= 3) {
        validation.skippedSheets.push(`${file.name} / ${sheetName} 缺少关键字段，已跳过`);
        pushDeliveryDirtyRow(validation, {
          category: 'Sheet字段缺失',
          reason: `缺少关键字段：${missingFields.join('、')}`,
          sourceFile: file.name,
          sourceSheet: sheetName,
          sourceRow: headerRowIndex + 1,
          rawData: buildRawRowObject(headerRow, headerRow)
        });
        continue;
      }

      const totalRows = Math.max(matrix.length - headerRowIndex - 1, 1);
      for (let rowIndex = headerRowIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
        const row = matrix[rowIndex];
        if (isBlankRow(row)) continue;

        if ((rowIndex - headerRowIndex) % 2000 === 0) {
          const rowProgress = (rowIndex - headerRowIndex) / totalRows;
          onProgress?.({
            step: 'clean',
            status: 'processing',
            progress: scaleProgress(rowProgress, 36, 62),
            message: `正在清洗培训数据：${sheetName} 第 ${rowIndex + 1} 行`
          });
          onProgress?.({
            step: 'result',
            status: 'processing',
            progress: scaleProgress(rowProgress, 52, 84),
            message: '正在计算培训结果和培训周期...'
          });
        }

        validation.totalRows += 1;

        const trainingType = pickFirstMeaningfulValue(row, columnIndexMap, ['trainingType']) || '未知';
        const organizer = pickFirstMeaningfulValue(row, columnIndexMap, ['organizer']);
        const trainingCenterField = pickFirstMeaningfulValue(row, columnIndexMap, ['location']);
        const trainingPlace = pickFirstMeaningfulValue(row, columnIndexMap, ['trainingPlace']);
        const location = trainingPlace || trainingCenterField || organizer || '未知';
        const courseName = pickFirstMeaningfulValue(row, columnIndexMap, ['courseName']) || '未知课程';
        const coursePlan = pickFirstMeaningfulValue(row, columnIndexMap, ['coursePlan']);
        const centerMatch = resolveDeliveryCenter({
          organizer,
          trainingCenterField,
          trainingPlace,
          constructionContext
        });
        if (!centerMatch.center) {
          validation.skippedRows += 1;
          pushDeliveryIssue(validation, centerMatch.bucket || 'unmatchedCenters', {
            category: centerMatch.bucket === 'unmatchedInternalPlaces' ? '非四个内部培训地点' : '培训中心未匹配',
            organizer,
            trainingPlace,
            trainingCenter: trainingCenterField,
            courseName,
            reason: centerMatch.reason || '培训组织方未匹配建设地图中的培训中心',
            sourceFile: file.name,
            sourceSheet: sheetName,
            sourceRow: rowIndex + 1,
            rawData: buildRawRowObject(headerRow, row)
          });
          continue;
        }

        const courseMatch = resolveConstructionCourse(centerMatch.center, [courseName, coursePlan]);
        if (!courseMatch) {
          validation.skippedRows += 1;
          pushDeliveryIssue(validation, 'unmatchedCourses', {
            category: '课程未匹配承接范围',
            organizer,
            trainingPlace,
            trainingCenter: centerMatch.center.centerName,
            courseName: coursePlan || courseName,
            reason: `${centerMatch.center.centerName} 未在建设地图中承接该课程`,
            sourceFile: file.name,
            sourceSheet: sheetName,
            sourceRow: rowIndex + 1,
            rawData: buildRawRowObject(headerRow, row)
          });
          continue;
        }

        const lecturer = pickFirstMeaningfulValue(row, columnIndexMap, ['lecturer']) || '未知';
        const studentAccount = pickFirstMeaningfulValue(row, columnIndexMap, ['studentAccount']);
        const studentName = pickFirstMeaningfulValue(row, columnIndexMap, ['studentName']);
        const studentOrg = pickFirstMeaningfulValue(row, columnIndexMap, ['studentOrg']) || '未知';
        const trainingResultMeta = normalizeTrainingResult(pickFirstMeaningfulValue(row, columnIndexMap, ['trainingResult']));
        const cycle = resolveTrainingCycle(row, columnIndexMap);
        const score = pickFirstMeaningfulValue(row, columnIndexMap, ['score']);
        const batchId = pickFirstMeaningfulValue(row, columnIndexMap, ['batchId']);
        const startDate = pickFirstMeaningfulValue(row, columnIndexMap, ['startDate']);
        const endDate = pickFirstMeaningfulValue(row, columnIndexMap, ['endDate']);
        const trainingTime = normalizeTrainingTime(endDate);
        const durationHours = pickFirstMeaningfulValue(row, columnIndexMap, ['durationHours']);

        // "Time" is governed by the source report's Training End Time. Keep an
        // otherwise valid record, but export the full row when that value is
        // missing so the user can correct the workbook without losing evidence.
        if (!trainingTime) {
          validation.invalidTrainingTimes += 1;
          pushDeliveryDirtyRow(validation, {
            category: '培训结束时间异常',
            reason: endDate ? `培训结束时间无法识别：${endDate}` : '培训结束时间为空',
            sourceFile: file.name,
            sourceSheet: sheetName,
            sourceRow: rowIndex + 1,
            organizer,
            trainingPlace,
            trainingCenter: centerMatch.center.centerName,
            courseName: courseMatch.courseName,
            productLine: courseMatch.productLine,
            rawData: buildRawRowObject(headerRow, row)
          });
        }

        if (!organizer && !courseName && !cycle && !trainingType) continue;

        const sessionKey = buildTrainingSessionKey({
          batchId,
          cycle,
          location: centerMatch.center.centerName,
          trainingType,
          courseName: courseMatch.courseName,
          productLine: courseMatch.productLine
        });

        records.push({
          id: `${file.name}-${sheetName}-${rowIndex + 1}`,
          branch: centerMatch.center.centerName,
          normalizedBranch: centerMatch.center.centerName,
          mappedRegion: centerMatch.center.mappedRegion,
          productLine: courseMatch.productLine,
          trainingCycle: cycle || '未知',
          trainingResult: trainingResultMeta.normalized,
          trainingType,
          trainingLocation: location,
          trainingCenter: centerMatch.center.centerName,
          trainingCenterCity: centerMatch.center.city,
          centerType: centerMatch.center.centerType,
          province: centerMatch.center.province,
          city: centerMatch.center.city,
          coords: centerMatch.center.coords,
          geoSource: centerMatch.center.geoSource,
          organizer: organizer || location,
          geoLocationName: centerMatch.center.centerName,
          courseName: courseMatch.courseName,
          sourceCourseName: courseName,
          sourceCoursePlan: coursePlan,
          lecturer,
          studentAccount,
          studentName: studentName || '',
          studentOrg,
          score: score || '',
          durationHours: durationHours || '',
          startDate: formatDateCell(startDate),
          endDate: formatDateCell(endDate),
          trainingTime,
          trainingYear: extractYearValue(row, columnIndexMap),
          trainingMonth: extractMonthValue(row, columnIndexMap),
          sessionKey,
          batchId,
          isPass: trainingResultMeta.isPass,
          isFail: trainingResultMeta.isFail,
          isEffectiveResult: trainingResultMeta.isEffective,
          deliveryMatchedBy: centerMatch.matchedBy,
          constructionCourseKey: courseMatch.courseKey,
          constructionProductLineSource: courseMatch.productLineSource,
          sourceFile: file.name,
          sourceSheet: sheetName,
          sourceRow: rowIndex + 1
        });

        if (centerMatch.center.centerType === '内部') validation.internalRows += 1;
        if (centerMatch.center.centerType === '渠道') validation.channelRows += 1;
      }
    }
  }

  if (!records.length) {
    const suffix = validation.skippedRows
      ? `；已读取 ${validation.totalRows} 行，但 ${validation.skippedRows} 行未匹配建设地图中的培训中心或课程。`
      : '。';
    throw new Error(`导入失败：未识别到可纳入统计的交付记录${suffix}`);
  }

  onProgress?.({ step: 'read', status: 'completed', progress: 18, message: 'Excel 文件读取完成' });
  onProgress?.({ step: 'structure', status: 'completed', progress: 36, message: '培训字段识别完成' });
  onProgress?.({ step: 'clean', status: 'completed', progress: 62, message: '培训数据清洗完成' });
  onProgress?.({ step: 'result', status: 'completed', progress: 84, message: '培训结果计算完成' });

  return {
    records,
    warnings: buildDeliveryWarnings(validation),
    validation: finalizeDeliveryValidation(validation),
    dirtyRows: validation.dirtyRows
  };
}

function resolveTrainingCycle(row, columnIndexMap) {
  const year = extractYearValue(row, columnIndexMap);
  const month = extractMonthValue(row, columnIndexMap);
  if (year && month) return `${year}-${String(month).padStart(2, '0')}`;

  const fallbackDate = readCellValue(row, columnIndexMap.startDate);
  if (!fallbackDate) return '';
  const parsed = dayjs(fallbackDate);
  return parsed.isValid() ? parsed.format('YYYY-MM') : '';
}

function extractYearValue(row, columnIndexMap) {
  return readCellValue(row, columnIndexMap.trainingYear).replace(/\D/g, '').slice(0, 4);
}

function extractMonthValue(row, columnIndexMap) {
  const rawMonth = readCellValue(row, columnIndexMap.trainingMonth).replace(/\D/g, '');
  if (rawMonth) return String(Number(rawMonth)).padStart(2, '0');
  const fallbackDate = readCellValue(row, columnIndexMap.startDate);
  const parsed = dayjs(fallbackDate);
  return parsed.isValid() ? parsed.format('MM') : '';
}

function buildTrainingSessionKey({ batchId, cycle, location, trainingType, courseName, productLine }) {
  if (batchId) return batchId;
  return [cycle, location, trainingType, courseName, productLine].filter(Boolean).join('|');
}

function buildDeliveryConstructionContext(constructionRecords) {
  const centerByKey = new Map();
  const coursesByCenterKey = new Map();

  (constructionRecords || []).forEach((record) => {
    if (!record?.centerName || !record?.courseName) return;
    const centerKey = normalizeCenterName(record.centerName);
    if (!centerByKey.has(centerKey)) {
      centerByKey.set(centerKey, {
        centerName: record.centerName,
        centerType: record.centerType || '渠道',
        mappedRegion: record.mappedRegion || '未匹配大区',
        province: record.province || '',
        city: record.city || record.trainingCenterCity || '',
        coords: Array.isArray(record.coords) ? [...record.coords] : null,
        geoSource: record.geoSource || 'construction',
        address: record.address || ''
      });
    }
    if (!coursesByCenterKey.has(centerKey)) coursesByCenterKey.set(centerKey, new Map());
    const courseKey = normalizeCourseName(record.courseName);
    if (!courseKey || coursesByCenterKey.get(centerKey).has(courseKey)) return;
    coursesByCenterKey.get(centerKey).set(courseKey, {
      courseName: record.courseName,
      courseKey,
      productLine: record.productLine || '未匹配产线',
      productLineSource: record.productLineSource || '',
      standardCourseKey: record.standardCourseKey || ''
    });
  });

  centerByKey.forEach((center, centerKey) => {
    center.courses = coursesByCenterKey.get(centerKey) || new Map();
  });

  return {
    centers: [...centerByKey.values()],
    centerByKey
  };
}

function resolveDeliveryCenter({ organizer, trainingCenterField, trainingPlace, constructionContext }) {
  const compactOrganizer = compactText(organizer);
  const organizerHasMindray = compactOrganizer.includes('迈瑞');
  const organizerCity = organizerHasMindray ? findInternalCenterCity(compactOrganizer) : '';
  if (organizerCity) {
    return resolveInternalCenterByCity(organizerCity, constructionContext, `培训组织方匹配${organizerCity}`);
  }

  if (isGenericMindrayOrganizer(compactOrganizer)) {
    const placeCity = findInternalCenterCity([trainingPlace, trainingCenterField].join(' '));
    if (placeCity) {
      return resolveInternalCenterByCity(placeCity, constructionContext, `培训地点匹配${placeCity}`);
    }
    return {
      center: null,
      bucket: 'unmatchedInternalPlaces',
      reason: '迈瑞组织方的培训地点未匹配深圳/武汉/西安/南京四个内部培训中心'
    };
  }

  const exactCenter = findConstructionCenterByName(organizer, constructionContext)
    || findConstructionCenterByName(trainingCenterField, constructionContext)
    || findConstructionCenterByName(trainingPlace, constructionContext);
  if (exactCenter) {
    return {
      center: exactCenter,
      matchedBy: '建设地图培训中心精确匹配'
    };
  }

  return {
    center: null,
    bucket: 'unmatchedCenters',
    reason: '培训组织方未匹配建设地图中的培训中心'
  };
}

function resolveInternalCenterByCity(city, constructionContext, matchedBy) {
  const internalCenter = INTERNAL_TRAINING_CENTERS.find((center) => center.city === city);
  const center = internalCenter ? constructionContext.centerByKey.get(normalizeCenterName(internalCenter.name)) : null;
  if (!center) {
    return {
      center: null,
      bucket: 'unmatchedInternalPlaces',
      reason: `${city}培训中心未在建设地图中导入`
    };
  }
  return {
    center,
    matchedBy
  };
}

function findConstructionCenterByName(value, constructionContext) {
  const key = normalizeCenterName(value);
  if (!key) return null;
  return constructionContext.centerByKey.get(key) || null;
}

function resolveConstructionCourse(center, courseCandidates) {
  if (!center?.courses?.size) return null;
  for (const candidate of courseCandidates || []) {
    const courseKey = normalizeCourseName(candidate);
    if (!courseKey) continue;
    const course = center.courses.get(courseKey);
    if (course) return course;
  }
  return null;
}

function isGenericMindrayOrganizer(value) {
  return ['迈瑞', '迈瑞医疗', '深圳迈瑞', '深圳迈瑞医疗'].includes(value);
}

function findInternalCenterCity(value) {
  const text = compactText(value);
  return INTERNAL_TRAINING_CENTERS
    .map((center) => center.city)
    .find((city) => text.includes(city)) || '';
}

function compactText(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, '')
    .trim();
}

function createDeliveryValidation() {
  return {
    totalRows: 0,
    skippedRows: 0,
    internalRows: 0,
    channelRows: 0,
    invalidTrainingTimes: 0,
    skippedSheets: [],
    dirtyRows: [],
    unmatchedCenters: createIssueBucket(),
    unmatchedInternalPlaces: createIssueBucket(),
    unmatchedCourses: createIssueBucket()
  };
}

function createIssueBucket() {
  return { count: 0, samples: [], sampleKeys: new Set() };
}

function pushDeliveryIssue(validation, bucket, issue) {
  const target = validation[bucket] || validation.unmatchedCenters;
  target.count += 1;
  pushDeliveryDirtyRow(validation, {
    category: issue.category || '交付数据未纳入统计',
    reason: issue.reason || '',
    sourceFile: issue.sourceFile || '',
    sourceSheet: issue.sourceSheet || '',
    sourceRow: issue.sourceRow || '',
    organizer: issue.organizer || '',
    trainingPlace: issue.trainingPlace || '',
    trainingCenter: issue.trainingCenter || '',
    courseName: issue.courseName || '',
    rawData: issue.rawData || {}
  });
  if (target.samples.length >= 8) return;
  const sample = {
    organizer: issue.organizer || '',
    trainingPlace: issue.trainingPlace || issue.trainingCenter || '',
    trainingCenter: issue.trainingCenter || '',
    courseName: issue.courseName || '',
    reason: issue.reason || ''
  };
  const sampleKey = [sample.organizer, sample.trainingPlace, sample.trainingCenter, sample.courseName, sample.reason].join('|');
  if (target.sampleKeys.has(sampleKey)) return;
  target.sampleKeys.add(sampleKey);
  target.samples.push(sample);
}

function pushDeliveryDirtyRow(validation, dirtyRow) {
  validation.dirtyRows.push({
    category: dirtyRow.category || '交付数据疑惑',
    reason: dirtyRow.reason || '',
    sourceFile: dirtyRow.sourceFile || '',
    sourceSheet: dirtyRow.sourceSheet || '',
    sourceRow: dirtyRow.sourceRow || '',
    organizer: dirtyRow.organizer || '',
    trainingPlace: dirtyRow.trainingPlace || '',
    trainingCenter: dirtyRow.trainingCenter || '',
    courseName: dirtyRow.courseName || '',
    productLine: dirtyRow.productLine || '',
    rawData: dirtyRow.rawData || {}
  });
}

function buildDeliveryWarnings(validation) {
  const warnings = [];
  if (validation.skippedRows) {
    const example = [
      ...validation.unmatchedCenters.samples,
      ...validation.unmatchedInternalPlaces.samples,
      ...validation.unmatchedCourses.samples
    ][0];
    warnings.push(`未纳入统计 ${validation.skippedRows.toLocaleString('zh-CN')} 条交付记录：培训中心或课程未匹配建设地图。${example ? `示例：${formatIssueSample(example)}` : ''}`);
  }
  if (validation.unmatchedCenters.count) {
    warnings.push(`有 ${validation.unmatchedCenters.count.toLocaleString('zh-CN')} 条记录的培训组织方未匹配建设地图培训中心。示例：${validation.unmatchedCenters.samples.map(formatIssueSample).join('；')}`);
  }
  if (validation.unmatchedInternalPlaces.count) {
    warnings.push(`有 ${validation.unmatchedInternalPlaces.count.toLocaleString('zh-CN')} 条迈瑞组织方记录的培训地点未匹配深圳/武汉/西安/南京四个内部培训中心。示例：${validation.unmatchedInternalPlaces.samples.map(formatIssueSample).join('；')}`);
  }
  if (validation.unmatchedCourses.count) {
    warnings.push(`有 ${validation.unmatchedCourses.count.toLocaleString('zh-CN')} 条记录的课程不在对应建设中心承接范围内。示例：${validation.unmatchedCourses.samples.map(formatIssueSample).join('；')}`);
  }
  if (validation.invalidTrainingTimes) {
    warnings.push(`有 ${validation.invalidTrainingTimes.toLocaleString('zh-CN')} 条已匹配记录的培训结束时间为空或无法识别；记录保留在脏数据中，使用 Time 筛选时不纳入当前结果。`);
  }
  if (validation.skippedSheets.length) {
    warnings.push(...validation.skippedSheets.slice(0, 5));
  }
  return warnings;
}

function formatIssueSample(issue) {
  return [
    issue.organizer ? `组织方「${issue.organizer}」` : '',
    issue.trainingPlace ? `地点「${issue.trainingPlace}」` : '',
    issue.courseName ? `课程「${issue.courseName}」` : '',
    issue.reason ? `原因：${issue.reason}` : ''
  ].filter(Boolean).join('，');
}

function finalizeDeliveryValidation(validation) {
  return {
    totalRows: validation.totalRows,
    matchedRows: validation.totalRows - validation.skippedRows,
    skippedRows: validation.skippedRows,
    internalRows: validation.internalRows,
    channelRows: validation.channelRows,
    invalidTrainingTimes: validation.invalidTrainingTimes,
    unmatchedCenters: finalizeIssueBucket(validation.unmatchedCenters),
    unmatchedInternalPlaces: finalizeIssueBucket(validation.unmatchedInternalPlaces),
    unmatchedCourses: finalizeIssueBucket(validation.unmatchedCourses),
    skippedSheets: validation.skippedSheets,
    dirtyRowCount: validation.dirtyRows.length
  };
}

function finalizeIssueBucket(bucket) {
  return {
    count: bucket.count,
    samples: bucket.samples
  };
}

function findHeaderRowIndex(matrix) {
  let bestMatch = { rowIndex: -1, score: 0 };
  const scanLimit = Math.min(matrix.length, 12);
  for (let rowIndex = 0; rowIndex < scanLimit; rowIndex += 1) {
    const normalizedRow = matrix[rowIndex].map(normalizeHeaderText);
    let score = 0;
    for (const aliases of Object.values(NORMALIZED_ALIAS_LOOKUP)) {
      if (aliases.some((alias) => normalizedRow.includes(alias))) score += 1;
    }
    if (score > bestMatch.score) bestMatch = { rowIndex, score };
  }
  return bestMatch.score >= 4 ? bestMatch.rowIndex : -1;
}

function buildColumnIndexMap(headerRow) {
  const normalizedHeaders = headerRow.map(normalizeHeaderText);
  const columnIndexMap = {};
  Object.entries(NORMALIZED_ALIAS_LOOKUP).forEach(([field, aliases]) => {
    const matchedIndex = normalizedHeaders.findIndex((header) => aliases.includes(header));
    if (matchedIndex !== -1) columnIndexMap[field] = matchedIndex;
  });
  return columnIndexMap;
}

function scaleProgress(ratio, start, end) {
  const safeRatio = Math.max(0, Math.min(1, ratio || 0));
  return start + (end - start) * safeRatio;
}

function pickFirstMeaningfulValue(row, columnIndexMap, fields) {
  const candidates = fields.map((field) => readCellValue(row, columnIndexMap[field])).filter(Boolean);
  return candidates[0] || '';
}

function buildRawRowObject(headerRow, row) {
  const rawData = {};
  const maxLength = Math.max(headerRow?.length || 0, row?.length || 0);
  for (let index = 0; index < maxLength; index += 1) {
    const header = readPlainRawCell(headerRow?.[index]) || `列${index + 1}`;
    rawData[header] = readPlainRawCell(row?.[index]);
  }
  return rawData;
}

function readCellValue(row, index) {
  if (index === undefined || index === null || index >= row.length) return '';
  const value = row[index];
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return dayjs(value).format('YYYY-MM-DD HH:mm:ss');
  return readPlainRawCell(value);
}

function readPlainRawCell(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return dayjs(value).format('YYYY-MM-DD HH:mm:ss');
  return String(value).replace(/\u00a0/g, ' ').trim();
}

function formatDateCell(value) {
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : String(value || '').trim();
}

function isBlankRow(row) {
  return !row?.some((cell) => String(cell ?? '').trim());
}

function normalizeHeaderText(value) {
  return String(value ?? '')
    .replace(/\s+/g, '')
    .replace(/[()（）【】\[\]\/\\_-]/g, '')
    .trim();
}
