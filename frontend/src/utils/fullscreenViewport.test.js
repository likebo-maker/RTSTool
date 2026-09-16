import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateFullscreenFitScale } from './fullscreenViewport.js';

test('keeps the dashboard at its native size when the visible area is sufficient', () => {
  assert.equal(calculateFullscreenFitScale({ width: 2560, height: 1440 }), 1);
  assert.equal(calculateFullscreenFitScale({ width: 1920, height: 1080 }), 1);
});

test('fits the whole dashboard when browser zoom reduces the visible viewport', () => {
  assert.equal(calculateFullscreenFitScale({ width: 1440, height: 810 }), 3 / 4);
  assert.equal(calculateFullscreenFitScale({ width: 1280, height: 720 }), 2 / 3);
  assert.equal(calculateFullscreenFitScale({ width: 960, height: 540 }), 1 / 2);
  assert.equal(calculateFullscreenFitScale({ width: 1920, height: 540 }), 1 / 2);
  assert.equal(calculateFullscreenFitScale({ width: 960, height: 1080 }), 1 / 2);
});

test('returns a safe native scale for incomplete viewport measurements', () => {
  assert.equal(calculateFullscreenFitScale({ width: 0, height: 720 }), 1);
  assert.equal(calculateFullscreenFitScale({ width: 1440, height: Number.NaN }), 1);
  assert.equal(calculateFullscreenFitScale(), 1);
});
