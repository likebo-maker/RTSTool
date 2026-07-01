import * as XLSX from 'xlsx';

export function exportTrainingRecords(records, fileName = '中国区培训覆盖筛选结果.xlsx') {
  const rows = records.map((record) => ({
    学员姓名: record.studentName || '',
    分公司: record.branch,
    大区: record.mappedRegion,
    产线: record.productLine,
    培训周期: record.trainingCycle,
    培训组织方: record.organizer,
    培训中心: record.trainingCenter,
    培训中心城市: record.trainingCenterCity,
    培训地点: record.trainingLocation,
    培训类型: record.trainingType,
    培训名称: record.courseName,
    完成情况: record.trainingResult,
    成绩: record.score,
    讲师: record.lecturer
  }));
  writeWorkbook(rows, '培训明细', fileName);
}

export function exportBranchTrainingRecords(branch, records) {
  const safeBranch = String(branch || '分公司').replace(/[\\/:*?"<>|]/g, '_');
  exportTrainingRecords(records, `${safeBranch}_培训明细.xlsx`);
}

function writeWorkbook(rows, sheetName, fileName) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}
