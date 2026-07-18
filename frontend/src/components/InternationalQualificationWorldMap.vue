<template>
  <section class="glass-panel qualification-map-panel">
    <div class="panel-title-row">
      <div>
        <p class="section-kicker">Offline World Distribution</p>
        <h2>International Service Qualification Map</h2>
      </div>
      <span class="status-pill" :class="mapReady ? 'success' : 'warning'">
        {{ mapReady ? 'Offline map ready' : 'Initializing offline map' }}
      </span>
    </div>

    <div class="qualification-map-shell">
      <div ref="chartRef" class="qualification-amap-root"></div>

      <div class="qualification-map-legend">
        <span class="qualification-map-legend-title">Risk Legend</span>
        <div class="qualification-map-legend-row">
          <span class="qualification-map-legend-dot good"></span>
          <span>Normal</span>
        </div>
        <div class="qualification-map-legend-row">
          <span class="qualification-map-legend-dot warning"></span>
          <span>Attention</span>
        </div>
        <div class="qualification-map-legend-row">
          <span class="qualification-map-legend-dot critical"></span>
          <span>High Risk</span>
        </div>
      </div>

      <div class="training-region-legend international-region-legend">
        <span class="qualification-map-legend-title">Secondary Region</span>
        <div
          v-for="item in regionLegendItems"
          :key="item.name"
          class="training-region-legend-row"
          :class="{ muted: item.count === 0 }"
        >
          <span
            class="training-region-legend-dot"
            :style="{ background: item.color, boxShadow: `0 0 10px ${item.color}` }"
          ></span>
          <span class="training-region-legend-name">{{ item.name }}</span>
          <strong>{{ item.count }}</strong>
        </div>
      </div>

      <div v-if="loading" class="qualification-map-overlay">
        <LoaderCircle class="spin" :size="24" />
        <span>Loading qualification map...</span>
      </div>
      <div v-else-if="errorMessage" class="qualification-map-overlay error">
        <MapPinned :size="24" />
        <span>{{ errorMessage }}</span>
      </div>
      <div v-else-if="!points.length" class="qualification-map-overlay">
        <MapPinned :size="24" />
        <span>{{ emptyText }}</span>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts';
import { LoaderCircle, MapPinned } from 'lucide-vue-next';
import worldCountriesGeo from '../data/worldCountriesGeo.json';
import { getGlobalRegionGroups } from '../utils/globalRegionMap';
import { MAP_POINT_SYMBOL_SIZE } from '../utils/offlineChinaMap';

const props = defineProps({
  points: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  active: {
    type: Boolean,
    default: true
  },
  fullscreenActive: {
    type: Boolean,
    default: false
  },
  emptyText: {
    type: String,
    default: 'No matching international qualification data. Please adjust filters.'
  },
  selectedCountry: {
    type: String,
    default: ''
  },
  focusedCountry: {
    type: String,
    default: ''
  },
  selectedRegions: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['select-country']);

const WORLD_MAP_NAME = 'international-offline-world';
const chartRef = ref(null);
const mapReady = ref(false);
const errorMessage = ref('');
let chartInstance = null;
let registered = false;
let previousFocusIndex = -1;

const globalRegions = computed(() => getGlobalRegionGroups());
const worldCountryNames = computed(() => (worldCountriesGeo.features || [])
  .map((feature) => feature?.properties?.name)
  .filter(Boolean));
const regionColorMap = computed(() => new Map(globalRegions.value.map((region) => [region.name, region.color])));
const countryRegionMap = computed(() => {
  const map = new Map();
  globalRegions.value.forEach((region) => {
    (region.countries || []).forEach((country) => {
      map.set(country, region.name);
    });
  });
  return map;
});

const regionLegendItems = computed(() => {
  const counts = new Map(globalRegions.value.map((region) => [region.name, 0]));
  props.points.forEach((point) => {
    counts.set(point.secondaryRegion, (counts.get(point.secondaryRegion) || 0) + 1);
  });
  return globalRegions.value.map((region) => ({
    name: region.name,
    color: region.color,
    count: counts.get(region.name) || 0
  }));
});

onMounted(async () => {
  window.addEventListener('resize', handleResize);
  await nextTick();
  initChart();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  disposeChart();
});

watch(
  () => props.points,
  () => renderChart(),
  { deep: true }
);

watch(
  () => props.selectedCountry,
  () => applyFocus()
);

watch(
  () => props.focusedCountry,
  () => applyFocus()
);

watch(
  () => props.selectedRegions,
  () => renderChart(),
  { deep: true }
);

watch(
  () => props.loading,
  () => renderChart()
);

watch(
  () => props.active,
  async (isActive) => {
    if (!isActive) return;
    await nextTick();
    renderChart();
    chartInstance?.resize();
  }
);

watch(
  () => props.fullscreenActive,
  async () => {
    await nextTick();
    handleResize();
  }
);

function initChart() {
  if (!chartRef.value) return;
  try {
    registerWorldMap();
    chartInstance = echarts.init(chartRef.value);
    chartInstance.on('click', handleChartClick);
    mapReady.value = true;
    renderChart();
  } catch (error) {
    errorMessage.value = error.message || 'Offline world map failed to initialize.';
  }
}

function registerWorldMap() {
  if (registered) return;
  echarts.registerMap(WORLD_MAP_NAME, worldCountriesGeo);
  registered = true;
}

function renderChart() {
  if (!chartInstance || props.loading) return;
  chartInstance.setOption(buildMapOption(), true);
  chartInstance.resize();
  previousFocusIndex = -1;
  applyFocus();
  requestAnimationFrame(() => {
    chartInstance?.resize();
    applyFocus();
  });
}

function buildMapOption() {
  const scatterData = props.points
    .filter((point) => Array.isArray(point.coords) && point.coords.length >= 2)
    .map((point) => ({
      name: point.country,
      value: [point.coords[0], point.coords[1], point.validQualifications],
      ...point,
      itemStyle: {
        color: getRiskColor(point.riskLevel),
        borderColor: '#e0f2fe',
        borderWidth: 1.2,
        shadowBlur: 14,
        shadowColor: getRiskColor(point.riskLevel)
      }
    }));

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      borderWidth: 0,
      backgroundColor: 'rgba(8, 13, 30, 0.94)',
      textStyle: { color: '#e2e8f0' },
      formatter: (params) => {
        if (params.seriesType !== 'effectScatter') return params.name || '';
        const data = params.data || {};
        return [
          `<strong>${data.country}</strong>`,
          `Secondary Region: ${data.secondaryRegion || '-'}`,
          `Capital: ${data.capital || '-'}`,
          `Certified Engineers: ${data.totalPeople || 0}`,
          `Valid Qualifications: ${data.validQualifications || 0}`,
          `Expired: ${data.expiredQualifications || 0}`,
          `Risk: ${data.riskLevel || '-'}`
        ].join('<br/>');
      }
    },
    geo: {
      map: WORLD_MAP_NAME,
      roam: true,
      zoom: 1.18,
      center: [18, 18],
      silent: false,
      label: { show: false },
      itemStyle: {
        areaColor: 'rgba(15, 34, 61, 0.72)',
        borderColor: 'rgba(56, 189, 248, 0.28)',
        borderWidth: 0.65
      },
      emphasis: {
        label: { show: false },
        itemStyle: {
          areaColor: 'rgba(34, 211, 238, 0.28)',
          borderColor: '#67e8f9',
          borderWidth: 1
        }
      },
      regions: buildGeoRegions()
    },
    series: [
      {
        name: 'Qualification Countries',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        zlevel: 4,
        data: scatterData,
        symbol: 'circle',
        symbolSize(value, params) {
          if (params.data?.country === props.focusedCountry) return MAP_POINT_SYMBOL_SIZE.focused;
          if (params.data?.country === props.selectedCountry) return MAP_POINT_SYMBOL_SIZE.selected;
          return MAP_POINT_SYMBOL_SIZE.normal;
        },
        rippleEffect: {
          brushType: 'stroke',
          scale: 3.4,
          period: 4
        },
        itemStyle: {
          color(params) {
            return getRiskColor(params.data?.riskLevel);
          },
          borderColor: 'rgba(255,255,255,0.82)',
          borderWidth: 1.2,
          shadowBlur: 14,
          shadowColor(params) {
            return getRiskColor(params.data?.riskLevel);
          }
        },
        label: {
          show: false
        },
        emphasis: {
          scale: true,
          label: {
            show: false
          }
        }
      }
    ]
  };
}

function buildGeoRegions() {
  const selectedSet = new Set(props.selectedRegions || []);
  const hasFocusedRegionScope = selectedSet.size > 0 && selectedSet.size < globalRegions.value.length;
  const neutralAreaColor = hasFocusedRegionScope ? 'rgba(15, 23, 42, 0.28)' : 'rgba(15, 34, 61, 0.42)';
  const neutralBorderColor = hasFocusedRegionScope ? 'rgba(103, 232, 255, 0.2)' : 'rgba(103, 232, 255, 0.32)';
  return worldCountryNames.value.map((country) => {
    const regionName = countryRegionMap.value.get(country);
    const color = regionColorMap.value.get(regionName) || '#38bdf8';
    const selected = Boolean(regionName) && (!hasFocusedRegionScope || selectedSet.has(regionName));
    return {
      name: country,
      itemStyle: {
        areaColor: selected ? `${color}26` : neutralAreaColor,
        borderColor: selected ? `${color}88` : neutralBorderColor,
        opacity: selected ? 1 : 0.62
      },
      emphasis: {
        itemStyle: {
          areaColor: selected ? `${color}44` : 'rgba(15, 34, 61, 0.5)',
          borderColor: selected ? '#67e8f9' : 'rgba(103, 232, 255, 0.42)'
        },
        label: { show: false }
      }
    };
  });
}

function handleChartClick(params) {
  if (params.seriesType === 'effectScatter' && params.data?.country) {
    emit('select-country', params.data.country);
    return;
  }
  if (params.componentType === 'geo' && params.name) {
    const matchedPoint = props.points.find((point) => point.country === params.name);
    if (matchedPoint) emit('select-country', matchedPoint.country);
  }
}

function applyFocus() {
  if (!chartInstance) return;
  if (previousFocusIndex >= 0) {
    chartInstance.dispatchAction({ type: 'downplay', seriesIndex: 0, dataIndex: previousFocusIndex });
  }

  const targetCountry = props.focusedCountry || props.selectedCountry;
  if (!targetCountry) {
    previousFocusIndex = -1;
    chartInstance.dispatchAction({ type: 'hideTip' });
    return;
  }

  const index = props.points.findIndex((point) => point.country === targetCountry);
  if (index < 0) {
    previousFocusIndex = -1;
    return;
  }

  chartInstance.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex: index });
  chartInstance.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: index });
  previousFocusIndex = index;
}

function handleResize() {
  chartInstance?.resize();
}

function disposeChart() {
  if (!chartInstance) return;
  chartInstance.dispose();
  chartInstance = null;
  previousFocusIndex = -1;
}

function getRiskColor(riskLevel) {
  if (riskLevel === 'High Risk') return '#fb7185';
  if (riskLevel === 'Attention') return '#fbbf24';
  return '#22c55e';
}
</script>
