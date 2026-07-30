import * as XLSX from 'xlsx';
import { hasWorldCountryGeometry } from './globalRegionMap';
import { normalizeTrainingResult } from './trainingStatusNormalizer';
import {
  resolveInternationalTrainingDeliveryLocation,
  normalizeInternationalTrainingDeliveryRecord,
  resolveInternationalTrainingDeliveryProductLine,
  resolveInternationalTrainingDeliveryRegion
} from './internationalTrainingDeliveryConfig';
import { normalizeTrainingTime } from './trainingTime';

const REQUIRED_FIELDS = ['batchId', 'courseName', 'rawProductLine', 'secondaryRegion', 'trainingLocation', 'completion'];
const FIELD_ALIASES = {
  batchId: ['班次ID'],
  organizer: ['培训组织方'],
  target: ['培训对象'],
  trainingType: ['培训类型'],
  trainingMethod: ['培训方式'],
  sourceCenter: ['中心'],
  sourceRegion: ['区域'],
  sourceCountry: ['国家'],
  learnerOrgId: ['学员组织id'],
  learnerOrg: ['学员组织名称'],
  learnerAccount: ['学员账号'],
  learnerName: ['学员姓名'],
  learnerEmail: ['学员邮箱'],
  courseName: ['课程名称'],
  rawProductLine: ['产线'],
  timeZone: ['时区'],
  trainingYear: ['培训年度'],
  trainingMonth: ['培训月份'],
  startDate: ['培训开始日期'],
  endDate: ['培训结束日期'],
  startTime: ['培训开始时间'],
  endTime: ['培训结束时间'],
  durationHours: ['课时'],
  lecturer: ['讲师账号/姓名/组织'],
  secondaryRegion: ['班次所在大区'],
  trainingCenter: ['培训中心'],
  trainingLocation: ['培训地点'],
  score: ['成绩'],
  completion: ['完成情况'],
  trainingSatisfaction: ['满意度-培训'],
  lecturerSatisfaction: ['满意度-讲师'],
  courseSatisfaction: ['满意度-课程'],
  satisfactionScore: ['满意度总分'],
  portalFlowNo: ['portal流程编号'],
  remark: ['总结']
};

const normalizedAliases = Object.fromEntries(
  Object.entries(FIELD_ALIASES).map(([field, aliases]) => [field, aliases.map(normalizeHeader)])
);

export async function parseInternationalTrainingDeliveryFiles(fileList, options = {}) {
  const files = Array.from(fileList || []).filter(Boolean);
  if (!files.length) throw new Error('Select at least one international training delivery Excel file.');
  const constructionRecords = options.constructionRecords || [];
  if (!constructionRecords.length) {
    throw new Error('Import International Training Center Construction data before importing delivery data.');
  }

  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
  const records = [];
  const dirtyRows = [];
  const locationSummary = { constructionCenter: 0, localCountryCapital: 0, unmappedProduct: 0 };

  for (const [fileIndex, file] of files.entries()) {
    onProgress?.({
      step: 'read',
      status: 'processing',
      progress: scaleProgress(fileIndex / files.length, 0, 18),
      message: `Reading ${file.name}`
    });
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true, dense: true });

    for (const [sheetIndex, sheetName] of workbook.SheetNames.entries()) {
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });
      const source = findDeliveryWorksheet(rows);
      if (!source) {
        dirtyRows.push(createDirtyRow({ sourceFile: file.name, sourceSheet: sheetName, sourceRow: 1, rawData: {} }, 'Required delivery fields were not recognized in this sheet.'));
        continue;
      }

      onProgress?.({
        step: 'structure',
        status: 'processing',
        progress: scaleProgress((fileIndex + (sheetIndex + 0.25) / Math.max(workbook.SheetNames.length, 1)) / files.length, 18, 34),
        message: `Recognizing fields in ${sheetName}`
      });

      const headers = rows[source.headerRowIndex] || [];
      const totalRows = Math.max(rows.length - source.headerRowIndex - 1, 1);
      for (let rowIndex = source.headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
        const row = rows[rowIndex] || [];
        if (isBlankRow(row)) continue;
        if ((rowIndex - source.headerRowIndex) % 400 === 0) {
          const progress = (rowIndex - source.headerRowIndex) / totalRows;
          onProgress?.({ step: 'match', status: 'processing', progress: scaleProgress(progress, 34, 76), message: `Matching delivery row ${rowIndex - source.headerRowIndex}` });
          onProgress?.({ step: 'calculate', status: 'processing', progress: scaleProgress(progress, 58, 92), message: 'Calculating delivery metrics' });
          await yieldToBrowser();
        }

        const rawData = Object.fromEntries(headers.map((header, index) => [String(header || `Column ${index + 1}`).trim(), row[index] ?? '']));
        const values = readValues(row, source.columnIndexes);
        const dirtyContext = { sourceFile: file.name, sourceSheet: sheetName, sourceRow: rowIndex + 1, rawData, organizer: values.organizer, trainingLocation: values.trainingLocation };
        const missing = REQUIRED_FIELDS.filter((field) => !values[field]);
        if (missing.length) {
          dirtyRows.push(createDirtyRow(dirtyContext, `Missing required fields: ${missing.join(', ')}.`));
          continue;
        }

        const trainingEndTime = values.endTime || values.endDate;
        const trainingTime = normalizeTrainingTime(trainingEndTime);
        // Time is sourced from Training End Time. A missing value remains a
        // retained data-quality issue; only a date-filtered result excludes it.
        if (!trainingTime) {
          dirtyRows.push(createDirtyRow(
            dirtyContext,
            trainingEndTime
              ? `Training End Time could not be recognized: ${trainingEndTime}.`
              : 'Training End Time is missing.',
            'International training delivery retained Time issue'
          ));
        }

        const secondaryRegion = resolveInternationalTrainingDeliveryRegion(values.secondaryRegion);
        if (!secondaryRegion) {
          dirtyRows.push(createDirtyRow(dirtyContext, `Secondary region was not recognized: ${values.secondaryRegion}.`));
          continue;
        }

        const location = resolveInternationalTrainingDeliveryLocation({ trainingLocation: values.trainingLocation, constructionRecords });
        if (!location || !location.country || !hasWorldCountryGeometry(location.country)) {
          dirtyRows.push(createDirtyRow(dirtyContext, `Training location was not mapped to an offline world country: ${values.trainingLocation}.`));
          continue;
        }

        const productLine = resolveInternationalTrainingDeliveryProductLine(values.rawProductLine);
        if (productLine === 'UNMAPPED PRODUCT LINE') locationSummary.unmappedProduct += 1;
        if (location.geoSource === 'construction-center') locationSummary.constructionCenter += 1;
        if (location.geoSource === 'local-country-capital') locationSummary.localCountryCapital += 1;
        const result = normalizeTrainingResult(values.completion);
        const trainingCycle = resolveTrainingCycle(values);
        // The report's Training Location is the delivery-center identifier.
        // It must be the map label and aggregation key so it stays consistent
        // with the center name maintained by the construction map.
        records.push(normalizeInternationalTrainingDeliveryRecord({
          id: `${file.name}-${sheetName}-${rowIndex + 1}`,
          organizer: values.trainingLocation,
          sourceOrganizer: values.organizer,
          trainingLocation: values.trainingLocation,
          matchedConstructionCenter: location.matchedCenterName || '',
          secondaryRegion,
          country: location.country,
          productLine,
          rawProductLine: values.rawProductLine,
          courseName: values.courseName,
          city: location.city || '',
          capital: location.capital || '',
          displayLocation: location.displayLocation || location.country,
          coords: location.coords,
          geoSource: location.geoSource,
          batchId: values.batchId,
          sessionKey: values.batchId,
          learnerAccount: values.learnerAccount,
          learnerName: values.learnerName,
          learnerOrg: values.learnerOrg,
          learnerEmail: values.learnerEmail,
          trainingType: values.trainingType,
          trainingMethod: values.trainingMethod,
          lecturer: values.lecturer,
          score: values.score,
          completion: result.normalized || values.completion,
          isPass: result.isPass,
          isFail: result.isFail,
          isEffectiveResult: result.isEffective,
          trainingCycle,
          startDate: values.startDate,
          endDate: values.endDate,
          endTime: values.endTime,
          trainingTime,
          durationHours: values.durationHours,
          sourceCountry: values.sourceCountry,
          sourceCenter: values.sourceCenter,
          sourceTrainingCenter: values.trainingCenter,
          sourceRegion: values.sourceRegion,
          timeZone: values.timeZone,
          satisfactionScore: values.satisfactionScore,
          trainingSatisfaction: values.trainingSatisfaction,
          lecturerSatisfaction: values.lecturerSatisfaction,
          courseSatisfaction: values.courseSatisfaction,
          portalFlowNo: values.portalFlowNo,
          remark: values.remark,
          sourceFile: file.name,
          sourceSheet: sheetName,
          sourceRow: rowIndex + 1
        }));
      }
    }
  }

  if (!records.length) throw new Error('No valid international training delivery records were recognized.');
  const warnings = [
    `Location source: ${locationSummary.constructionCenter.toLocaleString('en-US')} records matched construction centers; ${locationSummary.localCountryCapital.toLocaleString('en-US')} records used local country-capital mapping.`
  ];
  if (locationSummary.unmappedProduct) warnings.push(`${locationSummary.unmappedProduct.toLocaleString('en-US')} records use UNMAPPED PRODUCT LINE.`);
  onProgress?.({ step: 'read', status: 'completed', progress: 18, message: 'Excel files read.' });
  onProgress?.({ step: 'structure', status: 'completed', progress: 34, message: 'Delivery fields recognized.' });
  onProgress?.({ step: 'match', status: 'completed', progress: 76, message: 'Locations matched to the offline map.' });
  onProgress?.({ step: 'calculate', status: 'completed', progress: 92, message: 'Delivery metrics calculated.' });
  onProgress?.({ step: 'chart', status: 'completed', progress: 100, message: 'Map and analytics are ready.' });
  return { records, dirtyRows, warnings, locationSummary, importedAt: new Date().toISOString() };
}

function findDeliveryWorksheet(rows) {
  const maxRows = Math.min(rows.length, 12);
  for (let rowIndex = 0; rowIndex < maxRows; rowIndex += 1) {
    const columnIndexes = buildColumnIndexes(rows[rowIndex] || []);
    if (REQUIRED_FIELDS.every((field) => columnIndexes[field] !== undefined)) return { headerRowIndex: rowIndex, columnIndexes };
  }
  return null;
}

function buildColumnIndexes(headers) {
  const normalizedHeaders = headers.map(normalizeHeader);
  return Object.fromEntries(
    Object.entries(normalizedAliases)
      .map(([field, aliases]) => [field, normalizedHeaders.findIndex((header) => aliases.includes(header))])
      .filter(([, index]) => index >= 0)
  );
}

function readValues(row, columnIndexes) {
  return Object.fromEntries(Object.keys(FIELD_ALIASES).map((field) => [field, normalizeText(row[columnIndexes[field]])]));
}

function resolveTrainingCycle(values) {
  const date = values.startDate || values.endDate;
  const dateMatch = String(date || '').match(/(20\d{2})[^0-9]?(\d{1,2})?/);
  if (dateMatch) return `${dateMatch[1]}-${String(Number(dateMatch[2] || 1)).padStart(2, '0')}`;
  const year = String(values.trainingYear || '').match(/20\d{2}/)?.[0] || '';
  const month = String(values.trainingMonth || '').match(/\d{1,2}/)?.[0] || '';
  return year && month ? `${year}-${String(Number(month)).padStart(2, '0')}` : 'Unscheduled';
}

function createDirtyRow(context, reason, category = 'International training delivery excluded row') {
  return { category, reason, ...context };
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
