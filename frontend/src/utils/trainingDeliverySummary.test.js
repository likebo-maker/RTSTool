import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildTrainingDeliveryRegionStats,
  buildTrainingDeliverySourceLegendItem
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
