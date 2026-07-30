import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterTrainingRecordsByTime,
  normalizeTrainingTime,
  normalizeTrainingTimeRecord,
  resolveTrainingTimeBounds,
  validateTrainingTimeRange
} from './trainingTime.js';

test('normalizes Excel and common training end-time formats', () => {
  assert.equal(normalizeTrainingTime('2026/7/9'), '2026-07-09');
  assert.equal(normalizeTrainingTime('2026年7月9日'), '2026-07-09');
  assert.equal(normalizeTrainingTime(20260709), '2026-07-09');
  assert.equal(normalizeTrainingTime('2026-02-30'), '');
});

test('filters the Time range inclusively and excludes missing end times', () => {
  const records = [
    { id: 1, trainingTime: '2026-01-01' },
    { id: 2, endTime: '2026-06-30 17:30:00' },
    { id: 3, endDate: '2026-07-01' },
    { id: 4, trainingTime: '' }
  ];
  assert.deepEqual(
    filterTrainingRecordsByTime(records, { startDate: '2026-01-01', endDate: '2026-06-30' }).map((record) => record.id),
    [1, 2]
  );
});

test('derives Time bounds from end-time fields and validates the range', () => {
  const bounds = resolveTrainingTimeBounds([
    { trainingTime: '2026-05-01' },
    { rawData: { 培训结束时间: '2025/12/31 18:00:00' } }
  ]);
  assert.deepEqual(bounds, { minimum: '2025-12-31', maximum: '2026-05-01' });
  assert.equal(validateTrainingTimeRange({ startDate: bounds.minimum, endDate: bounds.maximum }).valid, true);
  assert.equal(validateTrainingTimeRange({ startDate: bounds.maximum, endDate: bounds.minimum }).reason, 'reversed');
});

test('prefers training end time over the legacy settlement-date cache field', () => {
  assert.equal(normalizeTrainingTimeRecord({
    endDate: '2026-07-08',
    settlementDate: '2026-07-01'
  }).trainingTime, '2026-07-08');
});
