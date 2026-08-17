import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeInternationalTrainingDeliveryTimeRecord,
  resolveInternationalTrainingDeliveryTime
} from './internationalTrainingDeliveryTime.js';

test('international delivery Time uses Training End Date only', () => {
  assert.equal(resolveInternationalTrainingDeliveryTime({
    endDate: '2026-06-17',
    endTime: '18:00'
  }), '2026-06-17');
});

test('cached international records are recalculated from Training End Date', () => {
  assert.deepEqual(normalizeInternationalTrainingDeliveryTimeRecord({
    id: 1,
    endDate: '2026/6/17',
    endTime: '18:00',
    trainingTime: '2025-01-01'
  }), {
    id: 1,
    endDate: '2026/6/17',
    endTime: '18:00',
    trainingTime: '2026-06-17'
  });
});

test('international delivery Time does not fall back to Training End Time', () => {
  assert.equal(resolveInternationalTrainingDeliveryTime({ endTime: '2026-06-17 18:00:00' }), '');
});
