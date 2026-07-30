<template>
  <section class="glass-panel qualification-map-panel">
    <div class="panel-title-row">
      <div>
        <p class="section-kicker">OFFLINE WORLD DISTRIBUTION</p>
        <h2>International Training Center Delivery Map</h2>
      </div>
      <div class="training-map-head-actions">
        <div class="training-mode-switch">
          <button v-for="mode in displayModes" :key="mode.key" class="training-mode-button" :class="{ active: displayMode === mode.key }" type="button" @click="$emit('update:displayMode', mode.key)">{{ mode.label }}</button>
        </div>
        <span class="status-pill" :class="mapReady ? 'success' : 'warning'">{{ mapReady ? 'Offline map ready' : 'Initializing offline map' }}</span>
      </div>
    </div>

    <div class="qualification-map-shell">
      <div ref="chartRef" class="qualification-amap-root"></div>
      <div class="qualification-map-legend">
        <span class="qualification-map-legend-title">{{ legendConfig.title }}</span>
        <div v-for="item in legendConfig.items" :key="item.label" class="qualification-map-legend-row"><span class="qualification-map-legend-dot" :style="{ background: item.color, boxShadow: `0 0 10px ${item.color}` }"></span><span>{{ item.label }}</span></div>
      </div>
      <div class="training-region-legend international-region-legend">
        <span class="qualification-map-legend-title">Secondary Region</span>
        <div v-for="item in regionLegendItems" :key="item.name" class="training-region-legend-row international-delivery-region-row" :class="{ muted: item.recordCount === 0 }">
          <span class="training-region-legend-dot" :style="{ background: item.color, boxShadow: `0 0 10px ${item.color}` }"></span>
          <span class="training-region-legend-name">{{ item.name }}</span>
          <strong>{{ formatNumber(item.recordCount) }} records · {{ formatNumber(item.traineeCount) }} trainees</strong>
        </div>
      </div>
      <div v-if="loading" class="qualification-map-overlay"><LoaderCircle class="spin" :size="24" /><span>Loading delivery map...</span></div>
      <div v-else-if="errorMessage" class="qualification-map-overlay error"><MapPinned :size="24" /><span>{{ errorMessage }}</span></div>
      <div v-else-if="!points.length" class="qualification-map-overlay"><MapPinned :size="24" /><span>{{ emptyText }}</span></div>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts';
import { LoaderCircle, MapPinned } from 'lucide-vue-next';
import worldCountriesGeo from '../data/worldCountriesGeo.json';
import { getInternationalTrainingDeliveryRegionGroups } from '../utils/internationalTrainingDeliveryConfig';
import { createInternationalQualificationPointSizer } from '../utils/internationalQualificationMapSizing';

const props = defineProps({
  points: { type: Array, default: () => [] },
  regionStats: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  fullscreenActive: { type: Boolean, default: false },
  emptyText: { type: String, default: 'Import international training delivery Excel to generate the world map.' },
  selectedPoint: { type: String, default: '' },
  selectedRegions: { type: Array, default: () => [] },
  displayMode: { type: String, default: 'training-count' }
});

const emit = defineEmits(['select-point', 'update:displayMode']);
const WORLD_MAP_NAME = 'international-training-delivery-world';
const chartRef = ref(null);
const mapReady = ref(false);
const errorMessage = ref('');
let chartInstance = null;
let registered = false;
let previousFocusIndex = -1;

const displayModes = [
  { key: 'training-count', label: 'Training Records' },
  { key: 'pass-rate', label: 'Pass Rate' },
  { key: 'session-count', label: 'Sessions' }
];
const regionGroups = computed(() => getInternationalTrainingDeliveryRegionGroups());
// CHINA is retained as an international delivery data scope because those
// centers must remain visible, but it is not one of the seven secondary
// regions required by the business legend.
const legendRegionGroups = computed(() => regionGroups.value.filter((region) => region.name !== 'CHINA'));
const worldCountryNames = computed(() => (worldCountriesGeo.features || []).map((feature) => feature?.properties?.name).filter(Boolean));
const regionColorMap = computed(() => new Map(regionGroups.value.map((region) => [region.name, region.color])));
const countryRegionMap = computed(() => {
  const map = new Map();
  regionGroups.value.forEach((region) => (region.countries || []).forEach((country) => map.set(country, region.name)));
  return map;
});
const legendConfig = computed(() => {
  if (props.displayMode === 'pass-rate') return { title: 'Pass Rate', items: [{ label: '90% or above', color: '#22c55e' }, { label: '70% to 89.9%', color: '#f59e0b' }, { label: 'Below 70%', color: '#ef4444' }, { label: 'No result', color: '#64748b' }] };
  if (props.displayMode === 'session-count') return { title: 'Sessions', items: [{ label: '20 or more', color: '#22c55e' }, { label: '8 to 19', color: '#f59e0b' }, { label: 'Below 8', color: '#38bdf8' }] };
  return { title: 'Training Records', items: [{ label: '120 or more', color: '#22c55e' }, { label: '60 to 119', color: '#f59e0b' }, { label: 'Below 60', color: '#38bdf8' }] };
});
const regionLegendItems = computed(() => {
  const stats = new Map((props.regionStats || []).map((item) => [item.name, item]));
  return legendRegionGroups.value.map((region) => ({
    name: region.name,
    color: region.color,
    recordCount: Number(stats.get(region.name)?.recordCount || 0),
    traineeCount: Number(stats.get(region.name)?.traineeCount || 0)
  }));
});

onMounted(async () => { window.addEventListener('resize', handleResize); await nextTick(); initChart(); });
onBeforeUnmount(() => { window.removeEventListener('resize', handleResize); disposeChart(); });
watch(() => props.points, renderChart, { deep: true });
watch(() => props.selectedPoint, applyFocus);
watch(() => props.selectedRegions, renderChart, { deep: true });
watch(() => props.displayMode, renderChart);
watch(() => props.loading, renderChart);
watch(() => props.active, async (isActive) => { if (!isActive) return; await nextTick(); renderChart(); handleResize(); });
watch(() => props.fullscreenActive, async () => { await nextTick(); handleResize(); });

function initChart() {
  if (!chartRef.value) return;
  try {
    if (!registered) { echarts.registerMap(WORLD_MAP_NAME, worldCountriesGeo); registered = true; }
    chartInstance = echarts.init(chartRef.value);
    chartInstance.on('click', handleChartClick);
    mapReady.value = true;
    renderChart();
  } catch (error) { errorMessage.value = error.message || 'Offline world map failed to initialize.'; }
}

function renderChart() {
  if (!chartInstance || props.loading) return;
  chartInstance.setOption(buildMapOption(), true);
  chartInstance.resize();
  previousFocusIndex = -1;
  applyFocus();
}

function buildMapOption() {
  const scatterData = props.points.filter((point) => Array.isArray(point.coords) && point.coords.length >= 2).map((point) => ({
    name: point.organizer,
    value: [point.coords[0], point.coords[1], point.recordCount],
    ...point,
    itemStyle: { color: getPointColor(point), borderColor: '#e0f2fe', borderWidth: 1.2, shadowBlur: 14, shadowColor: getPointColor(point) }
  }));
  const pointSizer = createInternationalQualificationPointSizer(scatterData, {
    valueField: 'recordCount',
    minimumSize: 12,
    maximumSize: 34
  });
  return {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', borderWidth: 0, backgroundColor: 'rgba(8, 13, 30, 0.94)', textStyle: { color: '#e2e8f0' }, formatter: (params) => buildTooltip(params?.data) },
    geo: {
      map: WORLD_MAP_NAME, roam: true, zoom: 1.18, center: [18, 18], silent: false, label: { show: false },
      itemStyle: { areaColor: 'rgba(15, 34, 61, 0.72)', borderColor: 'rgba(56, 189, 248, 0.28)', borderWidth: 0.65 },
      emphasis: { label: { show: false }, itemStyle: { areaColor: 'rgba(34, 211, 238, 0.28)', borderColor: '#67e8f9', borderWidth: 1 } },
      regions: buildGeoRegions()
    },
    series: [{
      name: 'Training Delivery', type: 'effectScatter', coordinateSystem: 'geo', zlevel: 4, data: scatterData, symbol: 'circle',
      symbolSize: (value, params) => pointSizer(params.data, { selected: params.data?.pointKey === props.selectedPoint }),
      rippleEffect: { brushType: 'stroke', scale: 3.4, period: 4 },
      itemStyle: { color: (params) => getPointColor(params.data), borderColor: 'rgba(255,255,255,0.82)', borderWidth: 1.2, shadowBlur: 14, shadowColor: (params) => getPointColor(params.data) },
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
    return { name: country, itemStyle: { areaColor: selected ? `${color}26` : hasScope ? 'rgba(15,23,42,0.28)' : 'rgba(15,34,61,0.42)', borderColor: selected ? `${color}88` : 'rgba(103,232,255,0.22)', opacity: selected ? 1 : 0.62 }, emphasis: { label: { show: false }, itemStyle: { areaColor: selected ? `${color}44` : 'rgba(15,34,61,0.5)', borderColor: selected ? '#67e8f9' : 'rgba(103,232,255,0.42)' } } };
  });
}

function buildTooltip(point) {
  if (!point?.organizer) return point?.name || '';
  return [
    `<strong>${escapeHtml(point.organizer)}</strong>`,
    `Training Center: ${escapeHtml(point.organizer || '-')}`,
    `Matched Construction Center: ${escapeHtml(point.matchedConstructionCenter || '-')}`,
    `Secondary Region: ${escapeHtml(point.secondaryRegion || '-')}`,
    `Country: ${escapeHtml(point.country || '-')}`,
    `Map Location: ${escapeHtml(point.displayLocation || '-')}`,
    `Trainees: ${Number(point.traineeCount || 0).toLocaleString('en-US')}`,
    `Training Records: ${Number(point.recordCount || 0).toLocaleString('en-US')}`,
    `Sessions: ${Number(point.sessionCount || 0).toLocaleString('en-US')}`,
    `Pass Rate: ${escapeHtml(point.passRate || '-')}`,
    `Failed Training Records: ${Number(point.failCount || 0).toLocaleString('en-US')}`
  ].join('<br/>');
}

function getPointColor(point) {
  if (props.displayMode === 'pass-rate') {
    if (point?.passRateValue == null) return '#64748b';
    if (point.passRateValue >= 90) return '#22c55e';
    if (point.passRateValue >= 70) return '#f59e0b';
    return '#ef4444';
  }
  const count = props.displayMode === 'session-count' ? Number(point?.sessionCount || 0) : Number(point?.recordCount || 0);
  if (props.displayMode === 'session-count') return count >= 20 ? '#22c55e' : count >= 8 ? '#f59e0b' : '#38bdf8';
  return count >= 120 ? '#22c55e' : count >= 60 ? '#f59e0b' : '#38bdf8';
}

function handleChartClick(params) {
  const pointKey = params?.data?.pointKey;
  if (params.seriesType === 'effectScatter' && pointKey) emit('select-point', pointKey);
}

function applyFocus() {
  if (!chartInstance) return;
  if (previousFocusIndex >= 0) chartInstance.dispatchAction({ type: 'downplay', seriesIndex: 0, dataIndex: previousFocusIndex });
  if (!props.selectedPoint) { previousFocusIndex = -1; chartInstance.dispatchAction({ type: 'hideTip' }); return; }
  const index = props.points.findIndex((point) => point.pointKey === props.selectedPoint);
  if (index < 0) return;
  chartInstance.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex: index });
  chartInstance.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: index });
  previousFocusIndex = index;
}

function escapeHtml(value) { return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;'); }
function formatNumber(value) { return Number(value || 0).toLocaleString('en-US'); }
function handleResize() { chartInstance?.resize(); }
function disposeChart() { if (!chartInstance) return; chartInstance.off('click', handleChartClick); chartInstance.dispose(); chartInstance = null; }
</script>
