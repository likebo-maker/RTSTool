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

export function resolveInternationalTrainingDeliveryLocation({ trainingLocation, constructionRecords = [] }) {
  const rawLocation = String(trainingLocation || '').trim();
  if (!rawLocation) return null;

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
