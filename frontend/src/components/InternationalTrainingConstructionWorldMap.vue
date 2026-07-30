<template>
  <section class="glass-panel qualification-map-panel">
    <div class="panel-title-row">
      <div>
        <p class="section-kicker">OFFLINE WORLD DISTRIBUTION</p>
        <h2>International Training Center Construction Map</h2>
      </div>
      <span class="status-pill" :class="mapReady ? 'success' : 'warning'">
        {{ mapReady ? 'Offline map ready' : 'Initializing offline map' }}
      </span>
    </div>

    <div class="qualification-map-shell">
      <div ref="chartRef" class="qualification-amap-root"></div>

      <div class="qualification-map-legend">
        <span class="qualification-map-legend-title">Center Type</span>
        <div v-for="item in centerTypeLegend" :key="item.key" class="qualification-map-legend-row">
          <span class="qualification-map-legend-dot" :style="{ background: item.color, boxShadow: `0 0 10px ${item.color}` }"></span>
          <span>{{ item.label }}</span>
        </div>
      </div>

      <div v-if="loading" class="qualification-map-overlay">
        <LoaderCircle class="spin" :size="24" />
        <span>Loading construction map...</span>
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
import { MAP_POINT_SYMBOL_SIZE } from '../utils/offlineChinaMap';
import {
  buildInternationalTrainingCenterTypeLegend,
  formatInternationalConstructionContractStatus,
  getInternationalTrainingCenterTypeStyle,
  getInternationalTrainingRegionGroups
} from '../utils/internationalTrainingConstructionConfig';

const props = defineProps({
  points: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  fullscreenActive: { type: Boolean, default: false },
  emptyText: { type: String, default: 'Import international training center construction data to generate the map.' },
  selectedCenter: { type: String, default: '' },
  selectedRegions: { type: Array, default: () => [] }
});

const emit = defineEmits(['select-center']);

const WORLD_MAP_NAME = 'international-training-center-world';
const chartRef = ref(null);
const mapReady = ref(false);
const errorMessage = ref('');
let chartInstance = null;
let registered = false;
let previousFocusIndex = -1;

const regionGroups = computed(() => getInternationalTrainingRegionGroups());
const centerTypeLegend = computed(() =>
  buildInternationalTrainingCenterTypeLegend(props.points.map((point) => point.centerType))
);
const worldCountryNames = computed(() => (worldCountriesGeo.features || []).map((feature) => feature?.properties?.name).filter(Boolean));
const regionColorMap = computed(() => new Map(regionGroups.value.map((region) => [region.name, region.color])));
const countryRegionMap = computed(() => {
  const map = new Map();
  regionGroups.value.forEach((region) => (region.countries || []).forEach((country) => map.set(country, region.name)));
  return map;
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

watch(() => props.points, renderChart, { deep: true });
watch(() => props.selectedCenter, applyFocus);
watch(() => props.selectedRegions, renderChart, { deep: true });
watch(() => props.loading, renderChart);
watch(() => props.active, async (isActive) => {
  if (!isActive) return;
  await nextTick();
  renderChart();
  handleResize();
});
watch(() => props.fullscreenActive, async () => {
  await nextTick();
  handleResize();
});

function initChart() {
  if (!chartRef.value) return;
  try {
    if (!registered) {
      echarts.registerMap(WORLD_MAP_NAME, worldCountriesGeo);
      registered = true;
    }
    chartInstance = echarts.init(chartRef.value);
    chartInstance.on('click', handleChartClick);
    mapReady.value = true;
    renderChart();
  } catch (error) {
    errorMessage.value = error.message || 'Offline world map failed to initialize.';
  }
}

function renderChart() {
  if (!chartInstance || props.loading) return;
  chartInstance.setOption(buildMapOption(), true);
  chartInstance.resize();
  previousFocusIndex = -1;
  applyFocus();
}

function buildMapOption() {
  const scatterData = props.points
    .filter((point) => Array.isArray(point.coords) && point.coords.length >= 2)
    .map((point) => ({
      name: point.centerName,
      value: [point.coords[0], point.coords[1], point.courseCount],
      ...point,
      itemStyle: { color: getCenterTypeColor(point), borderColor: '#e0f2fe', borderWidth: 1.2, shadowBlur: 14, shadowColor: getCenterTypeColor(point) }
    }));
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item', borderWidth: 0, backgroundColor: 'rgba(8, 13, 30, 0.94)', textStyle: { color: '#e2e8f0' },
      formatter: (params) => buildTooltip(params?.data)
    },
    geo: {
      map: WORLD_MAP_NAME, roam: true, zoom: 1.18, center: [18, 18], silent: false, label: { show: false },
      itemStyle: { areaColor: 'rgba(15, 34, 61, 0.72)', borderColor: 'rgba(56, 189, 248, 0.28)', borderWidth: 0.65 },
      emphasis: { label: { show: false }, itemStyle: { areaColor: 'rgba(34, 211, 238, 0.28)', borderColor: '#67e8f9', borderWidth: 1 } },
      regions: buildGeoRegions()
    },
    series: [{
      name: 'Training Centers', type: 'effectScatter', coordinateSystem: 'geo', zlevel: 4, data: scatterData, symbol: 'circle',
      symbolSize: (value, params) => params.data?.centerName === props.selectedCenter ? MAP_POINT_SYMBOL_SIZE.selected : MAP_POINT_SYMBOL_SIZE.normal,
      rippleEffect: { brushType: 'stroke', scale: 3.4, period: 4 },
      itemStyle: {
        color: (params) => getCenterTypeColor(params.data), borderColor: 'rgba(255,255,255,0.82)', borderWidth: 1.2,
        shadowBlur: 14, shadowColor: (params) => getCenterTypeColor(params.data)
      },
      label: { show: false }, emphasis: { scale: true, label: { show: false } }
    }]
  };
}

function buildGeoRegions() {
  const selectedSet = new Set(props.selectedRegions || []);
  const hasScope = selectedSet.size > 0 && selectedSet.size < regionGroups.value.length;
  return worldCountryNames.value.map((country) => {
    const regionName = countryRegionMap.value.get(country);
    const color = regionColorMap.value.get(regionName) || '#38bdf8';
    const selected = Boolean(regionName) && (!hasScope || selectedSet.has(regionName));
    return {
      name: country,
      itemStyle: { areaColor: selected ? `${color}26` : hasScope ? 'rgba(15,23,42,0.28)' : 'rgba(15,34,61,0.42)', borderColor: selected ? `${color}88` : 'rgba(103,232,255,0.22)', opacity: selected ? 1 : 0.62 },
      emphasis: { label: { show: false }, itemStyle: { areaColor: selected ? `${color}44` : 'rgba(15,34,61,0.5)', borderColor: selected ? '#67e8f9' : 'rgba(103,232,255,0.42)' } }
    };
  });
}

function buildTooltip(point) {
  if (!point?.centerName) return point?.name || '';
  const location = point.geoSource === 'city-coordinate' ? point.city : `${point.capital || point.displayLocation} (capital)`;
  return [
    `<strong>${escapeHtml(point.centerName)}</strong>`,
    `Secondary Region: ${escapeHtml(point.secondaryRegion || '-')}`,
    `Country: ${escapeHtml(point.country || '-')}`,
    `Location: ${escapeHtml(location || '-')}`,
    `Center Type: ${escapeHtml(point.centerType || '-')}`,
    `Contract Status: ${escapeHtml(formatInternationalConstructionContractStatus(point.contractStatus))}`,
    `Product Lines: ${escapeHtml((point.productLines || []).join(', ') || '-')}`,
    `Courses: ${Number(point.courseCount || 0).toLocaleString('en-US')}`
  ].join('<br/>');
}

function handleChartClick(params) {
  const centerName = params?.data?.centerName;
  if (params.seriesType === 'effectScatter' && centerName) emit('select-center', centerName);
}

function applyFocus() {
  if (!chartInstance) return;
  if (previousFocusIndex >= 0) chartInstance.dispatchAction({ type: 'downplay', seriesIndex: 0, dataIndex: previousFocusIndex });
  if (!props.selectedCenter) {
    previousFocusIndex = -1;
    chartInstance.dispatchAction({ type: 'hideTip' });
    return;
  }
  const index = props.points.findIndex((point) => point.centerName === props.selectedCenter);
  if (index < 0) return;
  // The detail drawer already shows the complete center data. Keep the point
  // highlighted, but close the map tooltip so it cannot cover drawer content.
  chartInstance.dispatchAction({ type: 'hideTip' });
  chartInstance.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex: index });
  previousFocusIndex = index;
}

function getCenterTypeColor(point) {
  return getInternationalTrainingCenterTypeStyle(point?.centerType).color;
}

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function handleResize() {
  chartInstance?.resize();
}

function disposeChart() {
  if (!chartInstance) return;
  chartInstance.off('click', handleChartClick);
  chartInstance.dispose();
  chartInstance = null;
}
</script>
