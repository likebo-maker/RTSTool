import * as XLSX from 'xlsx';

export function exportInternationalTrainingDeliveryRecords(records, fileName = 'international_training_delivery_results.xlsx') {
  writeWorkbook((records || []).map(toExportRow), 'Delivery Details', fileName);
}

export function exportInternationalTrainingDeliveryPointRecords(centerName, records) {
  const safeName = String(centerName || 'training_center').replace(/[\\/:*?"<>|]/g, '_');
  exportInternationalTrainingDeliveryRecords(records, `${safeName}_delivery_details.xlsx`);
}

export function exportInternationalTrainingDeliveryDirtyRows(dirtyRows) {
  const rows = (dirtyRows || []).map((row) => ({
    Category: row.category || '',
    Reason: row.reason || '',
    'Source File': row.sourceFile || '',
    'Source Sheet': row.sourceSheet || '',
    'Source Row': row.sourceRow || '',
    ...(row.rawData || {})
  }));
  writeWorkbook(rows, 'Dirty Rows', 'international_training_delivery_dirty_rows.xlsx');
}

function toExportRow(record) {
  return {
    'Training Center': record.organizer || '',
    'Source Training Organizer': record.sourceOrganizer || '',
    'Training Location': record.trainingLocation || '',
    'Matched Construction Center': record.matchedConstructionCenter || '',
    'Secondary Region': record.secondaryRegion || '',
    Country: record.country || '',
    'Map Location': record.displayLocation || '',
    'Location Source': record.geoSource || '',
    'Product Line': record.productLine || '',
    Course: record.courseName || '',
    'Batch ID': record.batchId || '',
    'Learner Account': record.learnerAccount || '',
    'Learner Name': record.learnerName || '',
    'Learner Organization': record.learnerOrg || '',
    Score: record.score || '',
    Completion: record.completion || '',
    'Start Date': record.startDate || '',
    'End Date': record.endDate || '',
    'Settlement Date': record.settlementDate || '',
    'Duration Hours': record.durationHours || '',
    Lecturer: record.lecturer || '',
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
