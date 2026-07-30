export const GLOBAL_POINT_SOURCE_COLORS = {
  China: '#22d3ee',
  International: '#a78bfa',
  Combined: '#22c55e'
};

export const GLOBAL_DELIVERY_COMBINED_COLORS = {
  core: '#22d3ee',
  ring: '#a78bfa'
};

export function isChinaInternationalCombinedPoint(point = {}) {
  return point.markerComposition === 'china-international';
}

/**
 * Resolves the point color used by the merged world map.
 *
 * Most merged maps are colored by data source. A snapshot can override that
 * rule with markerColor when a business dimension, such as training center
 * type, needs to control the visual encoding.
 */
export function resolveGlobalPointColor(point = {}) {
  if (isChinaInternationalCombinedPoint(point)) {
    return GLOBAL_DELIVERY_COMBINED_COLORS.core;
  }
  return point.markerColor ||
    GLOBAL_POINT_SOURCE_COLORS[point.source] ||
    GLOBAL_POINT_SOURCE_COLORS.International;
}

/**
 * Uses a point-specific diameter when the snapshot provides one, otherwise
 * preserves the common fixed diameter used by existing merged maps.
 */
export function resolveGlobalPointSymbolSize(point = {}, fallbackSize = 18) {
  const markerSize = Number(point.markerSize);
  return Number.isFinite(markerSize) && markerSize > 0 ? markerSize : fallbackSize;
}

/**
 * Builds one legend model for both source-colored and business-colored maps.
 * Training construction points supply markerLegend* fields; service and
 * delivery points continue to fall back to their China/International source.
 */
export function buildGlobalPointLegend(points = []) {
  const usesBusinessLegend = points.some((point) => point.markerLegendKey || point.markerLegendLabel);
  const legendItems = new Map();

  points.forEach((point) => {
    const key = usesBusinessLegend
      ? point.markerLegendKey || `source-${point.source || 'International'}`
      : point.source || 'International';
    const name = usesBusinessLegend
      ? point.markerLegendLabel || `${point.source || 'International'} Data`
      : point.source || 'International';
    const color = resolveGlobalPointColor(point);
    const existing = legendItems.get(key);
    if (existing) {
      existing.count += 1;
      return;
    }
    legendItems.set(key, { key, name, color, count: 1 });
  });

  return [...legendItems.values()];
}
