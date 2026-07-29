import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterTrainingRecordsBySettlementDate,
  normalizeTrainingSettlementDate,
  resolveTrainingSettlementDateBounds,
  validateTrainingSettlementDateRange
} from './trainingSettlementDate.js';

test('normalizes Excel and common settlement date formats', () => {
  assert.equal(normalizeTrainingSettlementDate('2026/7/9'), '2026-07-09');
  assert.equal(normalizeTrainingSettlementDate('2026年7月9日'), '2026-07-09');
  assert.equal(normalizeTrainingSettlementDate(20260709), '2026-07-09');
  assert.equal(normalizeTrainingSettlementDate('2026-02-30'), '');
});

test('filters the settlement date range inclusively and excludes missing dates', () => {
  const records = [
    { id: 1, settlementDate: '2026-01-01' },
    { id: 2, settlementDate: '2026-06-30' },
    { id: 3, settlementDate: '2026-07-01' },
    { id: 4, settlementDate: '' }
  ];
  assert.deepEqual(
    filterTrainingRecordsBySettlementDate(records, { startDate: '2026-01-01', endDate: '2026-06-30' }).map((record) => record.id),
    [1, 2]
  );
});

test('derives bounds and validates a non-reversed range', () => {
  const bounds = resolveTrainingSettlementDateBounds([
    { settlementDate: '2026-05-01' },
    { rawData: { 培训结算时间: '2025/12/31' } }
  ]);
  assert.deepEqual(bounds, { minimum: '2025-12-31', maximum: '2026-05-01' });
  assert.equal(validateTrainingSettlementDateRange({ startDate: bounds.minimum, endDate: bounds.maximum }).valid, true);
  assert.equal(validateTrainingSettlementDateRange({ startDate: bounds.maximum, endDate: bounds.minimum }).reason, 'reversed');
});
