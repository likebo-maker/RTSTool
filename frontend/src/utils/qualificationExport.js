import * as XLSX from 'xlsx';

export function exportQualificationRecords(records, fileName = '中国区人员服务资质筛选结果.xlsx') {
  const rows = records.map((record) => ({
    姓名: record.personName,
    分公司: record.branch,
    区域: record.region,
    产品线: record.productLine,
    机器型号: record.machineModel,
    服务资质类型: record.qualificationType,
    资质有效期: record.expiryDate,
    资质状态: record.qualificationStatus,
    单位: record.organization,
    来源文件: record.sourceFile,
    来源Sheet: record.sourceSheet
  }));
  writeWorkbook(rows, '资质明细', fileName);
}

export function exportBranchQualificationRecords(branch, records) {
  const safeBranch = String(branch || '分公司').replace(/[\\/:*?"<>|]/g, '_');
  exportQualificationRecords(records, `${safeBranch}_资质详情.xlsx`);
}

function writeWorkbook(rows, sheetName, fileName) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}
