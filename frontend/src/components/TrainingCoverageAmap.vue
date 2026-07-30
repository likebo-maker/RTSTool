<template>
  <section class="glass-panel qualification-map-panel">
    <div class="panel-title-row">
      <div>
        <p class="section-kicker">Training Center Delivery</p>
        <h2>中国区培训中心交付地图</h2>
      </div>
      <div class="training-map-head-actions">
        <div class="training-mode-switch">
          <button
            v-for="mode in displayModes"
            :key="mode.key"
            class="training-mode-button"
            :class="{ active: mode.key === displayMode }"
            type="button"
            @click="$emit('update:displayMode', mode.key)"
          >
            {{ mode.label }}
          </button>
        </div>
        <span class="status-pill" :class="mapReady ? 'success' : 'warning'">
          {{ mapReady ? '离线地图已就绪' : '离线地图初始化中' }}
        </span>
      </div>
    </div>

    <div class="qualification-map-shell">
      <div ref="chartRef" class="qualification-amap-root"></div>

      <div class="qualification-map-legend">
        <span class="qualification-map-legend-title">{{ legendConfig.title }}</span>
        <div v-for="item in legendConfig.items" :key="`${displayMode}-${item.tone}`" class="qualification-map-legend-row">
          <span class="qualification-map-legend-dot" :class="item.tone"></span>
          <span>{{ item.label }}</span>
        </div>
      </div>

      <div class="training-region-legend training-delivery-region-legend">
        <span class="qualification-map-legend-title">大区交付数据</span>
        <div
          v-for="item in regionLegendItems"
          :key="item.name"
          class="training-region-legend-row"
          :class="{ muted: item.recordCount === 0 }"
        >
          <span
            class="training-region-legend-dot"
            :style="{ background: item.color, boxShadow: `0 0 10px ${item.color}` }"
          ></span>
          <span class="training-region-legend-name">{{ item.name }}</span>
          <strong>{{ formatNumber(item.recordCount) }} records · {{ formatNumber(item.traineeCount) }} trainees</strong>
        </div>
      </div>

      <div v-if="loading" class="qualification-map-overlay">
        <LoaderCircle class="spin" :size="24" />
        <span>培训中心交付地图加载中</span>
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
import { LoaderCircle, MapPinned } from 'lucide-vue-next';
import { getQualificationRegionGroups } from '../utils/branchGeoMap';
import { resolveTrainingPointTone } from '../utils/trainingAggregator';
import {
  buildOfflineChinaMapOption,
  escapeMapHtml,
  hideOfflineMapTooltip,
  initOfflineChinaMap,
  showOfflineMapTooltip
} from '../utils/offlineChinaMap';

const props = defineProps({
  points: {
    type: Array,
    default: () => []
  },
  regionStats: {
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
    default: '请导入培训表'
  },
  selectedBranch: {
    type: String,
    default: ''
  },
  presentationMode: {
    type: Boolean,
    default: false
  },
  focusedBranch: {
    type: String,
    default: ''
  },
  labelBranches: {
    type: Array,
    default: () => []
  },
  selectedRegions: {
    type: Array,
    default: () => []
  },
  displayMode: {
    type: String,
    default: 'training-count'
  }
});

const emit = defineEmits(['select-branch', 'select-center', 'update:displayMode']);

const displayModes = [
  { key: 'training-count', label: '培训人次' },
  { key: 'pass-rate', label: '合格率' },
  { key: 'session-count', label: '培训场次' }
];

const legendConfig = computed(() => {
  if (props.displayMode === 'training-count' || props.displayMode === 'risk') {
    return {
      title: '培训人次图例',
      items: [
        { tone: 'good', label: '培训人次 >=120' },
        { tone: 'warning', label: '培训人次 60-119' },
        { tone: 'info', label: '培训人次 <60' }
      ]
    };
  }
  if (props.displayMode === 'session-count') {
    return {
      title: '培训场次图例',
      items: [
        { tone: 'good', label: '培训场次 >=20' },
        { tone: 'warning', label: '培训场次 8-19' },
        { tone: 'info', label: '培训场次 <8' }
      ]
    };
  }
  return {
    title: '合格率图例',
    items: [
      { tone: 'good', label: '合格率 >=90%' },
      { tone: 'warning', label: '合格率 70%-89.9%' },
      { tone: 'critical', label: '合格率 <70%' },
      { tone: 'info', label: '暂无成绩结果' }
    ]
  };
});

const regionLegendItems = computed(() => {
  const regionStats = new Map((props.regionStats || []).map((item) => [item.name, item]));

  const items = getQualificationRegionGroups().map((region) => ({
    name: region.name,
    color: region.color,
    recordCount: Number(regionStats.get(region.name)?.recordCount || 0),
    traineeCount: Number(regionStats.get(region.name)?.traineeCount || 0)
  }));

  const unmatchedStat = regionStats.get('未匹配大区');
  if (unmatchedStat?.recordCount) {
    items.push({
      name: '未匹配大区',
      color: '#94a3b8',
      recordCount: Number(unmatchedStat.recordCount || 0),
      traineeCount: Number(unmatchedStat.traineeCount || 0)
    });
  }
  return items;
});

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-US');
}

const chartRef = ref(null);
const mapReady = ref(false);
const errorMessage = ref('');
let chartInstance = null;

onMounted(async () => {
  window.addEventListener('resize', handleResize);
  document.addEventListener('fullscreenchange', handleResize);
  await nextTick();
  initChart();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('fullscreenchange', handleResize);
  disposeChart();
});

watch(
  () => props.points,
  () => renderChart(),
  { deep: true }
);

watch(
  () => [props.selectedBranch, props.focusedBranch],
  () => applyFocus()
);

watch(
  () => props.presentationMode,
  () => renderChart()
);

watch(
  () => props.selectedRegions,
  () => renderChart(),
  { deep: true }
);

watch(
  () => props.displayMode,
  () => renderChart()
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
    handleResize();
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
    chartInstance = initOfflineChinaMap(chartRef.value);
    chartInstance.on('click', handleChartClick);
    mapReady.value = true;
    renderChart();
  } catch (error) {
    errorMessage.value = error.message || '离线地图初始化失败';
  }
}

function renderChart() {
  if (!chartInstance || props.loading) return;
  const option = buildOfflineChinaMapOption({
    points: props.points,
    regionGroups: getQualificationRegionGroups(),
    selectedRegions: props.selectedRegions,
    selectedKey: props.selectedBranch,
    focusedKey: props.focusedBranch,
    labelKeys: props.presentationMode ? props.labelBranches : [],
    pointKeyResolver: resolvePointKey,
    pointNameResolver: resolvePointKey,
    pointToneResolver: (point) => resolveTrainingPointTone(point, props.displayMode),
    pointMetricResolver: resolvePointMetric,
    labelMetricResolver: resolvePointMetricLabel,
    tooltipFormatter: buildPointTooltip
  });
  chartInstance.setOption(option, true);
  chartInstance.resize();
  applyFocus();
  requestAnimationFrame(() => {
    chartInstance?.resize();
    applyFocus();
  });
}

function handleChartClick(params) {
  const key = params?.data?.point ? resolvePointKey(params.data.point) : params?.data?.key;
  if (!key) return;
  emit('select-center', key);
  emit('select-branch', key);
}

function applyFocus() {
  if (!chartInstance) return;
  const targetKey = props.focusedBranch || props.selectedBranch;
  if (!targetKey) {
    hideOfflineMapTooltip(chartInstance);
    return;
  }
  showOfflineMapTooltip(chartInstance, props.points, resolvePointKey, targetKey);
}

function resolvePointKey(point) {
  return point?.trainingCenter || point?.branch || '';
}

function resolvePointMetric(point) {
  if (props.displayMode === 'session-count') return point.sessionCount;
  if (props.displayMode === 'pass-rate') return point.passRateValue ?? 0;
  return point.recordCount;
}

function resolvePointMetricLabel(point) {
  if (props.displayMode === 'session-count') return `培训场次 ${point.sessionCount}`;
  if (props.displayMode === 'pass-rate') return `合格率 ${point.passRate}`;
  return `培训人次 ${point.recordCount}`;
}

function buildPointTooltip(point) {
  if (!point) return '';
  return `
    <div class="qualification-map-info-window">
      <strong>${escapeMapHtml(point.trainingCenter || point.branch)}</strong>
      <span>定位城市：${escapeMapHtml(point.city || '-')}</span>
      <span>大区：${escapeMapHtml(point.mappedRegion || '未匹配大区')}</span>
      <span>培训人数：${Number(point.traineeCount || 0).toLocaleString('zh-CN')}</span>
      <span>培训人次：${Number(point.recordCount || 0).toLocaleString('zh-CN')}</span>
      <span>培训场次：${Number(point.sessionCount || 0).toLocaleString('zh-CN')}</span>
      <span>合格率：${escapeMapHtml(point.passRate)}</span>
      <span>不合格人次：${Number(point.failCount || 0).toLocaleString('zh-CN')}</span>
      <span>主要产线：${escapeMapHtml(point.primaryProductLines)}</span>
      <span>主要课程：${escapeMapHtml(point.primaryCourses || point.primaryTrainingTypes)}</span>
    </div>
  `;
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
