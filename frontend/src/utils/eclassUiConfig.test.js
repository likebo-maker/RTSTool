import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adaptEclassOptionsForUi,
  buildUiOnlyEclassSchema,
  isUiOnlyEclassProductLine
} from './eclassUiConfig.js';

test('PLMS and MIS are exposed as UI-only connected product lines', () => {
  const options = adaptEclassOptionsForUi({
    product_lines: [
      { key: 'IVD', enabled: true },
      { key: 'PLMS', enabled: false, message: '待开发' },
      { key: 'MIS', enabled: false, message: '待开发' }
    ]
  });

  assert.equal(options.product_lines[0].enabled, true);
  assert.deepEqual(options.product_lines.slice(1), [
    { key: 'PLMS', enabled: true, message: '', ui_only: true },
    { key: 'MIS', enabled: true, message: '', ui_only: true }
  ]);
  assert.equal(isUiOnlyEclassProductLine('plms'), true);
  assert.equal(isUiOnlyEclassProductLine('IVD'), false);
});

test('UI-only schema reuses IVD upload slots without enabling processing', () => {
  const reference = {
    title: 'IVD交流会数据处理',
    description: 'reference window',
    enabled: true,
    upload_slots: [{ key: 'data_folder', required: true }]
  };
  const schema = buildUiOnlyEclassSchema('MIS', 'communication', reference);

  assert.equal(schema.title, 'MIS交流会数据处理');
  assert.equal(schema.enabled, true);
  assert.equal(schema.process_enabled, false);
  assert.equal(schema.ui_only, true);
  assert.deepEqual(schema.upload_slots, reference.upload_slots);
  assert.notEqual(schema.upload_slots[0], reference.upload_slots[0]);
});
