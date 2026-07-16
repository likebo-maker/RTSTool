import * as XLSX from 'xlsx';
import {
  INTERNAL_TRAINING_CENTERS,
  normalizeCenterName,
  normalizeCourseName,
  normalizeProductLine,
  resolveProductLineByCourse,
  resolveTrainingCenterLocation
} from './trainingConstructionConfig';

const SHEET_NAMES = {
  base: '渠道培训中心基础信息',
  channel: '渠道承接方案信息',
  internal: '内部承接',
  standard: '课程标准-国内'
};

const HEADER_ALIASES = {
  centerName: ['培训中心全称', '培训中心名称', '渠道培训中心'],
  branch: ['分公司', '所属分公司'],
  excelRegion: ['区域', '大区'],
  level: ['渠道商等级'],
  classroom: ['培训中心教室信息', '教室信息'],
  sampleModel: ['培训样机说明', '样机'],
  address: ['培训中心地址', '地址'],
  phone: ['培训中心电话', '电话'],
  contact: ['培训中心培训对接人', '对接人'],
  courseName: ['已授权课程方案', '授权面授课程', '课程方案', '课程名称'],
  productLine: ['主产线', '产品线', '产线'],
  subProductLine: ['子产线'],
  orderCourseName: ['课程名称下单使用', '课程名称（下单使用）', '课程名称'],
  modelCategory: ['机型大类'],
  qualificationType: ['训后授予的资质类型'],
  requiredModel: ['需要的样机型号'],
  remark: ['备注']
};

const NORMALIZED_ALIASES = Object.fromEntries(
  Object.entries(HEADER_ALIASES).map(([key, aliases]) => [key, aliases.map(normalizeHeaderText)])
);

export async function parseTrainingConstructionFiles(fileList, options = {}) {
  const files = Array.from(fileList || []).filter(Boolean);
  if (!files.length) {
    throw new Error('请先选择培训中心建设表');
  }

  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
  const records = [];
  const validation = createValidationState();

  for (const [fileIndex, file] of files.entries()) {
    onProgress?.({
      step: 'read',
      status: 'processing',
      progress: scaleProgress(fileIndex / Math.max(files.length, 1), 0, 20),
      message: `正在读取培训中心建设表：${file.name}`
    });

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
    const missingSheets = Object.values(SHEET_NAMES).filter((sheetName) => !workbook.Sheets[sheetName]);
    if (missingSheets.length) {
      throw new Error(`导入失败：缺少必要 Sheet「${missingSheets.join('、')}」。`);
    }

    onProgress?.({
      step: 'structure',
      status: 'processing',
      progress: scaleProgress((fileIndex + 0.25) / Math.max(files.length, 1), 20, 42),
      message: '正在识别课程标准和渠道中心基础信息'
    });

    const courseCatalog = parseCourseStandardSheet(workbook.Sheets[SHEET_NAMES.standard], file.name, validation);
    const baseCenters = parseBaseCenterSheet(workbook.Sheets[SHEET_NAMES.base], file.name, validation);

    onProgress?.({
      step: 'clean',
      status: 'processing',
      progress: scaleProgress((fileIndex + 0.5) / Math.max(files.length, 1), 42, 70),
      message: '正在生成内部培训中心承接关系'
    });

    records.push(...parseInternalSheet(workbook.Sheets[SHEET_NAMES.internal], {
      fileName: file.name,
      courseCatalog,
      validation
    }));

    onProgress?.({
      step: 'result',
      status: 'processing',
      progress: scaleProgress((fileIndex + 0.75) / Math.max(files.length, 1), 70, 92),
      message: '正在生成渠道培训中心承接关系'
    });

    records.push(...parseChannelSheet(workbook.Sheets[SHEET_NAMES.channel], {
      fileName: file.name,
      baseCenters,
      courseCatalog,
      validation
    }));
  }

  const dedupedRecords = dedupeCenterCourseRecords(records, validation);
  if (!dedupedRecords.length) {
    throw new Error('导入失败：未识别到可展示的培训中心承接关系。');
  }
  inspectDedupedRecords(dedupedRecords, validation);

  onProgress?.({ step: 'read', status: 'completed', progress: 20, message: 'Excel 文件读取完成' });
  onProgress?.({ step: 'structure', status: 'completed', progress: 42, message: '表格结构识别完成' });
  onProgress?.({ step: 'clean', status: 'completed', progress: 70, message: '培训中心与课程关系清洗完成' });
  onProgress?.({ step: 'result', status: 'completed', progress: 100, message: '建设地图数据已生成' });

  return {
    records: dedupedRecords,
    warnings: buildWarnings(validation),
    validation: finalizeValidation(validation),
    importedAt: new Date().toISOString()
  };
}

function parseCourseStandardSheet(worksheet, fileName, validation) {
  const matrix = sheetToMatrix(worksheet);
  const headerRowIndex = findHeaderRowIndex(matrix, ['productLine', 'orderCourseName']);
  if (headerRowIndex === -1) {
    throw new Error(`${fileName} / ${SHEET_NAMES.standard} 未识别到「主产线」和「课程名称（下单使用）」表头。`);
  }

  const columnIndexMap = buildColumnIndexMap(matrix[headerRowIndex]);
  const lineMap = {};
  const metaMap = {};
  for (let rowIndex = headerRowIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex];
    if (isBlankRow(row)) continue;
    const courseName = readCellValue(row, columnIndexMap.orderCourseName);
    if (!courseName) continue;
    const normalizedCourse = normalizeCourseName(courseName);
    const productLine = normalizeProductLine(readCellValue(row, columnIndexMap.productLine));
    if (metaMap[normalizedCourse]) {
      validation.duplicateStandardCourses.add(courseName);
    }
    if (!productLine) {
      validation.standardCoursesMissingProductLine.add(courseName);
    }
    if (productLine) {
      lineMap[normalizedCourse] = productLine;
    }
    metaMap[normalizedCourse] = {
      courseName,
      productLine: productLine || '未匹配产线',
      subProductLine: readCellValue(row, columnIndexMap.subProductLine),
      modelCategory: readCellValue(row, columnIndexMap.modelCategory),
      qualificationType: readCellValue(row, columnIndexMap.qualificationType),
      requiredModel: readCellValue(row, columnIndexMap.requiredModel),
      remark: readCellValue(row, columnIndexMap.remark),
      sourceFile: fileName,
      sourceSheet: SHEET_NAMES.standard,
      sourceRow: rowIndex + 1
    };
  }
  validation.courseCatalogCount = Object.keys(metaMap).length;
  return { lineMap, metaMap };
}

function parseBaseCenterSheet(worksheet, fileName, validation) {
  const matrix = sheetToMatrix(worksheet);
  const headerRowIndex = findHeaderRowIndex(matrix, ['centerName', 'address']);
  if (headerRowIndex === -1) {
    throw new Error(`${fileName} / ${SHEET_NAMES.base} 未识别到「培训中心全称」和「培训中心地址」表头。`);
  }

  const columnIndexMap = buildColumnIndexMap(matrix[headerRowIndex]);
  const centerMap = new Map();
  for (let rowIndex = headerRowIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex];
    if (isBlankRow(row)) continue;
    const centerName = readCellValue(row, columnIndexMap.centerName);
    if (!centerName) continue;
    const address = readCellValue(row, columnIndexMap.address);
    const normalizedCenter = normalizeCenterName(centerName);
    if (centerMap.has(normalizedCenter)) {
      validation.duplicateBaseCenters.add(centerName);
    }
    if (!address) {
      validation.baseCentersMissingAddress.add(centerName);
    }
    const location = resolveTrainingCenterLocation({
      address,
      city: readCellValue(row, columnIndexMap.branch),
      centerName
    });
    if (!location.coords) {
      validation.baseCentersUnmatchedLocation.add(centerName);
    }
    const baseCenter = {
      centerName,
      centerType: '渠道',
      branchName: readCellValue(row, columnIndexMap.branch),
      excelRegion: readCellValue(row, columnIndexMap.excelRegion),
      level: readCellValue(row, columnIndexMap.level),
      classroom: readCellValue(row, columnIndexMap.classroom),
      sampleModel: readCellValue(row, columnIndexMap.sampleModel),
      address,
      phone: readCellValue(row, columnIndexMap.phone),
      contact: readCellValue(row, columnIndexMap.contact),
      city: location.city,
      province: location.province,
      mappedRegion: location.region,
      coords: location.coords,
      geoSource: location.geoSource,
      sourceFile: fileName,
      sourceSheet: SHEET_NAMES.base,
      sourceRow: rowIndex + 1
    };
    centerMap.set(normalizedCenter, baseCenter);
  }
  validation.baseCenterCount = centerMap.size;
  return centerMap;
}

function parseInternalSheet(worksheet, { fileName, courseCatalog, validation }) {
  const matrix = sheetToMatrix(worksheet);
  const internalCourses = matrix
    .map((row) => row.map(readPlainCell).find(Boolean) || '')
    .filter(Boolean);
  validation.internalCourseCount = internalCourses.length;

  const records = [];
  INTERNAL_TRAINING_CENTERS.forEach((center) => {
    const location = resolveTrainingCenterLocation({
      address: center.address,
      city: center.city,
      centerName: center.name
    });
    internalCourses.forEach((courseName, courseIndex) => {
      const courseMeta = resolveCourseMeta(courseName, courseCatalog, validation);
      if (!courseMeta.standardCourseKey) {
        validation.internalNonStandardCourses.add(courseName);
      }
      records.push({
        id: `${fileName}-${SHEET_NAMES.internal}-${center.name}-${courseIndex + 1}`,
        centerName: center.name,
        centerType: '内部',
        branchName: center.city,
        excelRegion: '',
        level: '内部培训基地',
        classroom: '',
        sampleModel: '',
        address: center.address,
        phone: '',
        contact: '',
        city: location.city,
        province: location.province,
        mappedRegion: location.region,
        coords: location.coords,
        geoSource: location.geoSource,
        courseName,
        courseKey: normalizeCourseName(courseName),
        standardCourseKey: courseMeta.standardCourseKey,
        standardCourseName: courseMeta.standardCourseName,
        productLine: courseMeta.productLine,
        productLineSource: courseMeta.source,
        subProductLine: courseMeta.subProductLine,
        modelCategory: courseMeta.modelCategory,
        qualificationType: courseMeta.qualificationType,
        requiredModel: courseMeta.requiredModel,
        teachers: ['内部培训中心'],
        teacherText: '内部培训中心',
        sourceFile: fileName,
        sourceSheet: SHEET_NAMES.internal,
        sourceRow: courseIndex + 1
      });
    });
  });
  return records;
}

function parseChannelSheet(worksheet, { fileName, baseCenters, courseCatalog, validation }) {
  const matrix = sheetToMatrix(worksheet);
  const headerRowIndex = findHeaderRowIndex(matrix, ['centerName', 'courseName']);
  if (headerRowIndex === -1) {
    throw new Error(`${fileName} / ${SHEET_NAMES.channel} 未识别到「培训中心全称」和「已授权课程方案」表头。`);
  }

  const columnIndexMap = buildColumnIndexMap(matrix[headerRowIndex]);
  const teacherIndexes = matrix[headerRowIndex]
    .map((header, index) => ({ header: normalizeHeaderText(header), index }))
    .filter(({ header }) => header.includes('课程讲师') || header.includes('渠道讲师'))
    .map(({ index }) => index);
  if (!teacherIndexes.length) {
    validation.teacherColumnMissing = true;
  }

  const records = [];
  for (let rowIndex = headerRowIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex];
    if (isBlankRow(row)) continue;
    const centerName = readCellValue(row, columnIndexMap.centerName);
    const courseName = readCellValue(row, columnIndexMap.courseName);
    if (!centerName || !courseName) {
      validation.channelRowsMissingRequiredFields += 1;
      pushExample(validation.channelRowsMissingRequiredExamples, `第 ${rowIndex + 1} 行缺少${!centerName ? '培训中心' : ''}${!centerName && !courseName ? '和' : ''}${!courseName ? '课程' : ''}`);
      continue;
    }

    const baseCenter = baseCenters.get(normalizeCenterName(centerName));
    if (!baseCenter) {
      validation.missingBaseCenters.add(centerName);
      continue;
    }
    if (!baseCenter.coords) {
      validation.unmatchedAddressCenters.add(centerName);
      continue;
    }

    const teachers = teacherIndexes
      .map((index) => readCellValue(row, index))
      .flatMap(splitTeacherText)
      .filter(Boolean);
    if (!teachers.length) {
      validation.missingTeacherRows += 1;
    }

    const courseMeta = resolveCourseMeta(courseName, courseCatalog, validation);
    if (!courseMeta.standardCourseKey) {
      validation.channelNonStandardCourses.add(courseName);
    }
    records.push({
      id: `${fileName}-${SHEET_NAMES.channel}-${rowIndex + 1}`,
      ...baseCenter,
      courseName,
      courseKey: normalizeCourseName(courseName),
      standardCourseKey: courseMeta.standardCourseKey,
      standardCourseName: courseMeta.standardCourseName,
      productLine: courseMeta.productLine,
      productLineSource: courseMeta.source,
      subProductLine: courseMeta.subProductLine,
      modelCategory: courseMeta.modelCategory,
      qualificationType: courseMeta.qualificationType,
      requiredModel: courseMeta.requiredModel,
      teachers,
      teacherText: teachers.length ? teachers.join('、') : '讲师信息暂未维护',
      sourceFile: fileName,
      sourceSheet: SHEET_NAMES.channel,
      sourceRow: rowIndex + 1
    });
  }
  return records;
}

function resolveCourseMeta(courseName, courseCatalog, validation) {
  const courseKey = normalizeCourseName(courseName);
  const standardMeta = courseCatalog.metaMap[courseKey];
  const lineResult = resolveProductLineByCourse(courseName, courseCatalog.lineMap);
  if (lineResult.source === '本地补充配置') {
    validation.localLineMappedCourses.add(courseName);
  }
  if (lineResult.source === '未匹配') {
    validation.unmatchedLineCourses.add(courseName);
  }
  return {
    standardCourseKey: standardMeta ? courseKey : '',
    standardCourseName: standardMeta?.courseName || '',
    productLine: lineResult.productLine,
    source: lineResult.source,
    subProductLine: standardMeta?.subProductLine || '',
    modelCategory: standardMeta?.modelCategory || '',
    qualificationType: standardMeta?.qualificationType || '',
    requiredModel: standardMeta?.requiredModel || ''
  };
}

function dedupeCenterCourseRecords(records, validation) {
  const recordMap = new Map();
  records.forEach((record) => {
    const key = `${normalizeCenterName(record.centerName)}|${record.courseKey}`;
    if (recordMap.has(key)) {
      validation.duplicateCenterCourseRows += 1;
      pushExample(validation.duplicateCenterCourseExamples, `${record.centerName}｜${record.courseName}`);
      return;
    }
    recordMap.set(key, record);
  });
  return [...recordMap.values()];
}

function createValidationState() {
  return {
    baseCenterCount: 0,
    courseCatalogCount: 0,
    internalCourseCount: 0,
    rawCourseNameCount: 0,
    standardMatchedCourseCount: 0,
    missingBaseCenters: new Set(),
    unmatchedAddressCenters: new Set(),
    unmatchedLineCourses: new Set(),
    localLineMappedCourses: new Set(),
    missingTeacherRows: 0,
    duplicateStandardCourses: new Set(),
    standardCoursesMissingProductLine: new Set(),
    duplicateBaseCenters: new Set(),
    baseCentersMissingAddress: new Set(),
    baseCentersUnmatchedLocation: new Set(),
    internalNonStandardCourses: new Set(),
    channelNonStandardCourses: new Set(),
    nonStandardCourses: new Set(),
    teacherColumnMissing: false,
    channelRowsMissingRequiredFields: 0,
    channelRowsMissingRequiredExamples: [],
    duplicateCenterCourseRows: 0,
    duplicateCenterCourseExamples: []
  };
}

function finalizeValidation(validation) {
  return {
    baseCenterCount: validation.baseCenterCount,
    courseCatalogCount: validation.courseCatalogCount,
    internalCourseCount: validation.internalCourseCount,
    rawCourseNameCount: validation.rawCourseNameCount,
    standardMatchedCourseCount: validation.standardMatchedCourseCount,
    missingBaseCenters: [...validation.missingBaseCenters],
    unmatchedAddressCenters: [...validation.unmatchedAddressCenters],
    unmatchedLineCourses: [...validation.unmatchedLineCourses],
    localLineMappedCourses: [...validation.localLineMappedCourses],
    missingTeacherRows: validation.missingTeacherRows,
    duplicateStandardCourses: [...validation.duplicateStandardCourses],
    standardCoursesMissingProductLine: [...validation.standardCoursesMissingProductLine],
    duplicateBaseCenters: [...validation.duplicateBaseCenters],
    baseCentersMissingAddress: [...validation.baseCentersMissingAddress],
    baseCentersUnmatchedLocation: [...validation.baseCentersUnmatchedLocation],
    internalNonStandardCourses: [...validation.internalNonStandardCourses],
    channelNonStandardCourses: [...validation.channelNonStandardCourses],
    nonStandardCourses: [...validation.nonStandardCourses],
    teacherColumnMissing: validation.teacherColumnMissing,
    channelRowsMissingRequiredFields: validation.channelRowsMissingRequiredFields,
    channelRowsMissingRequiredExamples: validation.channelRowsMissingRequiredExamples,
    duplicateCenterCourseRows: validation.duplicateCenterCourseRows,
    duplicateCenterCourseExamples: validation.duplicateCenterCourseExamples
  };
}

function inspectDedupedRecords(records, validation) {
  const rawCourseNames = new Set();
  const standardCourseKeys = new Set();
  const nonStandardCourses = new Set();

  records.forEach((record) => {
    if (record.courseName) rawCourseNames.add(record.courseName);
    if (record.standardCourseKey) {
      standardCourseKeys.add(record.standardCourseKey);
    } else if (record.courseName) {
      nonStandardCourses.add(record.courseName);
    }
  });

  validation.rawCourseNameCount = rawCourseNames.size;
  validation.standardMatchedCourseCount = standardCourseKeys.size;
  validation.nonStandardCourses = nonStandardCourses;
}

function buildWarnings(validation) {
  const warnings = [];
  if (validation.rawCourseNameCount > validation.courseCatalogCount) {
    warnings.push(`原始承接课程名去重 ${validation.rawCourseNameCount} 门，大于课程标准 ${validation.courseCatalogCount} 门；顶部「覆盖标准课程」仅统计命中标准课表的 ${validation.standardMatchedCourseCount} 门。`);
  }
  if (validation.nonStandardCourses.size) {
    warnings.push(`有 ${validation.nonStandardCourses.size} 门承接课程未命中课程标准，未计入「覆盖标准课程」。示例：${[...validation.nonStandardCourses].slice(0, 8).join('、')}`);
  }
  if (validation.duplicateCenterCourseRows) {
    warnings.push(`已跳过 ${validation.duplicateCenterCourseRows} 条重复中心-课程承接关系，避免重复计数。示例：${validation.duplicateCenterCourseExamples.slice(0, 5).join('、')}`);
  }
  if (validation.channelRowsMissingRequiredFields) {
    warnings.push(`渠道承接方案中有 ${validation.channelRowsMissingRequiredFields} 行缺少培训中心或课程，已跳过。示例：${validation.channelRowsMissingRequiredExamples.slice(0, 5).join('、')}`);
  }
  if (validation.duplicateStandardCourses.size) {
    warnings.push(`课程标准中存在 ${validation.duplicateStandardCourses.size} 门重复课程名，后出现的记录会覆盖前面的同名标准。示例：${[...validation.duplicateStandardCourses].slice(0, 5).join('、')}`);
  }
  if (validation.standardCoursesMissingProductLine.size) {
    warnings.push(`课程标准中有 ${validation.standardCoursesMissingProductLine.size} 门课程缺少或无法识别主产线。示例：${[...validation.standardCoursesMissingProductLine].slice(0, 5).join('、')}`);
  }
  if (validation.duplicateBaseCenters.size) {
    warnings.push(`基础信息表中存在 ${validation.duplicateBaseCenters.size} 个重复培训中心名称，后出现的基础信息会覆盖前面的同名记录。示例：${[...validation.duplicateBaseCenters].slice(0, 5).join('、')}`);
  }
  if (validation.baseCentersMissingAddress.size) {
    warnings.push(`基础信息表中有 ${validation.baseCentersMissingAddress.size} 个培训中心缺少地址，可能无法在离线地图定位。示例：${[...validation.baseCentersMissingAddress].slice(0, 5).join('、')}`);
  }
  if (validation.baseCentersUnmatchedLocation.size) {
    warnings.push(`基础信息表中有 ${validation.baseCentersUnmatchedLocation.size} 个培训中心无法通过地址/城市/名称匹配离线地图。示例：${[...validation.baseCentersUnmatchedLocation].slice(0, 5).join('、')}`);
  }
  if (validation.missingBaseCenters.size) {
    warnings.push(`未纳入展示 ${validation.missingBaseCenters.size} 个渠道培训中心：渠道方案中存在，但基础信息表未维护。示例：${[...validation.missingBaseCenters].slice(0, 5).join('、')}`);
  }
  if (validation.unmatchedAddressCenters.size) {
    warnings.push(`未纳入展示 ${validation.unmatchedAddressCenters.size} 个渠道培训中心：基础信息缺少地址或地址无法匹配离线地图。示例：${[...validation.unmatchedAddressCenters].slice(0, 5).join('、')}`);
  }
  if (validation.unmatchedLineCourses.size) {
    warnings.push(`存在 ${validation.unmatchedLineCourses.size} 门课程未匹配到 IVD/MIS/PMLS 产线，请后续补充课程标准。示例：${[...validation.unmatchedLineCourses].slice(0, 5).join('、')}`);
  }
  if (validation.localLineMappedCourses.size) {
    warnings.push(`有 ${validation.localLineMappedCourses.size} 门课程使用本地补充产线映射。示例：${[...validation.localLineMappedCourses].slice(0, 5).join('、')}`);
  }
  if (validation.teacherColumnMissing) {
    warnings.push('渠道承接方案中未识别到课程讲师/渠道讲师列，讲师相关统计可能为空。');
  }
  if (validation.missingTeacherRows) {
    warnings.push(`有 ${validation.missingTeacherRows} 条渠道承接关系未维护讲师，中心讲师统计会低估。`);
  }
  return warnings;
}

function findHeaderRowIndex(matrix, requiredFields) {
  let bestMatch = { rowIndex: -1, score: 0 };
  const scanLimit = Math.min(matrix.length, 16);
  for (let rowIndex = 0; rowIndex < scanLimit; rowIndex += 1) {
    const columnIndexMap = buildColumnIndexMap(matrix[rowIndex]);
    const score = Object.keys(columnIndexMap).length;
    const requiredMatched = requiredFields.every((field) => columnIndexMap[field] !== undefined);
    if (requiredMatched && score > bestMatch.score) {
      bestMatch = { rowIndex, score };
    }
  }
  return bestMatch.rowIndex;
}

function buildColumnIndexMap(headerRow) {
  const normalizedHeaders = headerRow.map(normalizeHeaderText);
  const columnIndexMap = {};
  Object.entries(NORMALIZED_ALIASES).forEach(([field, aliases]) => {
    const matchedIndex = normalizedHeaders.findIndex((header) => aliases.some((alias) => {
      if (header === alias) return true;
      return field === 'contact' && header.includes(alias);
    }));
    if (matchedIndex !== -1) columnIndexMap[field] = matchedIndex;
  });
  return columnIndexMap;
}

function sheetToMatrix(worksheet) {
  return XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: true });
}

function readCellValue(row, index) {
  if (index === undefined || index === null || index >= row.length) return '';
  return readPlainCell(row[index]);
}

function readPlainCell(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitTeacherText(value) {
  return String(value || '')
    .split(/[、,，;；/]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function pushExample(target, value, limit = 10) {
  if (!value || target.length >= limit || target.includes(value)) return;
  target.push(value);
}

function isBlankRow(row) {
  return !row?.some((cell) => String(cell ?? '').trim());
}

function normalizeHeaderText(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, '')
    .replace(/\s+/g, '')
    .replace(/[()（）【】\[\]\/\\_-]/g, '')
    .trim();
}

function scaleProgress(ratio, start, end) {
  const safeRatio = Math.max(0, Math.min(1, ratio || 0));
  return start + (end - start) * safeRatio;
}
