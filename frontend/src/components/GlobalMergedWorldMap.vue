<template>
  <section class="glass-panel global-merged-dashboard" :class="{ 'global-merged-dashboard-fullscreen': fullscreenActive }">
    <div class="global-merged-dashboard-head">
      <div>
        <p class="section-kicker">{{ kicker }}</p>
        <h2>{{ title }}</h2>
        <p>{{ description }}</p>
      </div>
      <div class="global-merged-dashboard-actions">
        <span class="status-pill" :class="points.length ? 'success' : 'warning'">
          {{ points.length ? `${formatNumber(points.length)} mapped locations` : 'Waiting for mapped data' }}
        </span>
        <button
          class="ghost-button fullscreen-toggle-button global-merged-fullscreen-button"
          type="button"
          :aria-label="fullscreenActive ? 'Exit Fullscreen' : 'Browser Fullscreen'"
          @click="toggleFullscreen"
        >
          <Minimize2 v-if="fullscreenActive" :size="18" />
          <Maximize2 v-else :size="18" />
          <span>{{ fullscreenActive ? 'Exit Fullscreen' : 'Browser Fullscreen' }}</span>
        </button>
      </div>
    </div>

    <div class="global-merged-metric-grid">
      <article v-for="metric in metrics" :key="metric.label" class="global-merged-metric" :class="metric.tone || 'blue'">
        <span>{{ metric.label }}</span>
        <strong>{{ formatMetric(metric.value) }}</strong>
      </article>
    </div>

    <div class="global-merged-main-grid">
      <div class="global-merged-map-shell">
        <div ref="chartRef" class="global-merged-map-root"></div>

        <div class="global-merged-source-legend">
          <span class="qualification-map-legend-title">{{ legendTitle }}</span>
          <div v-for="item in pointLegend" :key="item.key" class="global-merged-source-row">
            <span class="global-merged-source-dot" :style="legendDotStyle(item)"></span>
            <span class="global-merged-source-copy">
              <span>{{ item.name }}</span>
              <small v-if="item.recordCount != null">{{ formatNumber(item.recordCount) }} records · {{ formatNumber(item.traineeCount) }} trainees</small>
            </span>
            <strong v-if="item.recordCount == null">{{ item.count }}</strong>
          </div>
        </div>

        <div v-if="loading" class="qualification-map-overlay">
          <LoaderCircle class="spin" :size="24" />
          <span>Preparing the merged offline map...</span>
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

      <aside class="global-merged-ranking-panel">
        <p class="section-kicker">RANKING AND ANALYSIS</p>
        <h3>{{ rankingTitle }}</h3>
        <div v-if="displayedRankedPoints.length" class="global-merged-ranking-list" :class="{ expanded: rankingExpanded }">
          <button v-for="(point, index) in displayedRankedPoints" :key="point.id" type="button" @click="selectPoint(point)">
            <span class="global-merged-rank-number">{{ index + 1 }}</span>
            <span class="global-merged-rank-copy">
              <strong :title="point.name">{{ point.name }}</strong>
              <small>{{ point.source }} · {{ point.location || point.country || '-' }}</small>
            </span>
            <span class="global-merged-rank-value">
              <strong>{{ formatNumber(point.value) }}</strong>
              <small>{{ rankingMetricLabel }}</small>
            </span>
          </button>
        </div>
        <div v-else class="chart-empty-state compact">No ranked locations yet.</div>
        <button
          v-if="rankedPoints.length > TOP_LIST_LIMIT"
          class="qualification-expand-button global-merged-ranking-expand"
          type="button"
          @click="rankingExpanded = !rankingExpanded"
        >
          <ChevronUp v-if="rankingExpanded" :size="16" />
          <ChevronDown v-else :size="16" />
          <span>{{ rankingExpanded ? 'Collapse to TOP10' : `Show All ${rankedPoints.length}` }}</span>
        </button>
      </aside>
    </div>

    <Teleport to="body">
      <div v-if="selectedPoint" class="shared-data-import-backdrop" @click.self="selectedPoint = null">
        <section class="global-point-detail-dialog" role="dialog" aria-modal="true" :aria-label="`${selectedPoint.name} details`">
          <div class="global-point-detail-head">
            <div>
              <p class="section-kicker">GLOBAL LOCATION DETAIL</p>
              <h2>{{ selectedPoint.name }}</h2>
              <p>{{ selectedPoint.region || 'Unassigned region' }} / {{ selectedPoint.location || selectedPoint.country || 'Location not maintained' }}</p>
            </div>
            <button class="icon-button" type="button" aria-label="Close location detail" @click="selectedPoint = null">
              <X :size="18" />
            </button>
          </div>
          <div class="global-point-source-badges">
            <span v-for="source in selectedPoint.sources || [selectedPoint.source]" :key="source" :class="source.toLowerCase()">{{ source }} data</span>
            <span v-if="selectedPoint.status" class="status">{{ selectedPoint.status }}</span>
          </div>
          <div class="global-point-detail-grid">
            <article v-for="metric in selectedPoint.metrics || []" :key="metric.label">
              <span>{{ metric.label }}</span>
              <strong>{{ formatMetric(metric.value) }}</strong>
            </article>
          </div>
        </section>
      </div>
    </Teleport>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts';
import { ChevronDown, ChevronUp, LoaderCircle, MapPinned, Maximize2, Minimize2, X } from 'lucide-vue-next';
import worldCountriesGeo from '../data/worldCountriesGeo.json';
import { MAP_POINT_SYMBOL_SIZE } from '../utils/offlineChinaMap';
import {
  GLOBAL_DELIVERY_COMBINED_COLORS,
  buildGlobalPointLegend,
  isChinaInternationalCombinedPoint,
  resolveGlobalPointColor,
  resolveGlobalPointSymbolSize
} from '../utils/globalMergedMapVisuals';

const props = defineProps({
  kicker: { type: String, default: 'GLOBAL OFFLINE DISTRIBUTION' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  points: { type: Array, default: () => [] },
  metrics: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  fullscreenActive: { type: Boolean, default: false },
  emptyText: { type: String, default: 'Import at least one regional dataset to display the merged map.' },
  rankingTitle: { type: String, default: 'Location TOP10' },
  rankingMetricLabel: { type: String, default: 'records' },
  legendTitle: { type: String, default: 'Data Source' },
  legendItems: { type: Array, default: () => [] }
});

const emit = defineEmits(['enter-fullscreen', 'exit-fullscreen']);

const WORLD_MAP_NAME = 'global-merged-offline-world';
const TOP_LIST_LIMIT = 10;
const chartRef = ref(null);
const selectedPoint = ref(null);
const rankingExpanded = ref(false);
const errorMessage = ref('');
let chartInstance = null;
let registered = false;

const rankedPoints = computed(() => [...props.points]
  .sort((left, right) => Number(right.value || 0) - Number(left.value || 0) || String(left.name).localeCompare(String(right.name), 'en')));
const displayedRankedPoints = computed(() => (
  rankingExpanded.value ? rankedPoints.value : rankedPoints.value.slice(0, TOP_LIST_LIMIT)
));

const pointLegend = computed(() => (
  props.legendItems.length
    ? props.legendItems
    : buildGlobalPointLegend(props.points)
));

onMounted(async () => {
  window.addEventListener('resize', resizeChart);
  await nextTick();
  initializeChart();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart);
  chartInstance?.dispose();
  chartInstance = null;
});

watch(() => props.points, () => {
  if (props.points.length <= TOP_LIST_LIMIT) rankingExpanded.value = false;
  renderChart();
}, { deep: true });
watch(() => props.loading, renderChart);
watch(() => props.active, async (active) => {
  if (!active) return;
  await nextTick();
  renderChart();
  resizeChart();
});
watch(() => props.fullscreenActive, async () => {
  // ECharts reads its container size at render time. Re-render after the
  // browser fullscreen transition so the canvas fills the resized workspace.
  await nextTick();
  renderChart();
  requestAnimationFrame(resizeChart);
});

function initializeChart() {
  if (!chartRef.value) return;
  try {
    if (!registered) {
      echarts.registerMap(WORLD_MAP_NAME, worldCountriesGeo);
      registered = true;
    }
    chartInstance = echarts.init(chartRef.value);
    chartInstance.on('click', handleChartClick);
    renderChart();
  } catch (error) {
    errorMessage.value = error.message || 'The offline world map failed to initialize.';
  }
}

function renderChart() {
  if (!chartInstance || props.loading) return;
  const data = props.points
    .filter((point) => Array.isArray(point.coords) && point.coords.length >= 2)
    .map((point) => ({
      ...point,
      value: [Number(point.coords[0]), Number(point.coords[1]), Number(point.value || 0)],
      itemStyle: pointStyle(point)
    }));
  const combinedRingData = data
    .filter((point) => isChinaInternationalCombinedPoint(point))
    .map((point) => ({
      ...point,
      itemStyle: {
        color: 'rgba(167, 139, 250, 0.12)',
        borderColor: GLOBAL_DELIVERY_COMBINED_COLORS.ring,
        borderWidth: 3,
        shadowBlur: 18,
        shadowColor: GLOBAL_DELIVERY_COMBINED_COLORS.ring
      }
    }));

  chartInstance.setOption({
    animationDurationUpdate: 280,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      borderWidth: 0,
      backgroundColor: 'rgba(8, 13, 30, 0.96)',
      textStyle: { color: '#e2e8f0' },
      formatter: (params) => formatTooltip(params)
    },
    geo: {
      map: WORLD_MAP_NAME,
      roam: true,
      zoom: 1.08,
      center: [12, 18],
      label: { show: false },
      itemStyle: {
        areaColor: 'rgba(15, 34, 61, 0.76)',
        borderColor: 'rgba(56, 189, 248, 0.34)',
        borderWidth: 0.7
      },
      emphasis: {
        label: { show: false },
        itemStyle: { areaColor: 'rgba(34, 211, 238, 0.24)', borderColor: '#67e8f9', borderWidth: 1 }
      },
      regions: [
        { name: 'China', itemStyle: { areaColor: 'rgba(34, 211, 238, 0.15)', borderColor: 'rgba(34, 211, 238, 0.72)' } },
        { name: 'United States of America', itemStyle: { borderColor: 'rgba(103, 232, 249, 0.5)' } },
        { name: 'Canada', itemStyle: { borderColor: 'rgba(103, 232, 249, 0.5)' } }
      ]
    },
    series: [
      {
        name: 'Combined China + International',
        type: 'scatter',
        coordinateSystem: 'geo',
        zlevel: 3,
        data: combinedRingData,
        symbol: 'circle',
        symbolSize: (value, params) =>
          resolveGlobalPointSymbolSize(params.data, MAP_POINT_SYMBOL_SIZE.normal) + 10,
        silent: true,
        animation: false
      },
      {
        name: 'Global Locations',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        zlevel: 4,
        data,
        symbol: 'circle',
        // Service qualification and delivery snapshots can provide a
        // quantity-based diameter. Other merged points retain the common size.
        symbolSize: (value, params) =>
          resolveGlobalPointSymbolSize(params.data, MAP_POINT_SYMBOL_SIZE.normal),
        rippleEffect: { brushType: 'stroke', scale: 3.4, period: 4 },
        label: { show: false },
        emphasis: { scale: 1.4, label: { show: false } }
      }
    ]
  }, true);
  requestAnimationFrame(resizeChart);
}

function pointStyle(point) {
  const color = resolveGlobalPointColor(point);
  return {
    color,
    borderColor: '#f8fafc',
    borderWidth: 1.2,
    shadowBlur: 15,
    shadowColor: color
  };
}

function legendDotStyle(item) {
  const colors = Array.isArray(item.colors) ? item.colors.filter(Boolean) : [];
  if (colors.length >= 2) {
    return {
      background: `conic-gradient(${colors[0]} 0 50%, ${colors[1]} 50% 100%)`,
      boxShadow: `0 0 7px ${colors[0]}, 0 0 12px ${colors[1]}`
    };
  }
  return {
    background: item.color,
    boxShadow: `0 0 10px ${item.color}`
  };
}

function formatTooltip(params) {
  if (params.seriesType !== 'effectScatter') return params.name || '';
  const point = params.data || {};
  const rows = [
    `<strong>${escapeHtml(point.name || '')}</strong>`,
    `Source: ${escapeHtml(point.source || '-')}`,
    `Region: ${escapeHtml(point.region || '-')}`,
    `Location: ${escapeHtml(point.location || point.country || '-')}`
  ];
  if (point.sourceBreakdown) rows.push(`Source Breakdown: ${escapeHtml(point.sourceBreakdown)}`);
  (point.metrics || []).slice(0, 4).forEach((metric) => rows.push(`${escapeHtml(metric.label)}: ${escapeHtml(formatMetric(metric.value))}`));
  rows.push('<span style="color:#7dd3fc">Click for details</span>');
  return rows.join('<br/>');
}

function handleChartClick(params) {
  if (params.seriesType !== 'effectScatter' || !params.data?.id) return;
  const point = props.points.find((item) => item.id === params.data.id);
  if (point) selectPoint(point);
}

function selectPoint(point) {
  selectedPoint.value = point;
}

function toggleFullscreen() {
  emit(props.fullscreenActive ? 'exit-fullscreen' : 'enter-fullscreen');
}

function resizeChart() {
  chartInstance?.resize();
}

function formatMetric(value) {
  if (typeof value === 'number') return formatNumber(value);
  return String(value ?? '-');
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-US');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
</script>
