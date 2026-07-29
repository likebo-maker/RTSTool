import * as XLSX from 'xlsx';

export function exportTrainingRecords(records, fileName = '中国区培训中心交付筛选结果.xlsx') {
  const rows = records.map((record) => ({
    培训中心: record.trainingCenter,
    中心类型: record.centerType,
    学员姓名: record.studentName || '',
    学员账号: record.studentAccount || '',
    大区: record.mappedRegion,
    省份: record.province || '',
    城市: record.city || record.trainingCenterCity,
    产线: record.productLine,
    课程名称: record.courseName,
    原始课程名称: record.sourceCourseName || '',
    所属方案: record.sourceCoursePlan || '',
    培训周期: record.trainingCycle,
    培训结算时间: record.settlementDate || '',
    培训组织方: record.organizer,
    培训地点: record.trainingLocation,
    培训类型: record.trainingType,
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

export function exportTrainingConstructionRecords(records, fileName = '中国区培训中心建设筛选结果.xlsx') {
  const rows = records.map((record) => ({
    培训中心: record.centerName,
    中心类型: record.centerType,
    大区: record.mappedRegion,
    省份: record.province,
    城市: record.city,
    分公司: record.branchName,
    地址: record.address,
    产线: record.productLine,
    课程名称: record.courseName,
    子产线: record.subProductLine,
    机型大类: record.modelCategory,
    授予资质类型: record.qualificationType,
    需要样机型号: record.requiredModel,
    讲师: record.teacherText,
    产线来源: record.productLineSource,
    来源Sheet: record.sourceSheet,
    来源行: record.sourceRow
  }));
  writeWorkbook(rows, '建设明细', fileName);
}

export function exportTrainingConstructionCenterRecords(centerName, records) {
  const safeCenter = String(centerName || '培训中心').replace(/[\\/:*?"<>|]/g, '_');
  exportTrainingConstructionRecords(records, `${safeCenter}_建设明细.xlsx`);
}

export function exportTrainingDirtyRecords(dirtyRows, fileName = '中国区培训中心交付脏数据.xlsx') {
  exportDirtyRows(dirtyRows, fileName);
}

export function exportTrainingConstructionDirtyRecords(dirtyRows, fileName = '中国区培训中心建设脏数据.xlsx') {
  exportDirtyRows(dirtyRows, fileName);
}

function exportDirtyRows(dirtyRows, fileName) {
  const rows = (dirtyRows || []).map((row) => {
    const rawData = row.rawData || {};
    const rawColumns = Object.fromEntries(
      Object.entries(rawData).map(([key, value]) => [`原始_${key}`, value])
    );
    return {
      脏数据类型: row.category || '',
      疑惑原因: row.reason || '',
      来源文件: row.sourceFile || '',
      来源Sheet: row.sourceSheet || '',
      来源行号: row.sourceRow || '',
      培训中心: row.trainingCenter || row.centerName || '',
      培训组织方: row.organizer || '',
      培训地点: row.trainingPlace || '',
      课程名称: row.courseName || '',
      产线: row.productLine || '',
      ...rawColumns
    };
  });
  writeWorkbook(rows, '脏数据明细', fileName);
}

function writeWorkbook(rows, sheetName, fileName) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}
