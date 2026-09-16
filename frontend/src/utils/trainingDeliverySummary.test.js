import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildTrainingDeliveryRegionStats,
  buildTrainingDeliverySourceLegendItem,
  findTrainingDeliveryBranchIndex,
  formatChinaTrainingDeliveryLegendText,
  resolveTrainingDeliveryDistributionFocus,
  resolveTrainingDeliveryFocusBranch
} from './trainingDeliverySummary.js';

test('China region legend data uses records and de-duplicated trainees', () => {
  const records = [
    chinaRecord({ studentAccount: 'A001' }),
    chinaRecord({ studentAccount: 'A001' }),
    chinaRecord({ studentAccount: 'A002' })
  ];
  const regionStats = buildTrainingDeliveryRegionStats(records, {
    regionField: 'mappedRegion',
    resolveTraineeKey: (record) => record.studentAccount
  });
  assert.deepEqual(regionStats, [{
    name: '华南大区',
    recordCount: 3,
    traineeCount: 2
  }]);
});

test('international region legend data uses records and de-duplicated trainees', () => {
  const records = [
    internationalRecord({ learnerAccount: 'I001' }),
    internationalRecord({ learnerAccount: 'I001' }),
    internationalRecord({ learnerAccount: 'I002' })
  ];
  const regionStats = buildTrainingDeliveryRegionStats(records, {
    regionField: 'secondaryRegion',
    resolveTraineeKey: (record) => record.learnerAccount
  });
  assert.deepEqual(regionStats, [{
    name: 'APAC',
    recordCount: 3,
    traineeCount: 2
  }]);
});

test('global delivery source legend exposes records and trainees instead of sessions', () => {
  const chinaRecords = [
    chinaRecord({ studentAccount: 'A001' }),
    chinaRecord({ studentAccount: 'A001' })
  ];
  const internationalRecords = [
    internationalRecord({ learnerAccount: 'I001' }),
    internationalRecord({ learnerAccount: 'I002' })
  ];
  const legendItems = [
    buildTrainingDeliverySourceLegendItem(
      'China',
      '#22d3ee',
      chinaRecords,
      ['studentAccount', 'studentName', 'studentOrg']
    ),
    buildTrainingDeliverySourceLegendItem(
      'International',
      '#a78bfa',
      internationalRecords,
      ['learnerAccount', 'learnerName']
    )
  ];
  assert.deepEqual(legendItems.map(({ name, recordCount, traineeCount }) => ({
    name,
    recordCount,
    traineeCount
  })), [
    { name: 'China', recordCount: 2, traineeCount: 1 },
    { name: 'International', recordCount: 2, traineeCount: 2 }
  ]);
  assert.equal('sessionCount' in legendItems[0], false);
});

test('China delivery legend uses the Chinese business terms', () => {
  assert.equal(
    formatChinaTrainingDeliveryLegendText({ recordCount: 1578, traineeCount: 1389 }),
    '培训人次 1,578 · 培训人数 1,389'
  );
});

test('fullscreen delivery focus follows the highlighted ranking row', () => {
  const rows = Array.from({ length: 12 }, (_, index) => ({ branch: `培训中心${index + 1}` }));
  assert.equal(resolveTrainingDeliveryFocusBranch('branch', rows, 10), '培训中心11');
  assert.equal(resolveTrainingDeliveryFocusBranch('failRate', rows, 8), '培训中心9');
  assert.equal(resolveTrainingDeliveryFocusBranch('product', rows, 10), '');
  assert.equal(findTrainingDeliveryBranchIndex(rows, '培训中心11'), 10);
});

test('distribution focus keeps the complete course name for the map detail card', () => {
  const courseName = '生化_BS-2800M系列生化服务资质面授课程';
  assert.deepEqual(
    resolveTrainingDeliveryDistributionFocus('type', [{ name: courseName, value: 197 }], 0),
    {
      key: 'type',
      label: '课程',
      kicker: 'COURSE',
      name: courseName,
      value: 197,
      rank: 1
    }
  );
  assert.equal(resolveTrainingDeliveryDistributionFocus('branch', [], 0), null);
});

function chinaRecord(overrides = {}) {
  return {
    mappedRegion: '华南大区',
    studentAccount: overrides.studentAccount,
    studentName: `Student ${overrides.studentAccount}`,
    studentOrg: 'Mindray'
  };
}

function internationalRecord(overrides = {}) {
  return {
    secondaryRegion: 'APAC',
    learnerAccount: overrides.learnerAccount,
    learnerName: `Learner ${overrides.learnerAccount}`
  };
}
