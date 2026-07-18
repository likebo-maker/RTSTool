<template>
  <section class="glass-panel global-merged-dashboard">
    <div class="global-merged-dashboard-head">
      <div>
        <p class="section-kicker">{{ kicker }}</p>
        <h2>{{ title }}</h2>
        <p>{{ description }}</p>
      </div>
      <span class="status-pill" :class="points.length ? 'success' : 'warning'">
        {{ points.length ? `${formatNumber(points.length)} mapped locations` : 'Waiting for mapped data' }}
      </span>
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
          <span class="qualification-map-legend-title">Data Source</span>
          <div v-for="source in sourceLegend" :key="source.name" class="global-merged-source-row">
            <span class="global-merged-source-dot" :style="{ background: source.color, boxShadow: `0 0 10px ${source.color}` }"></span>
            <span>{{ source.name }}</span>
            <strong>{{ source.count }}</strong>
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
        <div v-if="rankedPoints.length" class="global-merged-ranking-list">
          <button v-for="(point, index) in rankedPoints" :key="point.id" type="button" @click="selectPoint(point)">
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
import { LoaderCircle, MapPinned, X } from 'lucide-vue-next';
import worldCountriesGeo from '../data/worldCountriesGeo.json';
import { MAP_POINT_SYMBOL_SIZE } from '../utils/offlineChinaMap';

const props = defineProps({
  kicker: { type: String, default: 'GLOBAL OFFLINE DISTRIBUTION' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  points: { type: Array, default: () => [] },
  metrics: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  emptyText: { type: String, default: 'Import at least one regional dataset to display the merged map.' },
  rankingTitle: { type: String, default: 'Location TOP10' },
  rankingMetricLabel: { type: String, default: 'records' }
});

const WORLD_MAP_NAME = 'global-merged-offline-world';
const SOURCE_COLORS = {
  China: '#22d3ee',
  International: '#a78bfa',
  Combined: '#22c55e'
};
const chartRef = ref(null);
const selectedPoint = ref(null);
const errorMessage = ref('');
let chartInstance = null;
let registered = false;

const rankedPoints = computed(() => [...props.points]
  .sort((left, right) => Number(right.value || 0) - Number(left.value || 0) || String(left.name).localeCompare(String(right.name), 'en'))
  .slice(0, 10));

const sourceLegend = computed(() => {
  const counts = { China: 0, International: 0, Combined: 0 };
  props.points.forEach((point) => {
    const key = SOURCE_COLORS[point.source] ? point.source : 'International';
    counts[key] += 1;
  });
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count, color: SOURCE_COLORS[name] }))
    .filter((item) => item.count > 0);
});

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

watch(() => props.points, renderChart, { deep: true });
watch(() => props.loading, renderChart);
watch(() => props.active, async (active) => {
  if (!active) return;
  await nextTick();
  renderChart();
  resizeChart();
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
      itemStyle: pointStyle(point.source)
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
        name: 'Global Locations',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        zlevel: 4,
        data,
        symbol: 'circle',
        symbolSize: MAP_POINT_SYMBOL_SIZE.normal,
        rippleEffect: { brushType: 'stroke', scale: 3.4, period: 4 },
        label: { show: false },
        emphasis: { scale: 1.4, label: { show: false } }
      }
    ]
  }, true);
  requestAnimationFrame(resizeChart);
}

function pointStyle(source) {
  const color = SOURCE_COLORS[source] || SOURCE_COLORS.International;
  return {
    color,
    borderColor: '#f8fafc',
    borderWidth: 1.2,
    shadowBlur: 15,
    shadowColor: color
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
