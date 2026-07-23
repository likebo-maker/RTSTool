import * as XLSX from 'xlsx';

export function exportInternationalTrainingConstructionRecords(records, fileName = 'international_training_center_construction_results.xlsx') {
  writeWorkbook((records || []).map(toExportRow), 'Construction Details', fileName);
}

export function exportInternationalTrainingConstructionCenterRecords(centerName, records) {
  const safeName = String(centerName || 'training_center').replace(/[\\/:*?"<>|]/g, '_');
  exportInternationalTrainingConstructionRecords(records, `${safeName}_construction_details.xlsx`);
}

export function exportInternationalTrainingConstructionDirtyRows(dirtyRows, fileName = 'international_training_center_construction_dirty_rows.xlsx') {
  const rows = (dirtyRows || []).map((row) => ({
    Category: row.category || '',
    Reason: row.reason || '',
    'Source File': row.sourceFile || '',
    'Source Sheet': row.sourceSheet || '',
    'Source Row': row.sourceRow || '',
    ...Object.fromEntries(
      Object.entries(row.rawData || {}).map(([key, value]) => [`Original - ${key}`, value])
    )
  }));
  writeWorkbook(rows, 'Dirty Rows', fileName);
}

function toExportRow(record) {
  return {
    'Center Name': record.centerName || '',
    'Secondary Region': record.secondaryRegion || '',
    Country: record.country || '',
    City: record.city || '',
    'Location Source': record.geoSource || '',
    'Center Type': record.centerType || '',
    'Contract Status': record.contractStatus || '',
    'Audit Result': record.auditResult || '',
    'Product Line': record.productLine || '',
    Course: record.courseName || '',
    'Mindray Applicant': record.applicant || '',
    'Center Contact': record.contact || '',
    Chairs: record.chairs || '',
    Samples: record.samples || '',
    Classroom: record.classrooms || '',
    Capacity: record.capacity || '',
    'Channel Lecturers': record.channelLecturers || '',
    'Mindray Lecturers': record.mindrayLecturers || '',
    Forecast: record.forecast || '',
    'Authorization No.': record.authorizationNo || '',
    Remark: record.remark || '',
    'Source File': record.sourceFile || '',
    'Source Sheet': record.sourceSheet || '',
    'Source Row': record.sourceRow || ''
  };
}

function writeWorkbook(rows, sheetName, fileName) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}
