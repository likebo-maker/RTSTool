import test from 'node:test';
import assert from 'node:assert/strict';
import { auditInternationalQualificationDimensions } from './internationalQualificationDataQuality.js';
import { createInternationalQualificationPointSizer } from './internationalQualificationMapSizing.js';

test('product-line values in Sub-line are retained dimension issues', () => {
  const result = auditInternationalQualificationDimensions({
    productLine: 'PMLS',
    subProductLine: 'PMLS',
    modelCategory: 'BeneFusion Series',
    qualificationType: 'MCSR'
  });

  assert.deepEqual(result.invalidFilterFields, ['subProductLine']);
  assert.match(result.issues[0].reason, /Product Line value/);
});

test('other filter dimensions are audited independently', () => {
  const result = auditInternationalQualificationDimensions({
    productLine: 'IVD-A',
    subProductLine: 'A-Biochemistry',
    modelCategory: 'NA',
    qualificationType: 'unexpected'
  });

  assert.deepEqual(result.invalidFilterFields, ['modelCategory', 'qualificationType']);
});

test('map point area grows with valid qualification quantity', () => {
  const points = [
    { validQualifications: 100 },
    { validQualifications: 400 },
    { validQualifications: 1600 }
  ];
  const size = createInternationalQualificationPointSizer(points);
  const small = size(points[0]);
  const medium = size(points[1]);
  const large = size(points[2]);

  assert.ok(small < medium);
  assert.ok(medium < large);
  assert.ok(size(points[1], { selected: true }) > medium);
  assert.ok(size(points[1], { focused: true }) > size(points[1], { selected: true }));
});

test('the shared point sizer supports Training Records', () => {
  const points = [{ recordCount: 4 }, { recordCount: 100 }];
  const size = createInternationalQualificationPointSizer(points, {
    valueField: 'recordCount',
    minimumSize: 12,
    maximumSize: 34
  });

  assert.equal(size(points[0]), 12);
  assert.equal(size(points[1]), 34);
  assert.ok(size(points[1], { selected: true }) > size(points[1]));
});
