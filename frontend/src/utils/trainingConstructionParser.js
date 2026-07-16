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

  const dedupedRecords = dedupeCenterCourseRecords(records);
  if (!dedupedRecords.length) {
    throw new Error('导入失败：未识别到可展示的培训中心承接关系。');
  }

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
    const location = resolveTrainingCenterLocation({
      address,
      city: readCellValue(row, columnIndexMap.branch),
      centerName
    });
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
    centerMap.set(normalizeCenterName(centerName), baseCenter);
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

  const records = [];
  for (let rowIndex = headerRowIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex];
    if (isBlankRow(row)) continue;
    const centerName = readCellValue(row, columnIndexMap.centerName);
    const courseName = readCellValue(row, columnIndexMap.courseName);
    if (!centerName || !courseName) continue;

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
    records.push({
      id: `${fileName}-${SHEET_NAMES.channel}-${rowIndex + 1}`,
      ...baseCenter,
      courseName,
      courseKey: normalizeCourseName(courseName),
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
    productLine: lineResult.productLine,
    source: lineResult.source,
    subProductLine: standardMeta?.subProductLine || '',
    modelCategory: standardMeta?.modelCategory || '',
    qualificationType: standardMeta?.qualificationType || '',
    requiredModel: standardMeta?.requiredModel || ''
  };
}

function dedupeCenterCourseRecords(records) {
  const recordMap = new Map();
  records.forEach((record) => {
    const key = `${normalizeCenterName(record.centerName)}|${record.courseKey}`;
    if (recordMap.has(key)) return;
    recordMap.set(key, record);
  });
  return [...recordMap.values()];
}

function createValidationState() {
  return {
    baseCenterCount: 0,
    courseCatalogCount: 0,
    internalCourseCount: 0,
    missingBaseCenters: new Set(),
    unmatchedAddressCenters: new Set(),
    unmatchedLineCourses: new Set(),
    localLineMappedCourses: new Set(),
    missingTeacherRows: 0
  };
}

function finalizeValidation(validation) {
  return {
    baseCenterCount: validation.baseCenterCount,
    courseCatalogCount: validation.courseCatalogCount,
    internalCourseCount: validation.internalCourseCount,
    missingBaseCenters: [...validation.missingBaseCenters],
    unmatchedAddressCenters: [...validation.unmatchedAddressCenters],
    unmatchedLineCourses: [...validation.unmatchedLineCourses],
    localLineMappedCourses: [...validation.localLineMappedCourses],
    missingTeacherRows: validation.missingTeacherRows
  };
}

function buildWarnings(validation) {
  const warnings = [];
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
