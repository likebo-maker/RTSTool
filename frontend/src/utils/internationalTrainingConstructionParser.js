import * as XLSX from 'xlsx';
import {
  resolveInternationalTrainingCountry,
  resolveInternationalTrainingLocation,
  resolveInternationalTrainingRegion,
  normalizeInternationalTrainingConstructionRecord,
  splitCertifiedCourses,
  splitCertifiedProductLines
} from './internationalTrainingConstructionConfig';
import { hasWorldCountryGeometry, resolveCountrySecondaryRegion } from './globalRegionMap';

const REQUIRED_FIELDS = ['centerName', 'region', 'country'];
const FIELD_ALIASES = {
  centerName: ['中心名称'],
  region: ['区域'],
  country: ['所在国家'],
  city: ['城市'],
  centerType: ['培训中心类型'],
  applicant: ['迈瑞申请人'],
  contractStatus: ['签约状态'],
  contact: ['培训中心联系人'],
  chairs: ['桌椅数量'],
  samples: ['样机'],
  classrooms: ['教室'],
  capacity: ['能力'],
  channelLecturers: ['渠道讲师'],
  mindrayLecturers: ['迈瑞讲师'],
  auditResult: ['审核结果'],
  remark: ['备注'],
  productLines: ['认证产线'],
  courses: ['认证课程'],
  forecast: ['24年实际/25年预计'],
  authorizationNo: ['Authorization No.']
};

const normalizedAliases = Object.fromEntries(
  Object.entries(FIELD_ALIASES).map(([field, aliases]) => [field, aliases.map(normalizeHeader)])
);

export async function parseInternationalTrainingConstructionFiles(fileList, options = {}) {
  const files = Array.from(fileList || []).filter(Boolean);
  if (!files.length) throw new Error('请选择国际区培训中心建设 Excel 文件。');

  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
  const records = [];
  const dirtyRows = [];
  const warnings = [];
  const locationSummary = { cityCoordinate: 0, capitalCoordinate: 0, capitalFallback: 0 };

  for (const [fileIndex, file] of files.entries()) {
    onProgress?.({
      step: 'read', status: 'processing', progress: scaleProgress(fileIndex / files.length, 0, 24),
      message: `Reading ${file.name}`
    });
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true, dense: true });
    const source = findCenterWorksheet(workbook);
    if (!source) {
      throw new Error(`${file.name} does not contain the required columns: 中心名称、区域、所在国家。`);
    }

    onProgress?.({
      step: 'structure', status: 'processing', progress: scaleProgress((fileIndex + 0.25) / files.length, 24, 42),
      message: `Recognizing center fields in ${source.sheetName}`
    });

    const rows = XLSX.utils.sheet_to_json(source.worksheet, { header: 1, defval: '', raw: false });
    const headers = rows[source.headerRowIndex] || [];
    for (let rowIndex = source.headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex] || [];
      if (isBlankRow(row)) continue;
      if ((rowIndex - source.headerRowIndex) % 200 === 0) {
        onProgress?.({
          step: 'clean', status: 'processing', progress: scaleProgress((rowIndex - source.headerRowIndex) / Math.max(rows.length - source.headerRowIndex, 1), 42, 88),
          message: `Preparing center ${rowIndex - source.headerRowIndex}`
        });
        await yieldToBrowser();
      }

      const rawData = Object.fromEntries(headers.map((header, index) => [String(header || `Column ${index + 1}`).trim(), row[index] ?? '']));
      const values = readValues(row, source.columnIndexes);
      const dirtyContext = { sourceFile: file.name, sourceSheet: source.sheetName, sourceRow: rowIndex + 1, rawData, centerName: values.centerName };
      if (!values.centerName || !values.region || !values.country) {
        dirtyRows.push(createDirtyRow(dirtyContext, 'Missing center name, region, or country.'));
        continue;
      }

      const secondaryRegion = resolveInternationalTrainingRegion(values.region);
      const country = resolveInternationalTrainingCountry(values.country);
      if (!secondaryRegion) {
        dirtyRows.push(createDirtyRow(dirtyContext, `Secondary region was not recognized: ${values.region}`));
        continue;
      }
      if (!country || !hasWorldCountryGeometry(country)) {
        dirtyRows.push(createDirtyRow(dirtyContext, `Country was not recognized in the offline world map: ${values.country}`));
        continue;
      }
      const expectedRegion = resolveCountrySecondaryRegion(country);
      if (secondaryRegion !== 'CHINA' && expectedRegion && expectedRegion !== secondaryRegion) {
        dirtyRows.push(createDirtyRow(dirtyContext, `Country-region mismatch: ${country} belongs to ${expectedRegion}, not ${secondaryRegion}.`));
        continue;
      }

      const location = resolveInternationalTrainingLocation({ country, city: values.city });
      if (!location) {
        dirtyRows.push(createDirtyRow(dirtyContext, `No local city or capital coordinate is configured for ${country}.`));
        continue;
      }
      if (location.source === 'city-coordinate') locationSummary.cityCoordinate += 1;
      if (location.source === 'capital-coordinate') locationSummary.capitalCoordinate += 1;
      if (location.source === 'capital-fallback') locationSummary.capitalFallback += 1;

      const centerBase = {
        id: `${file.name}-${source.sheetName}-${rowIndex + 1}`,
        centerName: values.centerName,
        secondaryRegion,
        country,
        rawCountry: values.country,
        city: values.city,
        displayLocation: location.displayLocation,
        capital: location.capital || '',
        coords: location.coords,
        geoSource: location.source,
        centerType: values.centerType,
        applicant: values.applicant,
        contractStatus: values.contractStatus,
        isSigned: values.contractStatus === '已签约',
        contact: values.contact,
        chairs: values.chairs,
        samples: values.samples,
        classrooms: values.classrooms,
        capacity: values.capacity,
        channelLecturers: values.channelLecturers,
        mindrayLecturers: values.mindrayLecturers,
        auditResult: values.auditResult,
        remark: values.remark,
        forecast: values.forecast,
        authorizationNo: values.authorizationNo,
        sourceFile: file.name,
        sourceSheet: source.sheetName,
        sourceRow: rowIndex + 1,
        rawData
      };
      const products = splitCertifiedProductLines(values.productLines);
      const courses = splitCertifiedCourses(values.courses);
      products.forEach((productLine) => {
        courses.forEach((courseName) => {
          records.push(normalizeInternationalTrainingConstructionRecord({ ...centerBase, productLine, courseName }));
        });
      });
    }
  }

  if (!records.length) throw new Error('No valid international training centers were recognized.');
  if (locationSummary.capitalCoordinate || locationSummary.capitalFallback) {
    warnings.push(`Location source: ${locationSummary.cityCoordinate} city coordinates, ${locationSummary.capitalCoordinate + locationSummary.capitalFallback} capital coordinates.`);
  }
  onProgress?.({ step: 'read', status: 'completed', progress: 24, message: 'Excel files read.' });
  onProgress?.({ step: 'structure', status: 'completed', progress: 42, message: 'Fields recognized.' });
  onProgress?.({ step: 'clean', status: 'completed', progress: 88, message: 'Centers matched to offline coordinates.' });
  onProgress?.({ step: 'chart', status: 'completed', progress: 100, message: 'Map data is ready.' });
  return { records, dirtyRows, warnings, locationSummary, importedAt: new Date().toISOString() };
}

function findCenterWorksheet(workbook) {
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });
    const maxRows = Math.min(rows.length, 12);
    for (let rowIndex = 0; rowIndex < maxRows; rowIndex += 1) {
      const columnIndexes = buildColumnIndexes(rows[rowIndex] || []);
      if (REQUIRED_FIELDS.every((field) => columnIndexes[field] !== undefined)) {
        return { sheetName, worksheet, headerRowIndex: rowIndex, columnIndexes };
      }
    }
  }
  return null;
}

function buildColumnIndexes(headers) {
  const normalizedHeaders = headers.map(normalizeHeader);
  return Object.fromEntries(
    Object.entries(normalizedAliases).map(([field, aliases]) => [field, normalizedHeaders.findIndex((header) => aliases.includes(header))])
      .filter(([, index]) => index >= 0)
  );
}

function readValues(row, columnIndexes) {
  return Object.fromEntries(
    Object.keys(FIELD_ALIASES).map((field) => [field, normalizeText(row[columnIndexes[field]])])
  );
}

function createDirtyRow(context, reason) {
  return { category: 'International training center excluded row', reason, ...context };
}

function normalizeHeader(value) {
  return normalizeText(value).replace(/[\s_\-（）()]/g, '').toLowerCase();
}

function normalizeText(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').replace(/\u3000/g, ' ').trim();
}

function isBlankRow(row) {
  return !(row || []).some((value) => normalizeText(value));
}

function scaleProgress(value, start, end) {
  return Math.min(end, Math.max(start, start + (end - start) * Math.max(0, Math.min(1, value))));
}

function yieldToBrowser() {
  const schedule = typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
    ? window.requestAnimationFrame.bind(window)
    : (callback) => setTimeout(callback, 0);
  return new Promise((resolve) => schedule(resolve));
}
