import assert from 'node:assert/strict';
import test from 'node:test';
import {
  matchesInternationalDeliveryRegion,
  visibleInternationalDeliveryRegions
} from './internationalTrainingDeliveryScope.js';

const VISIBLE_REGIONS = [
  'APAC',
  'CENTRAL ASIA REGION',
  'EUROPE',
  'INDIA',
  'LATAM',
  'MEA',
  'RUSSIA REGION'
];

test('CHINA is hidden while the seven official secondary regions remain selectable', () => {
  assert.deepEqual(
    visibleInternationalDeliveryRegions([...VISIBLE_REGIONS, 'CHINA']),
    VISIBLE_REGIONS
  );
});

test('all seven regions include CHINA only in the overall result', () => {
  assert.equal(
    matchesInternationalDeliveryRegion('CHINA', VISIBLE_REGIONS, VISIBLE_REGIONS),
    true
  );
  assert.equal(
    matchesInternationalDeliveryRegion('APAC', VISIBLE_REGIONS, VISIBLE_REGIONS),
    true
  );
});

test('a narrowed secondary-region selection excludes CHINA', () => {
  assert.equal(
    matchesInternationalDeliveryRegion('CHINA', ['APAC'], VISIBLE_REGIONS),
    false
  );
  assert.equal(
    matchesInternationalDeliveryRegion('APAC', ['APAC'], VISIBLE_REGIONS),
    true
  );
  assert.equal(
    matchesInternationalDeliveryRegion('EUROPE', ['APAC'], VISIBLE_REGIONS),
    false
  );
});
