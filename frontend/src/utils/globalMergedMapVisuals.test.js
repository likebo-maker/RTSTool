import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GLOBAL_DELIVERY_COMBINED_COLORS,
  buildGlobalPointLegend,
  isChinaInternationalCombinedPoint,
  resolveGlobalPointColor,
  resolveGlobalPointSymbolSize
} from './globalMergedMapVisuals.js';

test('global merged map honors point-specific qualification diameters', () => {
  assert.equal(resolveGlobalPointSymbolSize({ markerSize: 31 }, 18), 31);
  assert.equal(resolveGlobalPointSymbolSize({}, 18), 18);
  assert.equal(resolveGlobalPointSymbolSize({ markerSize: 0 }, 18), 18);
});

test('global construction legend groups centers by marker business type', () => {
  const points = [
    {
      source: 'China',
      markerLegendKey: 'china-center',
      markerLegendLabel: 'China Training Center',
      markerColor: '#60a5fa'
    },
    {
      source: 'International',
      markerLegendKey: 'international-global',
      markerLegendLabel: 'Global TC',
      markerColor: '#22c55e'
    },
    {
      source: 'International',
      markerLegendKey: 'international-channel-country',
      markerLegendLabel: 'Channel / Country TC',
      markerColor: '#22d3ee'
    },
    {
      source: 'International',
      markerLegendKey: 'international-channel-country',
      markerLegendLabel: 'Channel / Country TC',
      markerColor: '#22d3ee'
    }
  ];

  assert.deepEqual(buildGlobalPointLegend(points), [
    { key: 'china-center', name: 'China Training Center', color: '#60a5fa', count: 1 },
    { key: 'international-global', name: 'Global TC', color: '#22c55e', count: 1 },
    {
      key: 'international-channel-country',
      name: 'Channel / Country TC',
      color: '#22d3ee',
      count: 2
    }
  ]);
  assert.equal(resolveGlobalPointColor(points[1]), '#22c55e');
});

test('service and delivery legends still fall back to data source', () => {
  const legend = buildGlobalPointLegend([
    { source: 'China' },
    { source: 'International' },
    { source: 'International' }
  ]);

  assert.deepEqual(legend, [
    { key: 'China', name: 'China', color: '#22d3ee', count: 1 },
    { key: 'International', name: 'International', color: '#a78bfa', count: 2 }
  ]);
});

test('combined delivery points use a China core and International ring', () => {
  const point = {
    source: 'Combined',
    markerComposition: 'china-international',
    markerColor: '#22c55e'
  };
  assert.equal(isChinaInternationalCombinedPoint(point), true);
  assert.equal(resolveGlobalPointColor(point), GLOBAL_DELIVERY_COMBINED_COLORS.core);
  assert.equal(GLOBAL_DELIVERY_COMBINED_COLORS.ring, '#a78bfa');
  assert.equal(isChinaInternationalCombinedPoint({ source: 'Combined' }), false);
});
