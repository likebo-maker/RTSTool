<template>
  <section class="glass-panel qualification-map-panel">
    <div class="panel-title-row">
      <div>
        <p class="section-kicker">Offline Distribution</p>
        <h2>中国区资质地图</h2>
      </div>
      <span class="status-pill" :class="mapReady ? 'success' : 'warning'">
        {{ mapReady ? '离线地图已就绪' : '离线地图初始化中' }}
      </span>
    </div>

    <div class="qualification-map-shell">
      <div ref="chartRef" class="qualification-amap-root"></div>

      <div class="qualification-map-legend">
        <span class="qualification-map-legend-title">风险图例</span>
        <div class="qualification-map-legend-row">
          <span class="qualification-map-legend-dot good"></span>
          <span>正常</span>
        </div>
        <div class="qualification-map-legend-row">
          <span class="qualification-map-legend-dot warning"></span>
          <span>即将到期</span>
        </div>
        <div class="qualification-map-legend-row">
          <span class="qualification-map-legend-dot critical"></span>
          <span>已过期 / 高风险</span>
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
          <strong>{{ item.count }}家</strong>
        </div>
      </div>

      <div v-if="loading" class="qualification-map-overlay">
        <LoaderCircle class="spin" :size="24" />
        <span>资质地图加载中</span>
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
import ChinaMapPackage from 'china-map-geojson';
import { LoaderCircle, MapPinned } from 'lucide-vue-next';
import { getQualificationRegionGroups } from '../utils/branchGeoMap';
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
    default: '暂无符合条件的资质数据，请调整筛选条件。'
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
  }
});

const emit = defineEmits(['select-branch']);

const CHINA_MAP_NAME = 'qualification-offline-china';
const CHINA_GEO_JSON = ChinaMapPackage.ChinaData || ChinaMapPackage.default?.ChinaData || ChinaMapPackage;
const PROVINCE_NAME_BY_ADCODE = {
  110000: '北京',
  120000: '天津',
  130000: '河北',
  140000: '山西',
  150000: '内蒙古',
  210000: '辽宁',
  220000: '吉林',
  230000: '黑龙江',
  310000: '上海',
  320000: '江苏',
  330000: '浙江',
  340000: '安徽',
  350000: '福建',
  360000: '江西',
  370000: '山东',
  410000: '河南',
  420000: '湖北',
  430000: '湖南',
  440000: '广东',
  450000: '广西',
  460000: '海南',
  500000: '重庆',
  510000: '四川',
  520000: '贵州',
  530000: '云南',
  540000: '西藏',
  610000: '陕西',
  620000: '甘肃',
  630000: '青海',
  640000: '宁夏',
  650000: '新疆'
};

const chartRef = ref(null);
const mapReady = ref(false);
const errorMessage = ref('');
let chartInstance = null;
let registered = false;
let previousFocusIndex = -1;

const regionLegendItems = computed(() => {
  const regionCounts = new Map();
  props.points.forEach((point) => {
    const key = point.region || '未匹配大区';
    regionCounts.set(key, (regionCounts.get(key) || 0) + 1);
  });

  const items = getQualificationRegionGroups().map((region) => ({
    name: region.name,
    color: region.color,
    count: regionCounts.get(region.name) || 0
  }));

  const unmatchedCount = regionCounts.get('未匹配大区') || 0;
  if (unmatchedCount) {
    items.push({
      name: '未匹配大区',
      color: '#94a3b8',
      count: unmatchedCount
    });
  }
  return items;
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
  () => props.selectedBranch,
  () => applyFocus()
);

watch(
  () => props.focusedBranch,
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
    registerChinaMap();
    chartInstance = echarts.init(chartRef.value);
    chartInstance.on('click', handleChartClick);
    mapReady.value = true;
    renderChart();
  } catch (error) {
    errorMessage.value = error.message || '离线地图初始化失败';
  }
}

function registerChinaMap() {
  if (registered) return;
  echarts.registerMap(CHINA_MAP_NAME, CHINA_GEO_JSON);
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
      name: point.branch,
      branch: point.branch,
      point,
      value: [Number(point.coords[0]), Number(point.coords[1]), Number(point.validQualifications || 0)],
      isFocused: Boolean(props.focusedBranch && point.branch === props.focusedBranch),
      isSelected: Boolean(props.selectedBranch && point.branch === props.selectedBranch),
      itemStyle: {
        color: resolveRiskColor(point.riskLevel)
      },
      label: {
        show: shouldShowPointLabel(point),
        formatter: `${point.branch}\n${Number(point.validQualifications || 0).toLocaleString('zh-CN')}`
      }
    }));

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      confine: true,
      borderColor: 'rgba(96, 165, 250, 0.35)',
      backgroundColor: 'rgba(8, 15, 30, 0.94)',
      textStyle: { color: '#e5f2ff' },
      formatter: (params) => {
        if (params.data?.point) return buildPointTooltip(params.data.point);
        return params.name || '';
      }
    },
    geo: {
      map: CHINA_MAP_NAME,
      roam: true,
      zoom: 1.16,
      center: [104.2, 35.8],
      scaleLimit: { min: 0.9, max: 8 },
      label: { show: false },
      itemStyle: {
        areaColor: 'rgba(15, 23, 42, 0.72)',
        borderColor: 'rgba(125, 211, 252, 0.22)',
        borderWidth: 1
      },
      emphasis: {
        label: {
          show: true,
          color: '#e0f2fe'
        },
        itemStyle: {
          areaColor: 'rgba(14, 165, 233, 0.36)'
        }
      },
      regions: buildRegionStyles()
    },
    series: [
      {
        name: '资质覆盖',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        data: scatterData,
        symbolSize: (value, params) => {
          if (params.data?.isFocused) return MAP_POINT_SYMBOL_SIZE.focused;
          if (params.data?.isSelected) return MAP_POINT_SYMBOL_SIZE.selected;
          return MAP_POINT_SYMBOL_SIZE.normal;
        },
        rippleEffect: {
          brushType: 'stroke',
          scale: 3.4
        },
        emphasis: {
          scale: 1.25,
          label: {
            show: true,
            color: '#ffffff',
            fontWeight: 700,
            formatter: ({ data }) => data?.branch || ''
          }
        },
        label: {
          color: '#e0f2fe',
          fontWeight: 700,
          textBorderColor: 'rgba(8, 15, 30, 0.95)',
          textBorderWidth: 3,
          distance: 8,
          position: 'top'
        },
        zlevel: 5
      }
    ]
  };
}

function buildRegionStyles() {
  const selectedRegionSet = new Set(props.selectedRegions || []);
  return getQualificationRegionGroups().flatMap((region) => {
    const isActive = !selectedRegionSet.size || selectedRegionSet.has(region.name);
    return region.adcodes
      .map((adcode) => PROVINCE_NAME_BY_ADCODE[adcode])
      .filter(Boolean)
      .map((name) => ({
        name,
        itemStyle: {
          areaColor: isActive ? region.fill : 'rgba(255, 255, 255, 0.028)',
          borderColor: isActive ? region.color : 'rgba(255, 255, 255, 0.08)',
          borderWidth: isActive ? 1.1 : 0.6
        },
        emphasis: {
          itemStyle: {
            areaColor: isActive ? region.hoverFill : 'rgba(255, 255, 255, 0.06)'
          }
        }
      }));
  });
}

function shouldShowPointLabel(point) {
  if (!props.presentationMode) return false;
  if (props.focusedBranch && point.branch === props.focusedBranch) return true;
  return props.labelBranches.includes(point.branch);
}

function handleChartClick(params) {
  const branch = params?.data?.point?.branch || params?.data?.branch;
  if (!branch) return;
  emit('select-branch', branch);
}

function applyFocus() {
  if (!chartInstance) return;
  if (previousFocusIndex >= 0) {
    chartInstance.dispatchAction({
      type: 'downplay',
      seriesIndex: 0,
      dataIndex: previousFocusIndex
    });
  }

  const targetBranch = props.focusedBranch || props.selectedBranch;
  if (!targetBranch) {
    chartInstance.dispatchAction({ type: 'hideTip' });
    previousFocusIndex = -1;
    return;
  }

  const dataIndex = props.points.findIndex((point) => point.branch === targetBranch);
  if (dataIndex < 0) {
    previousFocusIndex = -1;
    return;
  }

  chartInstance.dispatchAction({
    type: 'highlight',
    seriesIndex: 0,
    dataIndex
  });
  chartInstance.dispatchAction({
    type: 'showTip',
    seriesIndex: 0,
    dataIndex
  });
  previousFocusIndex = dataIndex;
}

function handleResize() {
  chartInstance?.resize();
}

function disposeChart() {
  if (!chartInstance) return;
  chartInstance.off('click', handleChartClick);
  chartInstance.dispose();
  chartInstance = null;
  previousFocusIndex = -1;
}

function buildPointTooltip(point) {
  return `
    <div class="qualification-map-info-window">
      <strong>${escapeHtml(point.branch)}</strong>
      <span>所属大区：${escapeHtml(point.region || '未匹配大区')}</span>
      <span>有效资质数：${Number(point.validQualifications || 0).toLocaleString('zh-CN')}</span>
      <span>持证人数：${Number(point.totalPeople || 0).toLocaleString('zh-CN')}</span>
      <span>覆盖渠道商：${Number(point.coveredContractors || 0).toLocaleString('zh-CN')}</span>
      <span>主要产品线：${escapeHtml(point.primaryProductLines)}</span>
      <span>风险等级：${escapeHtml(point.riskLevel)}</span>
    </div>
  `;
}

function resolveRiskColor(riskLevel) {
  if (riskLevel === '高风险') return '#ff5d73';
  if (riskLevel === '关注') return '#fbbf24';
  return '#00ff88';
}

function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
</script>
