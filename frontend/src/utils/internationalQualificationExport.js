import * as XLSX from 'xlsx';
import { formatInternationalQualificationStatus } from './internationalQualificationAggregator';

export function exportInternationalQualificationRecords(records, fileName = 'international_service_qualification_results.xlsx') {
  const rows = (records || []).map((record) => ({
    'Employee ID': record.employeeId || '',
    'Employee Name': record.personName || '',
    'Account Status': record.accountStatus || '',
    'Secondary Region': record.secondaryRegion || '',
    Country: record.country || '',
    'Raw Region': record.rawRegion || '',
    Branch: record.rawBranch || '',
    Department: record.departmentName || '',
    'Partner Code': record.partnerCode || '',
    'Partner Name': record.partnerName || '',
    'Product Line': record.productLine || '',
    'Sub-line': record.subProductLine || '',
    'Model Category': record.modelCategory || '',
    'Model Sub-category': record.modelSubCategory || '',
    'Qualification Type': record.qualificationType || '',
    'Qualification Type Code': record.qualificationTypeCode || '',
    'Start Date': record.startDate || '',
    'Expiry Date': record.expiryDate || '',
    'Qualification Status': formatInternationalQualificationStatus(record),
    'Certificate Type': record.certificateType || '',
    'Certificate Status': record.certificateStatus || '',
    'Source File': record.sourceFile || '',
    'Source Sheet': record.sourceSheet || '',
    'Source Row': record.sourceRow || ''
  }));
  writeWorkbook(rows, 'Qualification Details', fileName);
}

export function exportInternationalCountryQualificationRecords(country, records) {
  const safeCountry = String(country || 'country').replace(/[\\/:*?"<>|]/g, '_');
  exportInternationalQualificationRecords(records, `${safeCountry}_qualification_details.xlsx`);
}

export function exportInternationalDirtyRows(dirtyRows, fileName = 'international_service_qualification_dirty_rows.xlsx') {
  const rows = (dirtyRows || []).map((row) => {
    const rawColumns = Object.fromEntries(
      Object.entries(row.rawData || {}).map(([key, value]) => [`Original - ${key}`, value])
    );
    return {
      Category: row.category || '',
      Reason: row.reason || '',
      'Source File': row.sourceFile || '',
      'Source Sheet': row.sourceSheet || '',
      'Source Row': row.sourceRow || '',
      'Raw Region': row.rawRegion || '',
      Branch: row.rawBranch || '',
      Department: row.departmentName || '',
      ...rawColumns
    };
  });
  writeWorkbook(rows, 'Dirty Rows', fileName);
}

function writeWorkbook(rows, sheetName, fileName) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}
