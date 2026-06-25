<template>
  <section v-if="!panelless" class="glass-panel qualification-chart-panel">
    <div class="panel-title-row">
      <div>
        <p class="section-kicker">{{ kicker }}</p>
        <h2>{{ title }}</h2>
      </div>
    </div>

    <div v-if="loading" class="chart-empty-state">
      <LoaderCircle class="spin" :size="22" />
      <span>图表加载中</span>
    </div>
    <div v-else-if="!hasOption" class="chart-empty-state">
      <ChartNoAxesCombined :size="24" />
      <span>{{ emptyText }}</span>
    </div>
    <div v-else ref="chartRef" class="qualification-chart-canvas" :style="{ height }"></div>
  </section>
  <div v-else class="qualification-chart-inline">
    <div v-if="showHeader" class="qualification-inline-head">
      <p class="section-kicker">{{ kicker }}</p>
      <h3>{{ title }}</h3>
    </div>
    <div v-if="loading" class="chart-empty-state inline">
      <LoaderCircle class="spin" :size="20" />
      <span>图表加载中</span>
    </div>
    <div v-else-if="!hasOption" class="chart-empty-state inline">
      <ChartNoAxesCombined :size="22" />
      <span>{{ emptyText }}</span>
    </div>
    <div v-else ref="chartRef" class="qualification-chart-canvas" :style="{ height }"></div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts';
import { ChartNoAxesCombined, LoaderCircle } from 'lucide-vue-next';

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  kicker: {
    type: String,
    default: 'Data Analysis'
  },
  option: {
    type: Object,
    default: null
  },
  height: {
    type: String,
    default: '280px'
  },
  emptyText: {
    type: String,
    default: '暂无图表数据'
  },
  loading: {
    type: Boolean,
    default: false
  },
  panelless: {
    type: Boolean,
    default: false
  },
  showHeader: {
    type: Boolean,
    default: true
  }
});

const chartRef = ref(null);
let chartInstance = null;

const hasOption = computed(() => Boolean(props.option));

onMounted(() => {
  window.addEventListener('resize', handleResize);
  renderChart();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  disposeChart();
});

watch(
  () => props.option,
  () => {
    renderChart();
  },
  { deep: true }
);

watch(
  () => props.loading,
  () => {
    renderChart();
  }
);

function renderChart() {
  if (props.loading || !props.option || !chartRef.value) {
    disposeChart();
    return;
  }

  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value);
  }
  chartInstance.setOption(props.option, true);
  chartInstance.resize();
}

function handleResize() {
  chartInstance?.resize();
}

function disposeChart() {
  if (!chartInstance) return;
  chartInstance.dispose();
  chartInstance = null;
}
</script>
