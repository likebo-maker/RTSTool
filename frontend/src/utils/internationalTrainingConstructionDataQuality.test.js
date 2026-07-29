import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRetainedInternationalTrainingConstructionDirtyRows,
  hasInvalidInternationalTrainingConstructionField,
  INTERNATIONAL_TRAINING_CONSTRUCTION_PRODUCT_LINES,
  isValidInternationalTrainingConstructionProductLine,
  mergeInternationalTrainingConstructionDirtyRows,
  withInternationalTrainingConstructionDataQuality
} from './internationalTrainingConstructionDataQuality.js';
import { buildInternationalTrainingConstructionDirtyExportRows } from './exportInternationalTrainingConstruction.js';

test('international training construction product-line whitelist has exactly four values', () => {
  assert.deepEqual(INTERNATIONAL_TRAINING_CONSTRUCTION_PRODUCT_LINES, ['IVD', 'IVD-A', 'MIS', 'PMLS']);
  assert.equal(isValidInternationalTrainingConstructionProductLine('pmls'), true);
  assert.equal(isValidInternationalTrainingConstructionProductLine('PLMS'), false);
  assert.equal(isValidInternationalTrainingConstructionProductLine('PRODUCT LINE NOT MAINTAINED'), false);
});

test('invalid product line retains record but marks only the filter dimension invalid', () => {
  const record = withInternationalTrainingConstructionDataQuality({
    centerName: 'TC-IN-Example',
    productLine: 'PRODUCT LINE NOT MAINTAINED'
  });

  assert.equal(record.centerName, 'TC-IN-Example');
  assert.equal(hasInvalidInternationalTrainingConstructionField(record, 'productLine'), true);
  assert.equal(record.dataQualityIssues.length, 1);
  assert.match(record.dataQualityIssues[0].reason, /IVD, IVD-A, MIS, or PMLS/);
});

test('legacy invalid records generate one retained full-row dirty item per source row', () => {
  const records = [
    withInternationalTrainingConstructionDataQuality({
      centerName: 'TC-IN-Example',
      productLine: 'PRODUCT LINE NOT MAINTAINED',
      courseName: 'Course A',
      sourceFile: 'centers.xlsx',
      sourceSheet: 'Sheet1',
      sourceRow: 14,
      rawData: { '中心名称': 'TC-IN-Example', '认证产线': '' }
    }),
    withInternationalTrainingConstructionDataQuality({
      centerName: 'TC-IN-Example',
      productLine: 'PRODUCT LINE NOT MAINTAINED',
      courseName: 'Course B',
      sourceFile: 'centers.xlsx',
      sourceSheet: 'Sheet1',
      sourceRow: 14,
      rawData: { '中心名称': 'TC-IN-Example', '认证产线': '' }
    })
  ];

  const dirtyRows = buildRetainedInternationalTrainingConstructionDirtyRows(records);
  assert.equal(dirtyRows.length, 1);
  assert.equal(dirtyRows[0].handling.startsWith('Retained'), true);
  assert.deepEqual(dirtyRows[0].rawData, { '中心名称': 'TC-IN-Example', '认证产线': '' });
});

test('parser and legacy-generated retained dirty rows are de-duplicated', () => {
  const row = {
    sourceFile: 'centers.xlsx',
    sourceSheet: 'Sheet1',
    sourceRow: 14,
    centerName: 'TC-IN-Example',
    affectedFields: ['Product Line']
  };
  const merged = mergeInternationalTrainingConstructionDirtyRows(
    [{ ...row, reason: 'parser reason' }],
    [{ ...row, reason: 'legacy reason' }]
  );
  assert.equal(merged.length, 1);
});

test('dirty export includes handling, affected fields, reason, and every original cell', () => {
  const rows = buildInternationalTrainingConstructionDirtyExportRows([{
    category: 'International training center retained row',
    handling: 'Retained; invalid Product Line is hidden.',
    affectedFields: ['Product Line'],
    reason: 'Invalid Product Line',
    sourceFile: 'centers.xlsx',
    sourceSheet: 'Sheet1',
    sourceRow: 14,
    rawData: {
      '中心名称': 'TC-IN-Example',
      '认证产线': '',
      '备注': 'source note'
    }
  }]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].Handling, 'Retained; invalid Product Line is hidden.');
  assert.equal(rows[0]['Affected Fields'], 'Product Line');
  assert.equal(rows[0]['Original - 中心名称'], 'TC-IN-Example');
  assert.equal(rows[0]['Original - 认证产线'], '');
  assert.equal(rows[0]['Original - 备注'], 'source note');
});
