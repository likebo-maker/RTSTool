import geoConfig from '../data/internationalTrainingCenterGeoConfig.json';
import {
  getGlobalRegionGroups,
  normalizeGlobalKey,
  resolveGlobalCountry,
  resolveGlobalSecondaryRegion,
  resolveWorldCountryCapital
} from './globalRegionMap';
import {
  canonicalizeInternationalTrainingConstructionProductLine,
  withInternationalTrainingConstructionDataQuality
} from './internationalTrainingConstructionDataQuality';

export const UNSPECIFIED_COURSE = 'COURSE NOT MAINTAINED';
export const UNSPECIFIED_PRODUCT_LINE = 'PRODUCT LINE NOT MAINTAINED';

const LEGACY_UNSPECIFIED_COURSE = '未维护课程';
const LEGACY_UNSPECIFIED_PRODUCT_LINE = '未维护产线';

const CENTER_TYPE_STYLES = {
  'Global TC': { key: 'global', label: 'Global TC', color: '#22c55e' },
  'Region TC': { key: 'region', label: 'Region TC', color: '#a78bfa' },
  'Country TC': { key: 'channel-country', label: 'Channel / Country TC', color: '#22d3ee' },
  'Channel TC': { key: 'channel-country', label: 'Channel / Country TC', color: '#22d3ee' },
  'Center type not maintained': { key: 'not-maintained', label: 'Center Type Not Maintained', color: '#64748b' }
};
const OTHER_CENTER_TYPE_COLORS = ['#f59e0b', '#f472b6', '#60a5fa', '#14b8a6', '#fb7185', '#c084fc'];

const CHINA_REGION = {
  name: 'CHINA',
  color: '#60a5fa',
  countries: ['China']
};

const countryAliasMap = new Map(
  Object.entries(geoConfig.countryAliases || {}).map(([alias, country]) => [normalizeGlobalKey(alias), country])
);
const cityCoordinateMap = new Map(
  (geoConfig.cityCoordinates || []).map((item) => [
    buildCityKey(item.country, item.city),
    {
      city: item.city,
      coords: item.coords,
      source: 'city-coordinate'
    }
  ])
);

export function getInternationalTrainingRegionGroups() {
  return [...getGlobalRegionGroups(), CHINA_REGION];
}

export function resolveInternationalTrainingCountry(value) {
  const direct = resolveGlobalCountry(value);
  if (direct) return direct;
  const alias = countryAliasMap.get(normalizeGlobalKey(value));
  return alias ? resolveGlobalCountry(alias) || alias : '';
}

export function resolveInternationalTrainingRegion(value) {
  const raw = String(value || '').trim();
  if (normalizeGlobalKey(raw) === 'china') return 'CHINA';
  return resolveGlobalSecondaryRegion(raw);
}

export function resolveInternationalTrainingLocation({ country, city }) {
  const rawCity = String(city || '').trim();
  const cityLocation = rawCity ? cityCoordinateMap.get(buildCityKey(country, rawCity)) : null;
  if (cityLocation) {
    return {
      coords: [...cityLocation.coords],
      city: rawCity,
      displayLocation: rawCity,
      source: cityLocation.source
    };
  }

  const capital = resolveWorldCountryCapital(country);
  if (!capital?.coords) return null;
  return {
    coords: [...capital.coords],
    city: rawCity,
    displayLocation: rawCity || capital.capital,
    capital: capital.capital,
    source: rawCity ? 'capital-fallback' : 'capital-coordinate'
  };
}

export function splitCertifiedProductLines(value) {
  const items = String(value || '')
    .split(';#')
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? [...new Set(items)] : [UNSPECIFIED_PRODUCT_LINE];
}

export function splitCertifiedCourses(value) {
  const items = String(value || '')
    .split(/;#\d+(?:;#|$)/)
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? [...new Set(items)] : [UNSPECIFIED_COURSE];
}

export function normalizeInternationalTrainingConstructionRecord(record) {
  const contract = classifyInternationalTrainingContractStatus(record?.contractStatus);
  return withInternationalTrainingConstructionDataQuality({
    ...record,
    productLine: formatInternationalConstructionProductLine(record?.productLine),
    courseName: formatInternationalConstructionCourse(record?.courseName),
    centerType: formatInternationalConstructionCenterType(record?.centerType),
    contractStatus: contract.contractStatus,
    isSigned: contract.isSigned,
    isInternal: contract.isInternal,
    auditResult: formatInternationalConstructionAuditResult(record?.auditResult)
  });
}

export function normalizeInternationalTrainingConstructionRecords(records) {
  return (records || []).map(normalizeInternationalTrainingConstructionRecord);
}

export function formatInternationalConstructionProductLine(value) {
  const raw = String(value || '').trim();
  const normalized = raw === LEGACY_UNSPECIFIED_PRODUCT_LINE ? UNSPECIFIED_PRODUCT_LINE : raw || UNSPECIFIED_PRODUCT_LINE;
  return canonicalizeInternationalTrainingConstructionProductLine(normalized);
}

export function formatInternationalConstructionCourse(value) {
  const raw = String(value || '').trim();
  return raw === LEGACY_UNSPECIFIED_COURSE ? UNSPECIFIED_COURSE : raw || UNSPECIFIED_COURSE;
}

export function formatInternationalConstructionContractStatus(value) {
  return translateKnownValue(value, {
    已签约: 'Signed',
    待签约: 'Pending Contract',
    未签约: 'Unsigned'
  }, 'Status not maintained');
}

export function classifyInternationalTrainingContractStatus(value) {
  const raw = String(value || '').trim();
  const normalized = normalizeGlobalKey(raw);
  // The source workbook uses NA for a Mindray-owned center. It is neither a
  // signed channel center nor an unsigned channel center, so classify it first.
  const isInternal = normalized === 'na' || normalized === 'internalmindray';
  const contractStatus = isInternal ? 'Internal (Mindray)' : formatInternationalConstructionContractStatus(raw);
  return {
    contractStatus,
    isSigned: contractStatus === 'Signed',
    isInternal
  };
}

export function formatInternationalConstructionAuditResult(value) {
  return translateKnownValue(value, {
    通过: 'Approved',
    不通过: 'Not Approved',
    待审核: 'Pending Review'
  }, 'Result not maintained');
}

export function formatInternationalConstructionCenterType(value) {
  return translateKnownValue(value, {
    内部: 'Internal TC',
    内部培训中心: 'Internal TC',
    渠道: 'Channel TC',
    渠道培训中心: 'Channel TC',
    渠道TC: 'Channel TC'
  }, 'Center type not maintained');
}

export function getInternationalTrainingCenterTypeStyle(value) {
  const centerType = formatInternationalConstructionCenterType(value);
  if (CENTER_TYPE_STYLES[centerType]) return CENTER_TYPE_STYLES[centerType];
  const colorIndex = stableTextHash(centerType) % OTHER_CENTER_TYPE_COLORS.length;
  return {
    key: `other-${normalizeGlobalKey(centerType) || colorIndex}`,
    label: centerType,
    color: OTHER_CENTER_TYPE_COLORS[colorIndex]
  };
}

export function buildInternationalTrainingCenterTypeLegend(centerTypes) {
  const legendByKey = new Map();
  (centerTypes || []).forEach((centerType) => {
    const style = getInternationalTrainingCenterTypeStyle(centerType);
    if (!legendByKey.has(style.key)) legendByKey.set(style.key, style);
  });
  return [...legendByKey.values()];
}

function translateKnownValue(value, translations, fallback) {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (translations[raw]) return translations[raw];
  return /[\u4e00-\u9fff]/u.test(raw) ? fallback : raw;
}

function buildCityKey(country, city) {
  return `${normalizeGlobalKey(country)}|${normalizeGlobalKey(city)}`;
}

function stableTextHash(value) {
  return [...String(value || '')].reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0, 0);
}
