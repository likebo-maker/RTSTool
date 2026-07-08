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
        <span class="qualification-map-legend-title">{{ legendConfig.title }}</span>
        <div v-for="item in legendConfig.items" :key="`${displayMode}-${item.tone}`" class="qualification-map-legend-row">
          <span class="qualification-map-legend-dot" :class="item.tone"></span>
          <span>{{ item.label }}</span>
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
let labelMarkers = [];
let regionLayers = [];
let infoWindow = null;
let resizeTimerIds = [];

const MAP_INTERACTION_STATUS = {
  dragEnable: true,
  zoomEnable: true,
  scrollWheel: true,
  doubleClickZoom: true,
  keyboardEnable: true,
  touchZoom: true
};

onMounted(async () => {
  window.addEventListener('resize', scheduleMapResize);
  document.addEventListener('fullscreenchange', scheduleMapResize);
  await nextTick();
  await initMap();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', scheduleMapResize);
  document.removeEventListener('fullscreenchange', scheduleMapResize);
  resizeTimerIds.forEach((timerId) => window.clearTimeout(timerId));
  resizeTimerIds = [];
  clearMarkers();
  clearLabelMarkers();
  clearRegionLayers();
  infoWindow?.close();
  mapInstance?.destroy?.();
  mapInstance = null;
});

watch(() => props.points, renderMarkers, { deep: true });
watch(() => props.selectedBranch, updateMarkerActiveState);
watch(
  () => props.focusedBranch,
  () => {
    updateMarkerActiveState();
    renderPresentationLabels();
    if (!props.focusedBranch) {
      infoWindow?.close();
      return;
    }
    openFocusedInfoWindow();
  }
);
watch(
  () => props.presentationMode,
  () => {
    renderPresentationLabels();
    updateMarkerActiveState();
    if (!props.presentationMode) {
      infoWindow?.close();
      return;
    }
    openFocusedInfoWindow();
  }
);
watch(() => props.labelBranches, renderPresentationLabels, { deep: true });
watch(() => props.loading, (isLoading) => { if (!isLoading) renderMarkers(); });
watch(() => props.selectedRegions, renderRegionLayers, { deep: true });
watch(() => props.displayMode, renderMarkers);
watch(
  () => props.fullscreenActive,
  () => {
    scheduleMapResize();
  }
);

async function scheduleMapResize() {
  await nextTick();
  resizeTimerIds.forEach((timerId) => window.clearTimeout(timerId));
  resizeTimerIds = [60, 180, 420, 760].map((delay) => window.setTimeout(() => {
    if (!mapInstance) return;
    mapInstance.resize?.();
    enableMapInteractions();
    renderRegionLayers();
    if (!markers.length && props.points.length) {
      renderMarkers({ fitView: false });
    } else {
      updateMarkerActiveState();
      renderPresentationLabels();
      openFocusedInfoWindow();
    }
  }, delay));
}

async function initMap() {
  try {
    const AMap = await loadAmapSdk();
    if (!mapRef.value) return;
    await waitForStableMapSize();
    mapInstance = new AMap.Map(mapRef.value, {
      zoom: 4.6,
      center: [104.195397, 35.86166],
      mapStyle: 'amap://styles/dark',
      resizeEnable: true,
      ...MAP_INTERACTION_STATUS
    });
    enableMapInteractions();
    mapInstance.addControl(new AMap.Scale());
    mapInstance.addControl(new AMap.ToolBar({ position: 'RB' }));
    mapReady.value = true;
    renderRegionLayers();
    renderMarkers();
    scheduleMapResize();
  } catch (error) {
    errorMessage.value = error.message || '高德地图初始化失败，请检查网络或 key 配置';
  }
}

function enableMapInteractions() {
  mapInstance?.setStatus?.(MAP_INTERACTION_STATUS);
}

async function waitForStableMapSize() {
  for (let index = 0; index < 8; index += 1) {
    await nextTick();
    const rect = mapRef.value?.getBoundingClientRect?.();
    if (rect?.width > 0 && rect?.height > 0) return true;
    await new Promise((resolve) => window.setTimeout(resolve, 80));
  }
  return false;
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

function renderMarkers(options = {}) {
  if (!mapInstance || props.loading) return;
  const { fitView = true } = options;
  clearMarkers();
  clearLabelMarkers();
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

    const selectMarker = () => {
      markerElement.blur();
      marker.setTop?.(true);
      openInfoWindow(point, marker);
      emit('select-center', markerKey);
    };

    markerElement.addEventListener('mouseenter', () => openInfoWindow(point, marker));
    markerElement.addEventListener('mouseleave', () => {
      if (props.presentationMode) return;
      window.setTimeout(() => infoWindow?.close(), 120);
    });
    markerElement.addEventListener('click', selectMarker);
    marker.on?.('mouseover', () => openInfoWindow(point, marker));
    marker.on?.('mouseout', () => {
      if (props.presentationMode) return;
      window.setTimeout(() => infoWindow?.close(), 120);
    });
    marker.on?.('click', selectMarker);

    marker.__branch = markerKey;
    marker.__element = markerElement;
    marker.setMap(mapInstance);
    markers.push(marker);
  });

  if (fitView) {
    mapInstance.setFitView(markers, false, [80, 40, 40, 60]);
  }
  enableMapInteractions();
  updateMarkerActiveState();
  renderPresentationLabels();
  openFocusedInfoWindow();
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
    const isActive = marker.__branch === props.selectedBranch;
    const isFocused = props.presentationMode && marker.__branch === props.focusedBranch;
    marker.__element?.classList.toggle('active', isActive || isFocused);
    marker.__element?.classList.toggle('presentation-focus', isFocused);
    if (isFocused) {
      marker.setTop?.(true);
      marker.setzIndex?.(500);
    } else {
      marker.setzIndex?.(200);
    }
  });
}

function renderPresentationLabels() {
  if (!mapInstance) return;
  clearLabelMarkers();
  if (!props.presentationMode || !props.points.length) return;

  const AMap = window.AMap;
  if (!AMap) return;
  const pointByCenter = new Map(props.points.map((point) => [resolvePointKey(point), point]));
  const focusedPoint = pointByCenter.get(props.focusedBranch) || pointByCenter.get(props.labelBranches[0]);
  const labelPoints = focusedPoint ? [focusedPoint] : [];
  labelPoints.forEach((point, index) => {
    const marker = new AMap.Marker({
      position: point.coords,
      content: buildPresentationLabelContent(point, index, true),
      anchor: 'bottom-center',
      offset: resolveLabelOffset(index),
      zIndex: 560
    });
    marker.setMap(mapInstance);
    labelMarkers.push(marker);
  });
}

function clearLabelMarkers() {
  if (!labelMarkers.length) return;
  labelMarkers.forEach((marker) => marker.setMap?.(null));
  labelMarkers = [];
}

function buildPresentationLabelContent(point, index, isFocused = false) {
  const element = document.createElement('div');
  element.className = `qualification-map-label ${resolveTrainingPointTone(point, props.displayMode)} label-${index % 6}${isFocused ? ' auto-focus-label' : ''}`;
  element.innerHTML = `
    <span class="qualification-map-label-line"></span>
    <strong>${escapeHtml(resolvePointKey(point))}</strong>
    <em>${isFocused ? `轮播讲解｜${point.traineeCount}` : point.traineeCount}</em>
  `;
  return element;
}

function resolveLabelOffset(index) {
  const AMap = window.AMap;
  const offsets = [
    [72, -16],
    [-72, -16],
    [76, -58],
    [-76, -58],
    [0, -78],
    [0, 30]
  ];
  const [x, y] = offsets[index % offsets.length];
  return new AMap.Pixel(x, y);
}

function openFocusedInfoWindow() {
  if (!props.presentationMode || !props.focusedBranch || !mapInstance) return;
  const marker = markers.find((item) => item.__branch === props.focusedBranch);
  const point = props.points.find((item) => resolvePointKey(item) === props.focusedBranch);
  if (!marker || !point) return;
  openInfoWindow(point, marker);
  if (props.fullscreenActive && shouldPanToPoint(point.coords)) {
    mapInstance.panTo?.(point.coords);
  }
}

function shouldPanToPoint(coords) {
  if (!mapInstance || !coords?.length) return false;
  const AMap = window.AMap;
  if (!AMap) return false;
  try {
    const bounds = mapInstance.getBounds?.();
    const lngLat = new AMap.LngLat(coords[0], coords[1]);
    return !bounds?.contains?.(lngLat);
  } catch {
    return false;
  }
}

function openInfoWindow(point, marker) {
  const AMap = window.AMap;
  if (!AMap) return;
  if (!infoWindow) {
    infoWindow = new AMap.InfoWindow({
      offset: new AMap.Pixel(0, -18),
      isCustom: true,
      autoMove: false
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

function resolvePointKey(point) {
  return point?.trainingCenter || point?.branch || '';
}

function resolveModeLabel(point) {
  if (props.displayMode === 'session-count') return `培训场次 ${point.sessionCount}`;
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
