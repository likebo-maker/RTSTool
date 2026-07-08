<template>
  <section class="glass-panel qualification-map-panel">
    <div class="panel-title-row">
      <div>
        <p class="section-kicker">National Distribution</p>
        <h2>中国区资质地图</h2>
      </div>
      <span class="status-pill" :class="mapReady ? 'success' : 'warning'">
        {{ mapReady ? '地图已就绪' : '地图初始化中' }}
      </span>
    </div>

    <div class="qualification-map-shell">
      <div ref="mapRef" class="qualification-amap-root"></div>

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
import { LoaderCircle, MapPinned } from 'lucide-vue-next';
import { loadAmapSdk } from '../utils/amapLoader';
import { getQualificationRegionGroups } from '../utils/branchGeoMap';

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
  markers.forEach((marker) => marker.setMap?.(null));
  markers = [];
  clearLabelMarkers();
  clearRegionLayers();
  if (infoWindow) infoWindow.close();
  mapInstance?.destroy?.();
  mapInstance = null;
});

watch(
  () => props.points,
  () => {
    renderMarkers();
  },
  { deep: true }
);

watch(
  () => props.selectedBranch,
  () => {
    updateMarkerActiveState();
  }
);

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

watch(
  () => props.labelBranches,
  () => {
    renderPresentationLabels();
  },
  { deep: true }
);

watch(
  () => props.selectedRegions,
  () => {
    renderRegionLayers();
  },
  { deep: true }
);

watch(
  () => props.loading,
  (isLoading) => {
    if (!isLoading) {
      renderMarkers();
    }
  }
);

watch(
  () => props.active,
  async (isActive) => {
    if (!isActive) return;
    await nextTick();
    scheduleMapResize();
  }
);

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
      zoom: 4.5,
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

function renderMarkers(options = {}) {
  if (!mapInstance || props.loading) return;
  const { fitView = true } = options;

  markers.forEach((marker) => marker.setMap?.(null));
  markers = [];
  clearLabelMarkers();
  if (infoWindow) infoWindow.close();

  if (!props.points.length) return;

  const AMap = window.AMap;
  props.points.forEach((point) => {
    const markerElement = document.createElement('button');
    markerElement.className = `qualification-map-marker training-map-point ${resolveRiskClass(point.riskLevel)}`;
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
      emit('select-branch', point.branch);
      openInfoWindow(point, marker);
    };

    markerElement.addEventListener('mouseenter', () => {
      openInfoWindow(point, marker);
    });
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

    marker.__branch = point.branch;
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

function renderRegionLayers() {
  if (!mapInstance || !window.AMap?.DistrictLayer?.Province) return;

  clearRegionLayers();
  const selectedRegionSet = new Set(props.selectedRegions || []);

  getQualificationRegionGroups().forEach((region) => {
    const isActive = !selectedRegionSet.size || selectedRegionSet.has(region.name);
    const layer = new window.AMap.DistrictLayer.Province({
      zIndex: 12,
      adcode: region.adcodes,
      depth: 0,
      styles: {
        fill: isActive ? region.fill : 'rgba(255,255,255,0.025)',
        'province-stroke': isActive ? region.color : 'rgba(255,255,255,0.08)',
        'city-stroke': 'rgba(255,255,255,0.14)',
        'county-stroke': 'rgba(255,255,255,0.04)'
      }
    });
    layer.setMap(mapInstance);
    regionLayers.push(layer);
  });
}

function clearRegionLayers() {
  if (!regionLayers.length) return;
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
  const pointByBranch = new Map(props.points.map((point) => [point.branch, point]));
  const focusedPoint = pointByBranch.get(props.focusedBranch) || pointByBranch.get(props.labelBranches[0]);
  const labelPoints = focusedPoint ? [focusedPoint] : [];
  labelPoints.forEach((point, index) => {
    const marker = new AMap.Marker({
      position: point.coords,
      content: buildPermanentLabelContent(point, index, true),
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

function buildPermanentLabelContent(point, index, isFocused = false) {
  const element = document.createElement('div');
  element.className = `qualification-map-label ${resolveRiskClass(point.riskLevel)} label-${index % 6}${isFocused ? ' auto-focus-label' : ''}`;
  element.innerHTML = `
    <span class="qualification-map-label-line"></span>
    <strong>${escapeHtml(point.branch)}</strong>
    <em>${isFocused ? `轮播讲解｜${point.validQualifications}` : point.validQualifications}</em>
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
  const point = props.points.find((item) => item.branch === props.focusedBranch);
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
  const content = document.createElement('div');
  content.className = 'qualification-map-info-window';
  content.innerHTML = `
    <strong>${escapeHtml(point.branch)}</strong>
    <span>所属大区：${escapeHtml(point.region || '未匹配大区')}</span>
    <span>有效资质数：${point.validQualifications}</span>
    <span>持证人数：${point.totalPeople}</span>
    <span>30天内到期：${point.expiring30}</span>
    <span>已过期：${point.expiredQualifications}</span>
    <span>主要产品线：${escapeHtml(point.primaryProductLines)}</span>
    <span>风险等级：${escapeHtml(point.riskLevel)}</span>
  `;
  infoWindow.setContent(content);
  infoWindow.open(mapInstance, marker.getPosition());
}

function resolveRiskClass(riskLevel) {
  if (riskLevel === '高风险') return 'critical';
  if (riskLevel === '关注') return 'warning';
  return 'good';
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
