import { normalizeTrainingTime } from './trainingTime.js';

export const INTERNATIONAL_TRAINING_DELIVERY_TIME_FIELD = '培训结束日期';

export function resolveInternationalTrainingDeliveryTime(record = {}) {
  return normalizeTrainingTime(
    record?.endDate || record?.rawData?.[INTERNATIONAL_TRAINING_DELIVERY_TIME_FIELD]
  );
}

export function normalizeInternationalTrainingDeliveryTimeRecord(record = {}) {
  return {
    ...record,
    trainingTime: resolveInternationalTrainingDeliveryTime(record)
  };
}
