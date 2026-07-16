import * as echarts from 'echarts';
import ChinaGeoJson from 'china-map-geojson/lib/china';

const OFFLINE_CHINA_MAP_NAME = 'offline-china';
let mapRegistered = false;

const TONE_COLORS = {
  good: '#52c41a',
  warning: '#faad14',
  critical: '#ff4d4f',
  info: '#38bdf8'
};

export function initOfflineChinaMap(element) {
  registerOfflineChinaMap();
  return echarts.init(element);
}

export function registerOfflineChinaMap() {
  if (mapRegistered) return;
  echarts.registerMap(OFFLINE_CHINA_MAP_NAME, ChinaGeoJson);
  mapRegistered = true;
}

export function buildOfflineChinaMapOption({
  points = [],
  regionGroups = [],
  selectedRegions = [],
  focusedKey = '',
  selectedKey = '',
  labelKeys = [],
  pointKeyResolver = (point) => point.branch,
  pointNameResolver = pointKeyResolver,
  pointToneResolver = () => 'good',
  pointMetricResolver = () => 0,
  tooltipFormatter = defaultTooltipFormatter,
  labelMetricResolver = pointMetricResolver
} = {}) {
  const labelKeySet = new Set(labelKeys || []);
  const mapPoints = (points || [])
    .filter((point) => Array.isArray(point.coords) && point.coords.length >= 2)
    .map((point) => {
      const key = pointKeyResolver(point);
      const tone = pointToneResolver(point);
      const metric = pointMetricResolver(point);
      const isFocused = Boolean(focusedKey && key === focusedKey);
      const isSelected = Boolean(selectedKey && key === selectedKey);
      const shouldLabel = isFocused || labelKeySet.has(key);
      return {
        name: pointNameResolver(point),
        value: [Number(point.coords[0]), Number(point.coords[1]), Number(metric || 0)],
        point,
        key,
        tone,
        metric,
        isFocused,
        isSelected,
        labelText: shouldLabel ? `${pointNameResolver(point)}\n${labelMetricResolver(point)}` : ''
      };
    });

  return {
    backgroundColor: 'transparent',
    animationDurationUpdate: 300,
    tooltip: {
      trigger: 'item',
      confine: true,
      appendToBody: false,
      backgroundColor: 'transparent',
      borderWidth: 0,
      padding: 0,
      formatter(params) {
        return tooltipFormatter(params.data?.point || null);
      }
    },
    geo: {
      map: OFFLINE_CHINA_MAP_NAME,
      roam: true,
      zoom: 1.18,
      center: [104.195397, 35.86166],
      scaleLimit: { min: 0.9, max: 8 },
      layoutCenter: ['50%', '52%'],
      layoutSize: '98%',
      regions: buildGeoRegions(regionGroups, selectedRegions),
      itemStyle: {
        areaColor: 'rgba(15, 31, 56, 0.88)',
        borderColor: 'rgba(103, 232, 255, 0.24)',
        borderWidth: 0.8
      },
      emphasis: {
        label: {
          show: false
        },
        itemStyle: {
          areaColor: 'rgba(0, 212, 255, 0.2)',
          borderColor: 'rgba(103, 232, 255, 0.62)'
        }
      },
      select: {
        disabled: true
      }
    },
    series: [
      {
        name: '地图点位',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        zlevel: 4,
        data: mapPoints,
        symbol: 'circle',
        symbolSize(value, params) {
          const metric = Number(params.data?.metric || value?.[2] || 0);
          const baseSize = Math.min(24, Math.max(10, 8 + Math.log10(metric + 10) * 4));
          if (params.data?.isFocused) return baseSize + 8;
          if (params.data?.isSelected) return baseSize + 5;
          return baseSize;
        },
        rippleEffect: {
          brushType: 'stroke',
          scale: 3.4,
          period: 4
        },
        itemStyle: {
          color(params) {
            return TONE_COLORS[params.data?.tone] || TONE_COLORS.good;
          },
          borderColor: 'rgba(255,255,255,0.82)',
          borderWidth: 1.2,
          shadowBlur: 14,
          shadowColor(params) {
            return TONE_COLORS[params.data?.tone] || TONE_COLORS.good;
          }
        },
        label: {
          show: true,
          formatter(params) {
            return params.data?.labelText || '';
          },
          position: 'top',
          distance: 14,
          color: '#f7fbff',
          fontSize: 12,
          fontWeight: 800,
          lineHeight: 17,
          backgroundColor: 'rgba(5, 18, 34, 0.86)',
          borderColor: 'rgba(103, 232, 255, 0.56)',
          borderWidth: 1,
          borderRadius: 8,
          padding: [7, 10],
          shadowBlur: 18,
          shadowColor: 'rgba(0, 212, 255, 0.22)'
        },
        emphasis: {
          scale: 1.35,
          label: {
            show: true
          }
        }
      }
    ]
  };
}

export function showOfflineMapTooltip(chartInstance, points, pointKeyResolver, focusedKey) {
  if (!chartInstance || !focusedKey) return;
  const index = (points || [])
    .filter((point) => Array.isArray(point.coords) && point.coords.length >= 2)
    .findIndex((point) => pointKeyResolver(point) === focusedKey);
  if (index < 0) return;
  chartInstance.dispatchAction({
    type: 'showTip',
    seriesIndex: 0,
    dataIndex: index
  });
}

export function hideOfflineMapTooltip(chartInstance) {
  chartInstance?.dispatchAction({ type: 'hideTip' });
}

export function escapeMapHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildGeoRegions(regionGroups, selectedRegions) {
  const selectedSet = new Set(selectedRegions || []);
  const provinceStyles = new Map();
  (regionGroups || []).forEach((region) => {
    const isActive = !selectedSet.size || selectedSet.has(region.name);
    (region.adcodes || []).forEach((adcode) => {
      const provinceName = resolveProvinceName(adcode);
      if (!provinceName) return;
      if (provinceStyles.has(provinceName) && !selectedSet.has(region.name)) return;
      provinceStyles.set(provinceName, {
        name: provinceName,
        itemStyle: {
          areaColor: isActive ? region.fill : 'rgba(255,255,255,0.025)',
          borderColor: isActive ? region.color : 'rgba(255,255,255,0.08)',
          borderWidth: isActive ? 1 : 0.6
        },
        emphasis: {
          itemStyle: {
            areaColor: isActive ? region.hoverFill || region.fill : 'rgba(255,255,255,0.06)',
            borderColor: isActive ? region.color : 'rgba(255,255,255,0.12)'
          }
        }
      });
    });
  });
  return [...provinceStyles.values()];
}

function resolveProvinceName(adcode) {
  const prefix = String(adcode || '').slice(0, 2);
  const feature = ChinaGeoJson.features?.find((item) => String(item.properties?.id || item.id || '').padStart(2, '0') === prefix);
  return feature?.properties?.name || '';
}

function defaultTooltipFormatter(point) {
  if (!point) return '';
  return `<div class="qualification-map-info-window"><strong>${escapeMapHtml(point.name || point.branch || '')}</strong></div>`;
}
