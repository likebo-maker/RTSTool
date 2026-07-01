<template>
  <section class="glass-panel qualification-map-panel">
    <div class="panel-title-row">
      <div>
        <p class="section-kicker">National Training Coverage</p>
        <h2>中国区培训覆盖地图</h2>
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
          {{ mapReady ? '地图已就绪' : '地图初始化中' }}
        </span>
      </div>
    </div>

    <div class="qualification-map-shell">
      <div ref="mapRef" class="qualification-amap-root"></div>

      <div class="qualification-map-legend">
        <span class="qualification-map-legend-title">培训风险图例</span>
        <div class="qualification-map-legend-row">
          <span class="qualification-map-legend-dot good"></span>
          <span>高合格率</span>
        </div>
        <div class="qualification-map-legend-row">
          <span class="qualification-map-legend-dot warning"></span>
          <span>需关注</span>
        </div>
        <div class="qualification-map-legend-row">
          <span class="qualification-map-legend-dot critical"></span>
          <span>不合格风险</span>
        </div>
        <div class="qualification-map-legend-row">
          <span class="qualification-map-legend-dot info"></span>
          <span>暂无成绩结果</span>
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
        <span>培训覆盖地图加载中</span>
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
import { loadAmapSdk } from '../utils/amapLoader';
import { getTrainingRegionGroups } from '../utils/branchRegionMap';
import { resolveTrainingPointTone } from '../utils/trainingAggregator';

const props = defineProps({
  points: {
    type: Array,
    default: () => []
  },
  loading: {
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
  { key: 'risk', label: '不合格风险' },
  { key: 'session-count', label: '培训场次' }
];

const regionLegendItems = computed(() => {
  const regionCounts = new Map();
  props.points.forEach((point) => {
    const key = point.mappedRegion || '未匹配大区';
    regionCounts.set(key, (regionCounts.get(key) || 0) + 1);
  });

  const items = getTrainingRegionGroups().map((region) => ({
    name: region.name,
    color: region.color,
    count: regionCounts.get(region.name) || 0
  }));

  items.push({
    name: '未匹配大区',
    color: '#94a3b8',
    count: regionCounts.get('未匹配大区') || 0
  });
  return items;
});

const mapRef = ref(null);
const mapReady = ref(false);
const errorMessage = ref('');
let mapInstance = null;
let markers = [];
let regionLayers = [];
let infoWindow = null;

onMounted(async () => {
  await nextTick();
  await initMap();
});

onBeforeUnmount(() => {
  clearMarkers();
  clearRegionLayers();
  infoWindow?.close();
  mapInstance?.destroy?.();
  mapInstance = null;
});

watch(() => props.points, renderMarkers, { deep: true });
watch(() => props.selectedBranch, updateMarkerActiveState);
watch(() => props.loading, (isLoading) => { if (!isLoading) renderMarkers(); });
watch(() => props.selectedRegions, renderRegionLayers, { deep: true });
watch(() => props.displayMode, renderMarkers);

async function initMap() {
  try {
    const AMap = await loadAmapSdk();
    if (!mapRef.value) return;
    mapInstance = new AMap.Map(mapRef.value, {
      zoom: 4.6,
      center: [104.195397, 35.86166],
      mapStyle: 'amap://styles/dark',
      resizeEnable: true
    });
    mapInstance.addControl(new AMap.Scale());
    mapInstance.addControl(new AMap.ToolBar({ position: 'RB' }));
    mapReady.value = true;
    renderRegionLayers();
    renderMarkers();
  } catch (error) {
    errorMessage.value = error.message || '高德地图初始化失败，请检查网络或 key 配置';
  }
}

function renderRegionLayers() {
  if (!mapInstance || !window.AMap?.DistrictLayer?.Province) return;
  clearRegionLayers();
  const selectedRegionSet = new Set(props.selectedRegions || []);
  getTrainingRegionGroups().forEach((region) => {
    const isActive = !selectedRegionSet.size || selectedRegionSet.has(region.name);
    const layer = new window.AMap.DistrictLayer.Province({
      zIndex: 12,
      adcode: region.adcodes,
      depth: 0,
      styles: {
        fill: isActive ? region.fill : 'rgba(255,255,255,0.025)',
        'province-stroke': isActive ? region.color : 'rgba(255,255,255,0.08)',
        'city-stroke': 'rgba(255,255,255,0.12)',
        'county-stroke': 'rgba(255,255,255,0.04)'
      }
    });
    layer.setMap(mapInstance);
    regionLayers.push(layer);
  });
}

function renderMarkers() {
  if (!mapInstance || props.loading) return;
  clearMarkers();
  infoWindow?.close();
  if (!props.points.length) return;

  const AMap = window.AMap;
  props.points.forEach((point) => {
    const markerKey = point.trainingCenter || point.branch;
    const markerElement = document.createElement('button');
    markerElement.className = `qualification-map-marker training-map-point ${resolveTrainingPointTone(point, props.displayMode)}`;
    markerElement.style.width = '20px';
    markerElement.style.height = '20px';
    markerElement.innerHTML = '<span></span>';
    markerElement.type = 'button';

    const marker = new AMap.Marker({
      position: point.coords,
      content: markerElement,
      anchor: 'center',
      zIndex: 200
    });

    markerElement.addEventListener('mouseenter', () => openInfoWindow(point, marker));
    markerElement.addEventListener('mouseleave', () => window.setTimeout(() => infoWindow?.close(), 120));
    markerElement.addEventListener('click', () => {
      markerElement.blur();
      marker.setTop?.(true);
      openInfoWindow(point, marker);
      emit('select-center', markerKey);
    });

    marker.__branch = markerKey;
    marker.__element = markerElement;
    marker.setMap(mapInstance);
    markers.push(marker);
  });

  mapInstance.setFitView(markers, false, [80, 40, 40, 60]);
  updateMarkerActiveState();
}

function clearMarkers() {
  markers.forEach((marker) => marker.setMap?.(null));
  markers = [];
}

function clearRegionLayers() {
  regionLayers.forEach((layer) => layer.setMap?.(null));
  regionLayers = [];
}

function updateMarkerActiveState() {
  markers.forEach((marker) => {
    marker.__element?.classList.toggle('active', marker.__branch === props.selectedBranch);
  });
}

function openInfoWindow(point, marker) {
  const AMap = window.AMap;
  if (!AMap) return;
  if (!infoWindow) {
    infoWindow = new AMap.InfoWindow({
      offset: new AMap.Pixel(0, -18),
      isCustom: true,
      autoMove: true
    });
  }
  const modeLabel = resolveModeLabel(point);
  const content = document.createElement('div');
  content.className = 'qualification-map-info-window';
  content.innerHTML = `
    <strong>${escapeHtml(point.trainingCenter || point.branch)}</strong>
    <span>定位城市：${escapeHtml(point.city || '-')}</span>
    <span>大区：${escapeHtml(point.mappedRegion || '未匹配大区')}</span>
    <span>培训人次：${point.traineeCount}</span>
    <span>培训记录数：${point.recordCount}</span>
    <span>培训场次：${point.sessionCount}</span>
    <span>合格率：${escapeHtml(point.passRate)}</span>
    <span>不合格人次：${point.failCount}</span>
    <span>主要产线：${escapeHtml(point.primaryProductLines)}</span>
    <span>主要培训类型：${escapeHtml(point.primaryTrainingTypes)}</span>
    <span>当前主指标：${escapeHtml(modeLabel)}</span>
  `;
  infoWindow.setContent(content);
  infoWindow.open(mapInstance, marker.getPosition());
}

function resolveModeLabel(point) {
  if (props.displayMode === 'session-count') return `培训场次 ${point.sessionCount}`;
  if (props.displayMode === 'risk') return `不合格人次 ${point.failCount}`;
  if (props.displayMode === 'pass-rate') return `合格率 ${point.passRate}`;
  return `培训人次 ${point.traineeCount}`;
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
