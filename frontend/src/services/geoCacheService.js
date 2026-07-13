const HEADQUARTERS_GEO = {
  city: '深圳',
  lng: 114.0579,
  lat: 22.5431,
  source: 'fallback',
  updated_at: ''
};

export async function batchResolveGeo(locationNames, options = {}) {
  const locations = normalizeLocationList(locationNames);
  if (!locations.length) {
    return {
      items: {},
      summary: createEmptySummary(),
      cachePath: ''
    };
  }

  try {
    const response = await fetch('/api/geo-cache/batch-resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locations,
        allow_geocode: options.allowGeocode !== false
      })
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    return {
      items: normalizeGeoMap(payload.items || {}),
      summary: normalizeSummary(payload.summary),
      cachePath: payload.cache_path || ''
    };
  } catch (error) {
    console.warn('[GeoCache] 批量坐标解析失败，改用前端兜底坐标', error);
    return {
      items: Object.fromEntries(locations.map((location) => [location, buildFallbackGeo()])),
      summary: {
        ...createEmptySummary(),
        total: locations.length,
        fallback: locations.length,
        failed: locations.length
      },
      cachePath: ''
    };
  }
}

export async function loadGeoCache() {
  try {
    const response = await fetch('/api/geo-cache');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    return normalizeGeoMap(payload.items || {});
  } catch (error) {
    console.warn('[GeoCache] 读取坐标缓存失败', error);
    return {};
  }
}

export function normalizeLocationName(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\u3000/g, ' ')
    .trim();
}

export function normalizeLocationList(values) {
  const seen = new Set();
  const result = [];
  (values || []).forEach((value) => {
    const normalized = normalizeLocationName(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    result.push(normalized);
  });
  return result;
}

export function normalizeGeoMap(value) {
  return Object.fromEntries(
    Object.entries(value || {})
      .map(([key, geo]) => [normalizeLocationName(key), normalizeGeoInfo(geo)])
      .filter(([key, geo]) => key && geo)
  );
}

export function normalizeGeoInfo(value) {
  if (!value) return null;
  const lng = Number(value.lng);
  const lat = Number(value.lat);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return {
    city: String(value.city || ''),
    lng,
    lat,
    source: String(value.source || 'manual'),
    updated_at: String(value.updated_at || '')
  };
}

export function resolveGeoFromMap(geoMap, locationName) {
  const normalized = normalizeLocationName(locationName);
  if (!normalized) return null;
  return normalizeGeoInfo(geoMap?.[normalized]);
}

export function buildFallbackGeo(source = 'fallback') {
  return {
    ...HEADQUARTERS_GEO,
    source
  };
}

export function geoInfoToPoint(geoInfo) {
  const geo = normalizeGeoInfo(geoInfo) || buildFallbackGeo();
  return {
    city: geo.city || HEADQUARTERS_GEO.city,
    coords: [geo.lng, geo.lat],
    geoSource: geo.source
  };
}

export function appendGeoSummaryWarning(warnings, summary) {
  const normalized = normalizeSummary(summary);
  const message = `坐标解析结果：命中缓存 ${normalized.cache_hit} 个，新增解析 ${normalized.amap_resolved} 个，归类总部 ${normalized.headquarters} 个，解析失败 ${normalized.failed + normalized.fallback} 个`;
  return [...(warnings || []), message];
}

export function applyPointOffsets(points) {
  const groups = new Map();
  points.forEach((point, index) => {
    const key = coordKey(point.coords);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(index);
  });

  return points.map((point, index) => {
    const indexes = groups.get(coordKey(point.coords)) || [];
    if (indexes.length <= 1) return point;
    const offsetIndex = indexes.indexOf(index);
    return {
      ...point,
      originalCoords: point.originalCoords || point.coords,
      coords: applyPointOffset(point.coords, offsetIndex, indexes.length)
    };
  });
}

export function applyPointOffset(coords, index, total) {
  if (!Array.isArray(coords) || coords.length < 2 || total <= 1) return coords;
  const safeIndex = Math.max(0, index);
  const angle = (Math.PI * 2 * safeIndex) / total;
  const ring = Math.floor(safeIndex / Math.max(total, 1));
  const radius = Math.min(0.35, 0.12 + ring * 0.06 + (total > 8 ? 0.05 : 0));
  return [
    Number((Number(coords[0]) + Math.cos(angle) * radius).toFixed(6)),
    Number((Number(coords[1]) + Math.sin(angle) * radius).toFixed(6))
  ];
}

function coordKey(coords) {
  if (!Array.isArray(coords) || coords.length < 2) return 'invalid';
  return `${Number(coords[0]).toFixed(6)},${Number(coords[1]).toFixed(6)}`;
}

function createEmptySummary() {
  return {
    cache_hit: 0,
    amap_resolved: 0,
    headquarters: 0,
    fallback: 0,
    failed: 0,
    total: 0
  };
}

function normalizeSummary(summary = {}) {
  const empty = createEmptySummary();
  return Object.fromEntries(
    Object.entries(empty).map(([key, fallback]) => [key, Number(summary[key] ?? fallback) || 0])
  );
}
