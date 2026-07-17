<template>
  <section class="glass-panel qualification-map-panel">
    <div class="panel-title-row">
      <div>
        <p class="section-kicker">Training Center Construction</p>
        <h2>中国区培训中心建设地图</h2>
      </div>
      <span class="status-pill" :class="mapReady ? 'success' : 'warning'">
        {{ mapReady ? '离线地图已就绪' : '离线地图初始化中' }}
      </span>
    </div>

    <div class="qualification-map-shell">
      <div ref="chartRef" class="qualification-amap-root"></div>

      <div class="qualification-map-legend construction-map-legend">
        <span class="qualification-map-legend-title">中心类型</span>
        <div class="qualification-map-legend-row">
          <span class="qualification-map-legend-dot info"></span>
          <span>内部培训中心</span>
        </div>
        <div class="qualification-map-legend-row">
          <span class="qualification-map-legend-dot good"></span>
          <span>渠道培训中心</span>
        </div>
      </div>

      <div class="training-region-legend">
        <span class="qualification-map-legend-title">大区图例</span>
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
          <strong>{{ item.count }}个</strong>
        </div>
      </div>

      <div v-if="loading" class="qualification-map-overlay">
        <LoaderCircle class="spin" :size="24" />
        <span>建设地图加载中</span>
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
    default: '请导入培训中心建设表'
  },
  selectedCenter: {
    type: String,
    default: ''
  },
  focusedCenter: {
    type: String,
    default: ''
  },
  selectedRegions: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['select-center']);

const chartRef = ref(null);
const mapReady = ref(false);
const errorMessage = ref('');
let chartInstance = null;

const regionLegendItems = computed(() => {
  const regionCounts = new Map();
  props.points.forEach((point) => {
    const key = point.mappedRegion || '未匹配大区';
    regionCounts.set(key, (regionCounts.get(key) || 0) + 1);
  });
  return getQualificationRegionGroups().map((region) => ({
    name: region.name,
    color: region.color,
    count: regionCounts.get(region.name) || 0
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
  () => [props.selectedCenter, props.focusedCenter],
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
    selectedKey: props.selectedCenter,
    focusedKey: props.focusedCenter,
    pointKeyResolver: resolvePointKey,
    pointNameResolver: (point) => point.centerName,
    pointToneResolver: resolvePointTone,
    pointMetricResolver: (point) => point.courseCount,
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
  const centerName = params?.data?.point?.centerName || params?.data?.key;
  if (!centerName) return;
  emit('select-center', centerName);
}

function applyFocus() {
  if (!chartInstance) return;
  const targetKey = props.focusedCenter || props.selectedCenter;
  if (!targetKey) {
    hideOfflineMapTooltip(chartInstance);
    return;
  }
  showOfflineMapTooltip(chartInstance, props.points, resolvePointKey, targetKey);
}

function resolvePointKey(point) {
  return point?.centerName || point?.branch || '';
}

function resolvePointTone(point) {
  return point?.centerType === '内部' ? 'info' : 'good';
}

function buildPointTooltip(point) {
  if (!point) return '';
  return `
    <div class="qualification-map-info-window">
      <strong>${escapeMapHtml(point.centerName)}</strong>
      <span>中心类型：${escapeMapHtml(point.centerType)}</span>
      <span>所属大区：${escapeMapHtml(point.mappedRegion || '未匹配大区')}</span>
      <span>定位城市：${escapeMapHtml(point.city || '-')}</span>
      <span>当前课程数：${Number(point.courseCount || 0).toLocaleString('zh-CN')}</span>
      <span>覆盖产线：${escapeMapHtml(point.primaryProductLines)}</span>
      <span>地址：${escapeMapHtml(point.address || '-')}</span>
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
