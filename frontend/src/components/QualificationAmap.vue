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
  emptyText: {
    type: String,
    default: '暂无符合条件的资质数据，请调整筛选条件。'
  },
  selectedBranch: {
    type: String,
    default: ''
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
let regionLayers = [];
let infoWindow = null;

onMounted(async () => {
  await nextTick();
  await initMap();
});

onBeforeUnmount(() => {
  markers.forEach((marker) => marker.setMap?.(null));
  markers = [];
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
    mapInstance?.resize?.();
    renderRegionLayers();
    renderMarkers();
  }
);

async function initMap() {
  try {
    const AMap = await loadAmapSdk();
    if (!mapRef.value) return;

    mapInstance = new AMap.Map(mapRef.value, {
      zoom: 4.5,
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

function renderMarkers() {
  if (!mapInstance || props.loading) return;

  markers.forEach((marker) => marker.setMap?.(null));
  markers = [];
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

    markerElement.addEventListener('mouseenter', () => {
      openInfoWindow(point, marker);
    });
    markerElement.addEventListener('mouseleave', () => {
      window.setTimeout(() => infoWindow?.close(), 120);
    });
    markerElement.addEventListener('click', () => {
      emit('select-branch', point.branch);
      openInfoWindow(point, marker);
    });

    marker.__branch = point.branch;
    marker.__element = markerElement;
    marker.setMap(mapInstance);
    markers.push(marker);
  });

  mapInstance.setFitView(markers, false, [80, 40, 40, 60]);
  updateMarkerActiveState();
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
  const content = document.createElement('div');
  content.className = 'qualification-map-info-window';
  content.innerHTML = `
    <strong>${escapeHtml(point.branch)}</strong>
    <span>总持证人数：${point.totalPeople}</span>
    <span>有效资质数：${point.validQualifications}</span>
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
