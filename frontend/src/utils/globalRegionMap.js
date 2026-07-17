import worldCountriesGeo from '../data/worldCountriesGeo.json';
import globalRegionConfig from '../data/globalRegionConfig.json';

const COUNTRY_FEATURES = worldCountriesGeo.features || [];
const WORLD_COUNTRY_BY_KEY = new Map(
  COUNTRY_FEATURES
    .map((feature) => feature?.properties?.name)
    .filter(Boolean)
    .map((name) => [normalizeGlobalKey(name), name])
);

const COUNTRY_ALIAS_MAP = new Map();
const REGION_ALIAS_MAP = new Map();
const COUNTRY_REGION_MAP = new Map();
const COUNTRY_CENTROID_CACHE = new Map();

(globalRegionConfig.countryAliases || []).forEach((item) => {
  if (!item?.alias || !item?.country) return;
  COUNTRY_ALIAS_MAP.set(normalizeGlobalKey(item.alias), item.country);
});

COUNTRY_FEATURES.forEach((feature) => {
  const name = feature?.properties?.name;
  if (name) COUNTRY_ALIAS_MAP.set(normalizeGlobalKey(name), name);
});

Object.entries(globalRegionConfig.regionAliases || {}).forEach(([alias, region]) => {
  if (!alias || !region) return;
  REGION_ALIAS_MAP.set(normalizeGlobalKey(alias), region);
});

(globalRegionConfig.regions || []).forEach((region) => {
  REGION_ALIAS_MAP.set(normalizeGlobalKey(region.name), region.name);
  (region.countries || []).forEach((country) => {
    if (!country || COUNTRY_REGION_MAP.has(country)) return;
    COUNTRY_REGION_MAP.set(country, region.name);
  });
});

export function getGlobalRegionGroups() {
  return globalRegionConfig.regions || [];
}

export function normalizeGlobalKey(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '')
    .trim();
}

export function hasChineseText(value) {
  return /[\u4e00-\u9fff]/u.test(String(value ?? ''));
}

export function resolveGlobalSecondaryRegion(value) {
  const key = normalizeGlobalKey(value);
  return REGION_ALIAS_MAP.get(key) || '';
}

export function resolveGlobalCountry(value) {
  const key = normalizeGlobalKey(value);
  if (!key) return '';
  return COUNTRY_ALIAS_MAP.get(key) || WORLD_COUNTRY_BY_KEY.get(key) || '';
}

export function resolveCountrySecondaryRegion(country) {
  return COUNTRY_REGION_MAP.get(country) || '';
}

export function hasWorldCountryGeometry(country) {
  return Boolean(getWorldCountryFeature(country));
}

export function getWorldCountryFeature(country) {
  const resolvedName = WORLD_COUNTRY_BY_KEY.get(normalizeGlobalKey(country)) || country;
  return COUNTRY_FEATURES.find((feature) => feature?.properties?.name === resolvedName) || null;
}

export function resolveWorldCountryCentroid(country) {
  const feature = getWorldCountryFeature(country);
  if (!feature) return null;
  const name = feature.properties?.name || country;
  if (COUNTRY_CENTROID_CACHE.has(name)) return COUNTRY_CENTROID_CACHE.get(name);
  const centroid = calculateFeatureCentroid(feature);
  COUNTRY_CENTROID_CACHE.set(name, centroid);
  return centroid;
}

function calculateFeatureCentroid(feature) {
  const polygons = extractPolygons(feature?.geometry);
  if (!polygons.length) return null;

  const largest = polygons
    .map((polygon) => {
      const ring = polygon?.[0] || [];
      const bounds = calculateRingBounds(ring);
      const area = Math.max(0, bounds.maxLng - bounds.minLng) * Math.max(0, bounds.maxLat - bounds.minLat);
      return { bounds, area };
    })
    .filter((item) => Number.isFinite(item.area) && item.area > 0)
    .sort((left, right) => right.area - left.area)[0];

  if (!largest) return null;
  return [
    (largest.bounds.minLng + largest.bounds.maxLng) / 2,
    (largest.bounds.minLat + largest.bounds.maxLat) / 2
  ];
}

function extractPolygons(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return [geometry.coordinates || []];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates || [];
  return [];
}

function calculateRingBounds(ring) {
  const bounds = {
    minLng: Infinity,
    maxLng: -Infinity,
    minLat: Infinity,
    maxLat: -Infinity
  };
  (ring || []).forEach((coord) => {
    const lng = Number(coord?.[0]);
    const lat = Number(coord?.[1]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
    bounds.minLng = Math.min(bounds.minLng, lng);
    bounds.maxLng = Math.max(bounds.maxLng, lng);
    bounds.minLat = Math.min(bounds.minLat, lat);
    bounds.maxLat = Math.max(bounds.maxLat, lat);
  });
  return bounds;
}
