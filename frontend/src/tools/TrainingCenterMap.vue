<template>
  <div
    class="tool-page qualification-page training-center-map-page"
    :class="{
      'fullscreen-workspace': fullscreenActive,
      'global-merged-fullscreen-workspace': fullscreenActive && isGlobalScopeActive
    }"
  >
    <section v-if="!fullscreenActive" class="glass-panel training-center-tab-panel">
      <div>
        <p class="section-kicker">Training Center Map</p>
        <h2>Mindray Training Center Construction / Delivery Map</h2>
      </div>
      <div class="training-center-tab-switch">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="training-center-tab-button"
          :class="{ active: activeTab === tab.key }"
          type="button"
          @click="switchMapTab(tab.key)"
        >
          <component :is="tab.icon" :size="16" />
          <span>{{ tab.label }}</span>
        </button>
      </div>
    </section>

    <section v-if="activeTab === 'construction' && !fullscreenActive" class="training-map-scope-panel">
      <button
        v-for="scope in constructionScopes"
        :key="scope.key"
        class="training-map-scope-button"
        :class="{ active: activeConstructionScope === scope.key }"
        type="button"
        @click="selectConstructionScope(scope.key)"
      >
        {{ scope.label }}
      </button>
    </section>

    <section v-if="activeTab === 'delivery' && !fullscreenActive" class="training-map-scope-panel">
      <button
        v-for="scope in deliveryScopes"
        :key="scope.key"
        class="training-map-scope-button"
        :class="{ active: activeDeliveryScope === scope.key }"
        type="button"
        @click="selectDeliveryScope(scope.key)"
      >
        {{ scope.label }}
      </button>
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
      v-if="activeTab === 'construction' && activeConstructionScope === 'global' && !fullscreenActive"
      compact
      kicker="GLOBAL TRAINING CENTER CONSTRUCTION"
      title="Global Training Center Construction Data"
      description="Import the China and International construction workbooks once. Both construction maps reuse the latest shared data."
      note="Construction data is the prerequisite for its matching delivery data source."
      :sources="constructionDataSources"
      :active-import-key="activeImportKey"
      @select-import="chooseGlobalImport"
    />

    <GlobalMergedWorldMap
      v-if="activeTab === 'construction' && activeConstructionScope === 'global'"
      kicker="GLOBAL TRAINING CENTER CONSTRUCTION DISTRIBUTION"
      title="Global Training Center Construction Map"
      description="China and International training centers are displayed together. Identical center name, country, and city values are merged into one location."
      :active="active"
      :fullscreen-active="fullscreenActive && activeTab === 'construction' && activeConstructionScope === 'global'"
      :loading="globalConstructionLoading"
      :points="globalConstructionSnapshot.points"
      :metrics="globalConstructionSnapshot.metrics"
      :ranking-title="globalConstructionSnapshot.rankingTitle"
      :ranking-metric-label="globalConstructionSnapshot.rankingMetricLabel"
      :legend-title="globalConstructionSnapshot.legendTitle"
      empty-text="Import China or International construction data to display the global map."
      @enter-fullscreen="$emit('enter-fullscreen')"
      @exit-fullscreen="$emit('exit-fullscreen')"
    />

    <TrainingConstructionMap
      v-if="chinaConstructionMapMounted"
      ref="chinaConstructionMapRef"
      v-show="activeTab === 'construction' && activeConstructionScope === 'china'"
      :allow-import="false"
      :active="active && activeTab === 'construction' && activeConstructionScope === 'china'"
      :can-export-excel="canExportExcel"
      :fullscreen-active="fullscreenActive && activeTab === 'construction' && activeConstructionScope === 'china'"
      @enter-fullscreen="$emit('enter-fullscreen')"
      @exit-fullscreen="$emit('exit-fullscreen')"
      @feature-blocked="$emit('feature-blocked', $event)"
      @status-change="forwardStatus('construction', $event)"
      @log="forwardLog('construction', $event)"
      @dataset-updated="refreshTrainingDataSources"
    />

    <InternationalTrainingConstructionMap
      v-if="internationalConstructionMapMounted"
      ref="internationalConstructionMapRef"
      v-show="activeTab === 'construction' && activeConstructionScope === 'international'"
      :allow-import="false"
      :active="active && activeTab === 'construction' && activeConstructionScope === 'international'"
      :can-export-excel="canExportExcel"
      :fullscreen-active="fullscreenActive && activeTab === 'construction' && activeConstructionScope === 'international'"
      @enter-fullscreen="$emit('enter-fullscreen')"
      @exit-fullscreen="$emit('exit-fullscreen')"
      @feature-blocked="$emit('feature-blocked', $event)"
      @status-change="forwardStatus('international-construction', $event)"
      @log="forwardLog('international-construction', $event)"
      @dataset-updated="refreshTrainingDataSources"
    />

    <SharedDataImportHub
      v-if="activeTab === 'delivery' && activeDeliveryScope === 'global' && !fullscreenActive"
      compact
      kicker="GLOBAL TRAINING CENTER DELIVERY"
      title="Global Training Center Delivery Data"
      description="Import the China and International delivery workbooks once. Both delivery maps reuse the latest shared data."
      note="Each delivery workbook uses the corresponding construction data for center and location matching."
      :sources="deliveryDataSources"
      :active-import-key="activeImportKey"
      @select-import="chooseGlobalImport"
    />

    <section
      v-if="activeTab === 'delivery' && activeDeliveryScope === 'global' && !fullscreenActive"
      class="glass-panel global-delivery-date-filter-panel"
    >
      <div>
        <p class="section-kicker">FILTER CONTROLS</p>
        <h2>Time</h2>
      </div>
      <TrainingDateRangeFilter
        v-model:start-date="globalDeliveryDraftFilters.startDate"
        v-model:end-date="globalDeliveryDraftFilters.endDate"
        label="Time"
        :minimum="globalDeliveryDateBounds.minimum"
        :maximum="globalDeliveryDateBounds.maximum"
      />
      <div class="qualification-filter-actions">
        <button class="primary-button" type="button" :disabled="globalDeliveryFiltering || globalDeliveryLoading" @click="applyGlobalDeliveryDateFilter">
          <Search :size="17" />
          <span>Search</span>
        </button>
        <button class="ghost-button" type="button" :disabled="globalDeliveryFiltering || globalDeliveryLoading" @click="resetGlobalDeliveryDateFilter">
          <Eraser :size="17" />
          <span>Reset</span>
        </button>
      </div>
      <span v-if="globalDeliveryFilterWarning || globalDeliveryDateSourceWarning" class="global-delivery-date-warning">
        {{ globalDeliveryFilterWarning || globalDeliveryDateSourceWarning }}
      </span>
    </section>

    <GlobalMergedWorldMap
      v-if="activeTab === 'delivery' && activeDeliveryScope === 'global'"
      kicker="GLOBAL TRAINING CENTER DELIVERY DISTRIBUTION"
      title="Global Training Center Delivery Map"
      description="Matched China and International delivery locations are combined while preserving their original data source."
      :active="active"
      :fullscreen-active="fullscreenActive && activeTab === 'delivery' && activeDeliveryScope === 'global'"
      :loading="globalDeliveryLoading"
      :points="globalDeliverySnapshot.points"
      :metrics="globalDeliverySnapshot.metrics"
      :ranking-title="globalDeliverySnapshot.rankingTitle"
      :ranking-metric-label="globalDeliverySnapshot.rankingMetricLabel"
      :legend-title="globalDeliverySnapshot.legendTitle"
      :legend-items="globalDeliverySnapshot.legendItems"
      empty-text="Import construction data first, then import China or International delivery data to display the global map."
      @enter-fullscreen="$emit('enter-fullscreen')"
      @exit-fullscreen="$emit('exit-fullscreen')"
    />

    <InternationalTrainingDeliveryMap
      v-if="internationalDeliveryMapMounted"
      ref="internationalDeliveryMapRef"
      v-show="activeTab === 'delivery' && activeDeliveryScope === 'international'"
      :allow-import="false"
      :active="active && activeTab === 'delivery' && activeDeliveryScope === 'international'"
      :can-export-excel="canExportExcel"
      :fullscreen-active="fullscreenActive && activeTab === 'delivery' && activeDeliveryScope === 'international'"
      @enter-fullscreen="$emit('enter-fullscreen')"
      @exit-fullscreen="$emit('exit-fullscreen')"
      @feature-blocked="$emit('feature-blocked', $event)"
      @status-change="forwardStatus('international-delivery', $event)"
      @log="forwardLog('international-delivery', $event)"
      @dataset-updated="refreshTrainingDataSources"
    />

    <TrainingCoverageMap
      v-if="chinaDeliveryMapMounted"
      ref="chinaDeliveryMapRef"
      v-show="activeTab === 'delivery' && activeDeliveryScope === 'china'"
      :allow-import="false"
      :active="active && activeTab === 'delivery' && activeDeliveryScope === 'china'"
      :can-export-excel="canExportExcel"
      :fullscreen-active="fullscreenActive && activeTab === 'delivery' && activeDeliveryScope === 'china'"
      @enter-fullscreen="$emit('enter-fullscreen')"
      @exit-fullscreen="$emit('exit-fullscreen')"
      @feature-blocked="$emit('feature-blocked', $event)"
      @status-change="forwardStatus('delivery', $event)"
      @log="forwardLog('delivery', $event)"
      @dataset-updated="refreshTrainingDataSources"
    />
    <BlockingOperationModal
      :visible="globalDeliveryFiltering"
      title="Applying Filters"
      message="Updating global delivery points, metrics, rankings, and source totals."
    />
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { Eraser, MapPinned, Presentation, Search } from 'lucide-vue-next';
import TrainingConstructionMap from './TrainingConstructionMap.vue';
import TrainingCoverageMap from './TrainingCoverageMap.vue';
import InternationalTrainingConstructionMap from './InternationalTrainingConstructionMap.vue';
import InternationalTrainingDeliveryMap from './InternationalTrainingDeliveryMap.vue';
import SharedDataImportHub from '../components/SharedDataImportHub.vue';
import GlobalMergedWorldMap from '../components/GlobalMergedWorldMap.vue';
import BlockingOperationModal from '../components/BlockingOperationModal.vue';
import TrainingDateRangeFilter from '../components/TrainingDateRangeFilter.vue';
import { LOCAL_DATASET_KEYS, loadToolDataset } from '../services/localDataStore';
import { buildGlobalConstructionSnapshot, buildGlobalDeliverySnapshot } from '../utils/globalMergedMap';
import {
  createTrainingTimeRange,
  filterTrainingRecordsByTime,
  normalizeTrainingTimeRecords,
  resolveTrainingTimeBounds,
  validateTrainingTimeRange
} from '../utils/trainingTime';
import { normalizeInternationalTrainingDeliveryRecords } from '../utils/internationalTrainingDeliveryConfig';
import { runWithMinimumVisibleTime } from '../utils/blockingOperation';

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

const activeTab = ref('construction');
const activeConstructionScope = ref('global');
const activeDeliveryScope = ref('global');
const isGlobalScopeActive = computed(() => (
  (activeTab.value === 'construction' && activeConstructionScope.value === 'global')
  || (activeTab.value === 'delivery' && activeDeliveryScope.value === 'global')
));
const globalImportInputRef = ref(null);
const chinaConstructionMapRef = ref(null);
const internationalConstructionMapRef = ref(null);
const chinaDeliveryMapRef = ref(null);
const internationalDeliveryMapRef = ref(null);
const chinaConstructionMapMounted = ref(false);
const internationalConstructionMapMounted = ref(false);
const chinaDeliveryMapMounted = ref(false);
const internationalDeliveryMapMounted = ref(false);
const activeImportKey = ref('');
const pendingImportKey = ref('');
const globalConstructionLoading = ref(false);
const globalDeliveryLoading = ref(false);
const globalConstructionSnapshot = ref(buildGlobalConstructionSnapshot());
const globalDeliverySnapshot = ref(buildGlobalDeliverySnapshot());
const chinaConstructionDataset = ref(createDatasetState());
const internationalConstructionDataset = ref(createDatasetState());
const chinaDeliveryDataset = ref(createDatasetState());
const internationalDeliveryDataset = ref(createDatasetState());
const chinaDeliveryRecords = ref([]);
const internationalDeliveryRecords = ref([]);
const globalDeliveryFiltering = ref(false);
const globalDeliveryFilterWarning = ref('');
const globalDeliveryDraftFilters = reactive(createTrainingTimeRange());
const globalDeliveryAppliedFilters = ref(createTrainingTimeRange());
const globalDeliveryDateBounds = computed(() => resolveTrainingTimeBounds([
  ...chinaDeliveryRecords.value,
  ...internationalDeliveryRecords.value
]));
const globalDeliveryDateSourceWarning = computed(() => {
  const recordCount = chinaDeliveryRecords.value.length + internationalDeliveryRecords.value.length;
  if (!recordCount || globalDeliveryDateBounds.value.minimum) return '';
  return 'The latest delivery datasets do not include Training End Time. Re-import the delivery workbooks to use Time.';
});

const constructionDataSources = computed(() => [
  {
    key: 'china-construction',
    shortLabel: 'China',
    label: 'China Training Center Construction Data',
    description: 'Shared by the China Training Center Construction Map.',
    recordLabel: 'center-course relations',
    ...chinaConstructionDataset.value
  },
  {
    key: 'international-construction',
    shortLabel: 'International',
    label: 'International Training Center Construction Data',
    description: 'Shared by the International Training Center Construction Map.',
    recordLabel: 'center-course relations',
    ...internationalConstructionDataset.value
  }
]);

const deliveryDataSources = computed(() => [
  {
    key: 'china-delivery',
    shortLabel: 'China',
    label: 'China Training Center Delivery Data',
    description: 'Shared by the China Training Center Delivery Map.',
    recordLabel: 'training records',
    blocked: !chinaConstructionDataset.value.ready,
    blockedMessage: 'Import China construction data first.',
    ...chinaDeliveryDataset.value
  },
  {
    key: 'international-delivery',
    shortLabel: 'International',
    label: 'International Training Center Delivery Data',
    description: 'Shared by the International Training Center Delivery Map.',
    recordLabel: 'training records',
    blocked: !internationalConstructionDataset.value.ready,
    blockedMessage: 'Import International construction data first.',
    ...internationalDeliveryDataset.value
  }
]);
const tabs = [
  { key: 'construction', label: 'Training Center Construction Map', icon: MapPinned },
  { key: 'delivery', label: 'Training Center Delivery Map', icon: Presentation }
];
const constructionScopes = [
  { key: 'global', label: 'Global Training Center Construction Map' },
  { key: 'china', label: 'China Training Center Construction Map' },
  { key: 'international', label: 'International Training Center Construction Map' }
];
const deliveryScopes = [
  { key: 'global', label: 'Global Training Center Delivery Map' },
  { key: 'china', label: 'China Training Center Delivery Map' },
  { key: 'international', label: 'International Training Center Delivery Map' }
];

onMounted(async () => {
  await nextTick();
  await refreshTrainingDataSources();
});

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

  await ensureTrainingMapMounted(sourceKey);
  const targets = {
    'china-construction': chinaConstructionMapRef.value,
    'international-construction': internationalConstructionMapRef.value,
    'china-delivery': chinaDeliveryMapRef.value,
    'international-delivery': internationalDeliveryMapRef.value
  };
  const target = targets[sourceKey];
  if (!target?.importFiles) {
    emit('status-change', 'The selected import service is still loading. Please try again.');
    return;
  }

  activeImportKey.value = sourceKey;
  try {
    await target.importFiles(files);
  } finally {
    await refreshTrainingDataSources();
    activeImportKey.value = '';
  }
}

function switchMapTab(tabKey) {
  activeTab.value = tabKey;
}

function selectConstructionScope(scopeKey) {
  activeConstructionScope.value = scopeKey;
  if (scopeKey !== 'global') ensureTrainingMapMounted(`${scopeKey}-construction`);
}

function selectDeliveryScope(scopeKey) {
  activeDeliveryScope.value = scopeKey;
  if (scopeKey !== 'global') ensureTrainingMapMounted(`${scopeKey}-delivery`);
}

async function ensureTrainingMapMounted(sourceKey) {
  if (sourceKey === 'china-construction') chinaConstructionMapMounted.value = true;
  if (sourceKey === 'international-construction') internationalConstructionMapMounted.value = true;
  if (sourceKey === 'china-delivery') chinaDeliveryMapMounted.value = true;
  if (sourceKey === 'international-delivery') internationalDeliveryMapMounted.value = true;
  await nextTick();
}

async function refreshTrainingDataSources() {
  globalConstructionLoading.value = true;
  globalDeliveryLoading.value = true;
  const [chinaConstruction, internationalConstruction, chinaDelivery, internationalDelivery] = await Promise.all([
    loadToolDataset(LOCAL_DATASET_KEYS.TRAINING_CONSTRUCTION_MAP),
    loadToolDataset(LOCAL_DATASET_KEYS.INTERNATIONAL_TRAINING_CONSTRUCTION_MAP),
    loadToolDataset(LOCAL_DATASET_KEYS.TRAINING_COVERAGE_MAP),
    loadToolDataset(LOCAL_DATASET_KEYS.INTERNATIONAL_TRAINING_DELIVERY_MAP)
  ]);
  chinaConstructionDataset.value = datasetStateFromRecord(chinaConstruction);
  internationalConstructionDataset.value = datasetStateFromRecord(internationalConstruction);
  chinaDeliveryDataset.value = datasetStateFromRecord(chinaDelivery);
  internationalDeliveryDataset.value = datasetStateFromRecord(internationalDelivery);
  try {
    await yieldToBrowser();
    globalConstructionSnapshot.value = buildGlobalConstructionSnapshot(
      chinaConstruction?.payload?.records || [],
      internationalConstruction?.payload?.records || []
    );
    chinaDeliveryRecords.value = normalizeTrainingTimeRecords(chinaDelivery?.payload?.records || []);
    internationalDeliveryRecords.value = normalizeInternationalTrainingDeliveryRecords(internationalDelivery?.payload?.records || []);
    setGlobalDeliveryDateFilterToAll();
    refreshGlobalDeliverySnapshot();
  } finally {
    globalConstructionLoading.value = false;
    globalDeliveryLoading.value = false;
  }
}

async function applyGlobalDeliveryDateFilter() {
  const validation = validateTrainingTimeRange(globalDeliveryDraftFilters);
  if (!validation.valid) {
    globalDeliveryFilterWarning.value = validation.reason === 'reversed'
      ? 'Time From cannot be later than Time To.'
      : 'Select both Time From and Time To.';
    return;
  }
  globalDeliveryFiltering.value = true;
  await nextTick();
  await nextFrame();
  try {
    await runWithMinimumVisibleTime(async () => {
      globalDeliveryAppliedFilters.value = { ...globalDeliveryDraftFilters };
      refreshGlobalDeliverySnapshot();
      globalDeliveryFilterWarning.value = '';
      await nextTick();
      await nextFrame();
    }, 450);
  } finally {
    globalDeliveryFiltering.value = false;
  }
}

async function resetGlobalDeliveryDateFilter() {
  globalDeliveryFiltering.value = true;
  await nextTick();
  await nextFrame();
  try {
    await runWithMinimumVisibleTime(async () => {
      setGlobalDeliveryDateFilterToAll();
      refreshGlobalDeliverySnapshot();
      globalDeliveryFilterWarning.value = '';
      await nextTick();
      await nextFrame();
    }, 450);
  } finally {
    globalDeliveryFiltering.value = false;
  }
}

function setGlobalDeliveryDateFilterToAll() {
  const all = createTrainingTimeRange(globalDeliveryDateBounds.value);
  Object.assign(globalDeliveryDraftFilters, all);
  globalDeliveryAppliedFilters.value = { ...all };
}

function refreshGlobalDeliverySnapshot() {
  globalDeliverySnapshot.value = buildGlobalDeliverySnapshot(
    filterTrainingRecordsByTime(chinaDeliveryRecords.value, globalDeliveryAppliedFilters.value),
    filterTrainingRecordsByTime(internationalDeliveryRecords.value, globalDeliveryAppliedFilters.value)
  );
}

function datasetStateFromRecord(record) {
  const records = record?.payload?.records || [];
  return {
    ready: Boolean(records.length),
    recordCount: records.length,
    updatedAt: record?.payload?.importedAt || record?.updatedAt || ''
  };
}

function createDatasetState() {
  return { ready: false, recordCount: 0, updatedAt: '' };
}

function yieldToBrowser() {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

function nextFrame() {
  return new Promise((resolve) => {
    const schedule = typeof window !== 'undefined' && window.requestAnimationFrame
      ? window.requestAnimationFrame.bind(window)
      : setTimeout;
    schedule(resolve);
  });
}

function forwardStatus(tabKey, message) {
  if (activeTab.value === 'construction' && tabKey === 'international-construction' && activeConstructionScope.value !== 'international') return;
  if (activeTab.value === 'delivery' && tabKey === 'international-delivery' && activeDeliveryScope.value !== 'international') return;
  if (activeTab.value === 'construction' && tabKey === 'construction' && activeConstructionScope.value !== 'china') return;
  if (activeTab.value === 'delivery' && tabKey === 'delivery' && activeDeliveryScope.value !== 'china') return;
  if ((tabKey === 'construction' || tabKey === 'international-construction') && activeTab.value !== 'construction') return;
  if ((tabKey === 'delivery' || tabKey === 'international-delivery') && activeTab.value !== 'delivery') return;
  emit('status-change', message);
}

function forwardLog(tabKey, message) {
  if (activeTab.value === 'construction' && tabKey === 'international-construction' && activeConstructionScope.value !== 'international') return;
  if (activeTab.value === 'delivery' && tabKey === 'international-delivery' && activeDeliveryScope.value !== 'international') return;
  if (activeTab.value === 'construction' && tabKey === 'construction' && activeConstructionScope.value !== 'china') return;
  if (activeTab.value === 'delivery' && tabKey === 'delivery' && activeDeliveryScope.value !== 'china') return;
  if ((tabKey === 'construction' || tabKey === 'international-construction') && activeTab.value !== 'construction') return;
  if ((tabKey === 'delivery' || tabKey === 'international-delivery') && activeTab.value !== 'delivery') return;
  emit('log', message);
}
</script>
