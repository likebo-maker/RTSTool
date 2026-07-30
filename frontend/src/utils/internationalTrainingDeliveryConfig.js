import geoConfig from '../data/internationalTrainingDeliveryGeoConfig.json';
import {
  normalizeGlobalKey,
  resolveWorldCountryCapital
} from './globalRegionMap';
import {
  getInternationalTrainingRegionGroups,
  resolveInternationalTrainingCountry,
  resolveInternationalTrainingRegion
} from './internationalTrainingConstructionConfig';
import { normalizeTrainingTimeRecord } from './trainingTime';

export const UNMAPPED_PRODUCT_LINE = 'UNMAPPED PRODUCT LINE';

const locationCountryMap = new Map(
  Object.entries(geoConfig.locationCountries || {}).map(([location, country]) => [normalizeGlobalKey(location), country])
);
const productLineMap = new Map(
  Object.entries(geoConfig.productLineMappings || {}).map(([product, productLine]) => [normalizeGlobalKey(product), productLine])
);

export function getInternationalTrainingDeliveryRegionGroups() {
  return getInternationalTrainingRegionGroups();
}

export function resolveInternationalTrainingDeliveryRegion(value) {
  return resolveInternationalTrainingRegion(value);
}

export function resolveInternationalTrainingDeliveryProductLine(value) {
  return productLineMap.get(normalizeGlobalKey(value)) || UNMAPPED_PRODUCT_LINE;
}

export function normalizeInternationalTrainingDeliveryRecord(record) {
  const trainingCenter = String(record?.trainingLocation || record?.organizer || '').trim();
  return normalizeTrainingTimeRecord({
    ...record,
    // Training Location is the delivery center name. Preserve the old source
    // organizer separately for traceability, but never use it to split map dots.
    organizer: trainingCenter,
    sourceOrganizer: record?.sourceOrganizer || record?.organizer || '',
    pointKey: normalizeGlobalKey(trainingCenter)
  });
}

export function normalizeInternationalTrainingDeliveryRecords(records) {
  return (records || []).map(normalizeInternationalTrainingDeliveryRecord);
}

export function resolveInternationalTrainingDeliveryLocation({ trainingLocation, constructionRecords = [] }) {
  const rawLocation = String(trainingLocation || '').trim();
  if (!rawLocation) return null;

  // Prefer the construction map because its center name supplies the governed
  // country, city, and offline coordinates. The country-capital rule remains a
  // fallback for locations that are intentionally maintained as country names.
  const constructionCenter = findConstructionCenter(rawLocation, constructionRecords);
  if (constructionCenter) {
    return {
      country: constructionCenter.country,
      secondaryRegion: constructionCenter.secondaryRegion,
      city: constructionCenter.city || '',
      capital: constructionCenter.capital || '',
      displayLocation: constructionCenter.displayLocation || constructionCenter.city || constructionCenter.capital || constructionCenter.country,
      coords: [...constructionCenter.coords],
      geoSource: 'construction-center',
      matchedCenterName: constructionCenter.centerName
    };
  }

  const configuredCountry = locationCountryMap.get(normalizeGlobalKey(rawLocation));
  const country = resolveInternationalTrainingCountry(configuredCountry || rawLocation);
  const capital = resolveWorldCountryCapital(country);
  if (!country || !capital?.coords) return null;
  return {
    country,
    city: '',
    capital: capital.capital || country,
    displayLocation: capital.capital || country,
    coords: [...capital.coords],
    geoSource: 'local-country-capital',
    matchedCenterName: ''
  };
}

function findConstructionCenter(trainingLocation, constructionRecords) {
  const locationKey = normalizeGlobalKey(trainingLocation);
  return (constructionRecords || []).find((record) => {
    if (!Array.isArray(record?.coords) || record.coords.length < 2) return false;
    return normalizeGlobalKey(record.centerName) === locationKey;
  }) || null;
}
