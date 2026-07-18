<template>
  <div class="tool-page qualification-page engineer-qualification-map-page" :class="{ 'fullscreen-workspace': fullscreenActive }">
    <section v-if="!fullscreenActive" class="glass-panel training-center-tab-panel">
      <div>
        <p class="section-kicker">Engineer Qualification Map</p>
        <h2>Engineer Service Qualification Map</h2>
      </div>
      <div class="training-center-tab-switch engineer-qualification-tab-switch">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="training-center-tab-button"
          :class="{ active: activeTab === tab.key }"
          type="button"
          @click="switchTab(tab.key)"
        >
          <component :is="tab.icon" :size="16" />
          <span>{{ tab.label }}</span>
        </button>
      </div>
    </section>

    <input
      ref="globalImportInputRef"
      class="hidden-file-input"
      type="file"
      accept=".xlsx,.xls"
      multiple
      @change="handleGlobalFileImport"
    />

    <SharedDataImportHub
      v-show="activeTab === 'global'"
      compact
      kicker="GLOBAL SERVICE QUALIFICATION MAP"
      title="Global Service Qualification Data"
      description="Import China and International qualification workbooks once. The corresponding map pages reuse the latest shared data automatically."
      note="China and International datasets remain independent, so replacing one source never changes the other."
      :sources="serviceDataSources"
      :active-import-key="activeImportKey"
      @select-import="chooseGlobalImport"
    />

    <GlobalMergedWorldMap
      v-show="activeTab === 'global'"
      kicker="GLOBAL SERVICE QUALIFICATION DISTRIBUTION"
      title="Global Service Qualification Map"
      description="China branch locations and International country-capital locations are displayed together on one offline world map."
      :active="active && activeTab === 'global'"
      :loading="globalMapLoading"
      :points="globalSnapshot.points"
      :metrics="globalSnapshot.metrics"
      :ranking-title="globalSnapshot.rankingTitle"
      :ranking-metric-label="globalSnapshot.rankingMetricLabel"
      empty-text="Import China or International service qualification data to display the global map."
    />

    <ChinaServiceQualificationMap
      v-if="chinaMapMounted"
      ref="chinaMapRef"
      v-show="activeTab === 'china'"
      embedded
      :allow-import="false"
      :active="active && activeTab === 'china'"
      :can-export-excel="canExportExcel"
      :fullscreen-active="fullscreenActive && activeTab === 'china'"
      @enter-fullscreen="$emit('enter-fullscreen')"
      @exit-fullscreen="$emit('exit-fullscreen')"
      @feature-blocked="$emit('feature-blocked', $event)"
      @status-change="forwardStatus('china', $event)"
      @log="forwardLog('china', $event)"
      @dataset-updated="refreshServiceDataSources"
    />

    <InternationalServiceQualificationMap
      v-if="internationalMapMounted"
      ref="internationalMapRef"
      v-show="activeTab === 'international'"
      embedded
      :allow-import="false"
      :active="active && activeTab === 'international'"
      :can-export-excel="canExportExcel"
      :fullscreen-active="fullscreenActive && activeTab === 'international'"
      @enter-fullscreen="$emit('enter-fullscreen')"
      @exit-fullscreen="$emit('exit-fullscreen')"
      @feature-blocked="$emit('feature-blocked', $event)"
      @status-change="forwardStatus('international', $event)"
      @log="forwardLog('international', $event)"
      @dataset-updated="refreshServiceDataSources"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { Globe2, MapPinned, UsersRound } from 'lucide-vue-next';
import ChinaServiceQualificationMap from './ChinaServiceQualificationMap.vue';
import InternationalServiceQualificationMap from './InternationalServiceQualificationMap.vue';
import SharedDataImportHub from '../components/SharedDataImportHub.vue';
import GlobalMergedWorldMap from '../components/GlobalMergedWorldMap.vue';
import { buildGlobalServiceSnapshot } from '../utils/globalMergedMap';

const props = defineProps({
  canExportExcel: {
    type: Boolean,
    default: true
  },
  fullscreenActive: {
    type: Boolean,
    default: false
  },
  active: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['status-change', 'log', 'feature-blocked', 'enter-fullscreen', 'exit-fullscreen']);

const activeTab = ref('global');
const globalImportInputRef = ref(null);
const chinaMapRef = ref(null);
const internationalMapRef = ref(null);
const chinaMapMounted = ref(false);
const internationalMapMounted = ref(false);
const activeImportKey = ref('');
const pendingImportKey = ref('');
const globalMapLoading = ref(false);
const globalSnapshot = ref(buildGlobalServiceSnapshot());
const chinaDataset = ref(createDatasetState());
const internationalDataset = ref(createDatasetState());

const serviceDataSources = computed(() => [
  {
    key: 'china',
    label: 'China Service Qualification Data',
    description: 'Shared by the China Service Qualification Map.',
    recordLabel: 'qualification rows',
    ...chinaDataset.value
  },
  {
    key: 'international',
    label: 'International Service Qualification Data',
    description: 'Shared by the International Service Qualification Map.',
    recordLabel: 'qualification rows',
    ...internationalDataset.value
  }
]);

const tabs = [
  { key: 'global', label: 'Global Service Qualification Map', icon: Globe2 },
  { key: 'china', label: 'China Service Qualification Map', icon: MapPinned },
  { key: 'international', label: 'International Service Qualification Map', icon: UsersRound }
];

watch(
  () => props.active,
  (isActive) => {
    if (isActive && activeTab.value === 'global') {
      refreshServiceDataSources();
      emit('status-change', 'Global service qualification data management is ready.');
    }
  },
  { immediate: true }
);

onMounted(async () => {
  await nextTick();
  await refreshServiceDataSources();
});

function switchTab(tabKey) {
  activeTab.value = tabKey;
  if (tabKey === 'global') {
    refreshServiceDataSources();
    emit('status-change', 'Global service qualification data management is ready.');
    return;
  }
  ensureServiceMapMounted(tabKey);
}

function chooseGlobalImport(sourceKey) {
  if (activeImportKey.value) return;
  pendingImportKey.value = sourceKey;
  globalImportInputRef.value?.click();
}

async function handleGlobalFileImport(event) {
  const files = Array.from(event.target.files || []);
  event.target.value = '';
  const sourceKey = pendingImportKey.value;
  pendingImportKey.value = '';
  if (!files.length || !sourceKey) return;

  await ensureServiceMapMounted(sourceKey);
  const target = sourceKey === 'china' ? chinaMapRef.value : internationalMapRef.value;
  if (!target?.importFiles) {
    emit('status-change', 'The selected import service is still loading. Please try again.');
    return;
  }

  activeImportKey.value = sourceKey;
  try {
    await target.importFiles(files);
  } finally {
    await refreshServiceDataSources();
    activeImportKey.value = '';
  }
}

async function refreshServiceDataSources() {
  globalMapLoading.value = true;
  let chinaSnapshot = {};
  let internationalDashboard = null;
  try {
    const response = await fetch('/api/local-datasets/service_qualification_map/global-snapshot');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    chinaSnapshot = await response.json();
    chinaDataset.value = {
      ready: Boolean(chinaSnapshot.recordCount),
      recordCount: Number(chinaSnapshot.recordCount || 0),
      updatedAt: chinaSnapshot.updatedAt || ''
    };
  } catch (error) {
    chinaDataset.value = createDatasetState();
  }

  try {
    const response = await fetch('/api/international-qualification/dataset');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const status = await response.json();
    internationalDataset.value = {
      ready: Boolean(status?.recordCount),
      recordCount: Number(status?.recordCount || 0),
      updatedAt: status?.updatedAt || ''
    };
    if (status?.recordCount) {
      const queryResponse = await fetch('/api/international-qualification/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters: status.allOptions || status.filters || {} })
      });
      if (!queryResponse.ok) throw new Error(`HTTP ${queryResponse.status}`);
      internationalDashboard = (await queryResponse.json())?.dashboard || null;
    }
  } catch (error) {
    internationalDataset.value = createDatasetState();
  }

  try {
    await yieldToBrowser();
    globalSnapshot.value = buildGlobalServiceSnapshot(chinaSnapshot, internationalDashboard);
  } finally {
    globalMapLoading.value = false;
  }
}

async function ensureServiceMapMounted(tabKey) {
  if (tabKey === 'china') chinaMapMounted.value = true;
  if (tabKey === 'international') internationalMapMounted.value = true;
  await nextTick();
}

function createDatasetState() {
  return { ready: false, recordCount: 0, updatedAt: '' };
}

function yieldToBrowser() {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

function forwardStatus(tabKey, message) {
  if (activeTab.value !== tabKey) return;
  emit('status-change', message);
}

function forwardLog(tabKey, message) {
  if (activeTab.value !== tabKey) return;
  emit('log', message);
}
</script>
