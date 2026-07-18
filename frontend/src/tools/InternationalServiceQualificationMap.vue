<template>
  <div
    class="tool-page qualification-page international-qualification-page"
    :class="{ 'fullscreen-workspace': fullscreenActive, 'fullscreen-filter-open': fullscreenFiltersOpen }"
    @mousemove="handleFullscreenMouseMove"
  >
    <section v-if="!fullscreenActive && !embedded" class="tool-header qualification-tool-header">
      <div class="qualification-tool-heading">
        <div class="tool-icon">
          <Globe2 :size="24" />
        </div>
        <div>
          <p class="section-kicker">INTERNATIONAL SERVICE QUALIFICATION MAP</p>
          <h1>International Service Qualification Map</h1>
          <p>Visualize enabled international service qualifications by secondary region, country, product line, model category, and qualification type.</p>
        </div>
      </div>
      <div class="qualification-header-actions">
        <input
          ref="fileInputRef"
          class="hidden-file-input"
          type="file"
          accept=".xlsx,.xls"
          multiple
          @change="handleFileImport"
        />
        <button v-if="allowImport" class="primary-button" type="button" :disabled="interactionDisabled" @click="openImporter">
          <Upload :size="18" />
          <span>Import Excel</span>
        </button>
        <button
          class="ghost-button"
          :class="{ locked: !canExportExcel }"
          type="button"
          :disabled="interactionDisabled || Boolean(activeExportKey) || (canExportExcel && !dashboard.filteredRecordCount)"
          :title="!canExportExcel ? 'Excel export is not enabled in the current license.' : ''"
          @click="exportCurrentResult"
        >
          <LoaderCircle v-if="activeExportKey === 'current'" class="spin" :size="18" />
          <Download v-else :size="18" />
          <span>Export Current</span>
        </button>
        <button
          class="ghost-button"
          :class="{ locked: !canExportExcel }"
          type="button"
          :disabled="interactionDisabled || Boolean(activeExportKey) || (canExportExcel && !dirtyRowCount)"
          :title="!canExportExcel ? 'Excel export is not enabled in the current license.' : !dirtyRowCount ? 'No dirty rows to export.' : ''"
          @click="exportDirtyRows"
        >
          <LoaderCircle v-if="activeExportKey === 'dirty'" class="spin" :size="18" />
          <Download v-else :size="18" />
          <span>Export Dirty Rows</span>
        </button>
        <button class="ghost-button" type="button" :disabled="interactionDisabled" @click="resetFilters">
          <RotateCcw :size="18" />
          <span>Reset Filters</span>
        </button>
        <button class="ghost-button fullscreen-toggle-button" type="button" @click="toggleBrowserFullscreen">
          <Minimize2 v-if="fullscreenActive" :size="18" />
          <Maximize2 v-else :size="18" />
          <span>{{ fullscreenActive ? 'Exit Fullscreen' : 'Browser Fullscreen' }}</span>
        </button>
      </div>
    </section>

    <section v-if="embedded && !fullscreenActive" class="glass-panel international-embedded-toolbar">
      <div class="international-embedded-title">
        <p class="section-kicker">INTERNATIONAL SERVICE QUALIFICATION MAP</p>
        <h2>International Service Qualification Map</h2>
        <span>Enabled accounts only. Excluded rows can be exported for review.</span>
      </div>
      <div class="qualification-header-actions">
        <input
          ref="fileInputRef"
          class="hidden-file-input"
          type="file"
          accept=".xlsx,.xls"
          multiple
          @change="handleFileImport"
        />
        <button v-if="allowImport" class="primary-button" type="button" :disabled="interactionDisabled" @click="openImporter">
          <Upload :size="18" />
          <span>Import Excel</span>
        </button>
        <button
          class="ghost-button"
          :class="{ locked: !canExportExcel }"
          type="button"
          :disabled="interactionDisabled || Boolean(activeExportKey) || (canExportExcel && !dashboard.filteredRecordCount)"
          :title="!canExportExcel ? 'Excel export is not enabled in the current license.' : ''"
          @click="exportCurrentResult"
        >
          <LoaderCircle v-if="activeExportKey === 'current'" class="spin" :size="18" />
          <Download v-else :size="18" />
          <span>Export Current</span>
        </button>
        <button
          class="ghost-button"
          :class="{ locked: !canExportExcel }"
          type="button"
          :disabled="interactionDisabled || Boolean(activeExportKey) || (canExportExcel && !dirtyRowCount)"
          :title="!canExportExcel ? 'Excel export is not enabled in the current license.' : !dirtyRowCount ? 'No dirty rows to export.' : ''"
          @click="exportDirtyRows"
        >
          <LoaderCircle v-if="activeExportKey === 'dirty'" class="spin" :size="18" />
          <Download v-else :size="18" />
          <span>Export Dirty Rows</span>
        </button>
        <button class="ghost-button" type="button" :disabled="interactionDisabled" @click="resetFilters">
          <RotateCcw :size="18" />
          <span>Reset Filters</span>
        </button>
        <button class="ghost-button fullscreen-toggle-button" type="button" @click="toggleBrowserFullscreen">
          <Maximize2 :size="18" />
          <span>Browser Fullscreen</span>
        </button>
      </div>
    </section>

    <section v-if="fullscreenActive" class="fullscreen-training-toolbar">
      <div class="fullscreen-training-title">
        <strong>International Service Qualification Map</strong>
        <span>Engineer Service Qualification</span>
      </div>
      <div
        class="fullscreen-training-actions"
        :class="{ visible: fullscreenControlsVisible }"
        @mouseenter="handleFullscreenControlsMouseEnter"
        @mouseleave="handleFullscreenControlsMouseLeave"
        @mousemove.stop
      >
        <input
          ref="fileInputRef"
          class="hidden-file-input"
          type="file"
          accept=".xlsx,.xls"
          multiple
          @change="handleFileImport"
        />
        <button v-if="allowImport" class="primary-button compact" type="button" :disabled="interactionDisabled" @click="openImporter">
          <Upload :size="16" />
          <span>Import Excel</span>
        </button>
        <button
          class="ghost-button compact"
          :class="{ locked: !canExportExcel }"
          type="button"
          :disabled="interactionDisabled || Boolean(activeExportKey) || (canExportExcel && !dashboard.filteredRecordCount)"
          @click="exportCurrentResult"
        >
          <LoaderCircle v-if="activeExportKey === 'current'" class="spin" :size="16" />
          <Download v-else :size="16" />
          <span>Export</span>
        </button>
        <button class="ghost-button compact" :class="{ active: fullscreenFiltersOpen }" type="button" @click="fullscreenFiltersOpen = !fullscreenFiltersOpen">
          <Search :size="16" />
          <span>Filters</span>
        </button>
        <button class="ghost-button compact fullscreen-toggle-button" type="button" @click="toggleBrowserFullscreen">
          <Minimize2 :size="16" />
          <span>Exit</span>
        </button>
      </div>
    </section>

    <section v-if="!fullscreenActive || fullscreenFiltersOpen" class="glass-panel qualification-filter-panel">
      <div class="panel-title-row">
        <div>
          <p class="section-kicker">Filter Controls</p>
          <h2>Filters</h2>
        </div>
        <span class="status-pill" :class="hasData ? 'success' : 'warning'">
          {{ loading ? 'Processing data' : dataStatusText }}
        </span>
      </div>

      <div class="qualification-filter-grid international-filter-grid">
        <QualificationFilterSelect
          v-for="field in filterFields"
          :key="field.key"
          v-model="draftFilters[field.key]"
          :label="field.label"
          :options="getFilterOptions(field.key)"
          :all-options="allOptions[field.key]"
          preserve-external-values
          searchable
          :search-placeholder="field.placeholder"
          collapse-label="Collapse"
          all-label="All"
          empty-text="No options"
          all-selected-text="All"
          unselected-text="Not selected"
          multi-separator=", "
        />

        <div class="qualification-filter-actions">
          <button class="primary-button" type="button" :disabled="interactionDisabled" @click="applyFilters">
            <Search :size="17" />
            <span>Search</span>
          </button>
          <button class="ghost-button" type="button" :disabled="interactionDisabled" @click="resetFilters">
            <Eraser :size="17" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      <div v-if="warningMessage" class="qualification-warning-list">
        <AlertTriangle :size="16" />
        <span>{{ warningMessage }}</span>
      </div>
      <div v-if="dirtyRowCount && !warningMessage" class="qualification-warning-list">
        <AlertTriangle :size="16" />
        <span>{{ dirtyRowCount.toLocaleString('en-US') }} rows were excluded. Export dirty rows to review the full original rows and reasons.</span>
      </div>
    </section>

    <section v-if="!fullscreenActive" class="qualification-metric-grid">
      <article v-for="metric in metricCards" :key="metric.key" class="metric-card" :class="metric.tone">
        <component :is="metric.icon" :size="20" />
        <span class="qualification-metric-label">{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
      </article>
    </section>

    <section class="qualification-main-grid">
      <div class="training-map-stage">
        <section v-if="fullscreenActive" class="fullscreen-kpi-overlay">
          <article v-for="metric in fullscreenMetricCards" :key="`fullscreen-${metric.key}`" class="fullscreen-kpi-card" :class="metric.tone">
            <span>{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
          </article>
        </section>
        <InternationalQualificationWorldMap
          :points="dashboard.mapPoints"
          :loading="loading"
          :active="visualsActive"
          :fullscreen-active="fullscreenActive && !fullscreenFiltersOpen"
          :selected-country="selectedCountry"
          :focused-country="selectedCountry"
          :selected-regions="appliedFilters.secondaryRegions"
          :empty-text="emptyStateText"
          @select-country="openCountryDetail"
        />
      </div>

      <aside class="qualification-side-panel">
        <section class="glass-panel qualification-side-tabs">
          <div class="qualification-side-tabs-head">
            <div>
              <p class="section-kicker">Ranking And Analysis</p>
              <h2>Ranking & Analysis</h2>
            </div>
            <div class="qualification-tab-nav">
              <button
                v-for="tab in sideTabs"
                :key="tab.key"
                class="qualification-tab-button"
                :class="{ active: activeSideTab === tab.key }"
                type="button"
                @click="activeSideTab = tab.key"
              >
                {{ tab.label }}
              </button>
            </div>
          </div>

          <div class="qualification-tab-body">
            <div v-if="activeSideTab === 'country'" class="qualification-tab-panel">
              <div class="qualification-tab-caption">
                <span>Country Valid Qualification TOP10</span>
                <strong>{{ dashboard.topValidCountries.length }}</strong>
              </div>
              <div v-if="dashboard.topValidCountries.length" class="qualification-rank-list scrollable">
                <button
                  v-for="(item, index) in displayedValidCountries"
                  :key="item.country"
                  class="qualification-rank-row"
                  :class="{ focused: selectedCountry === item.country }"
                  type="button"
                  @click="openCountryDetail(item.country)"
                >
                  <span class="rank-index">{{ index + 1 }}</span>
                  <span class="rank-branch">{{ item.country }}</span>
                  <strong>{{ formatShortNumber(item.validQualifications) }}</strong>
                </button>
              </div>
              <div v-else class="chart-empty-state compact in-tab">
                <ListOrdered :size="20" />
                <span>{{ emptyStateText }}</span>
              </div>
            </div>

            <div v-else-if="activeSideTab === 'risk'" class="qualification-tab-panel">
              <div class="qualification-tab-caption">
                <span>Country Risk TOP10</span>
                <strong>{{ dashboard.topRiskCountries.length }}</strong>
              </div>
              <div v-if="dashboard.topRiskCountries.length" class="qualification-rank-list scrollable">
                <button
                  v-for="(item, index) in displayedRiskCountries"
                  :key="item.country"
                  class="qualification-rank-row"
                  :class="{ focused: selectedCountry === item.country }"
                  type="button"
                  @click="openCountryDetail(item.country)"
                >
                  <span class="rank-index">{{ index + 1 }}</span>
                  <span class="rank-branch">{{ item.country }}</span>
                  <strong>{{ formatShortNumber(item.expiredQualifications + item.expiring30) }}</strong>
                </button>
              </div>
              <div v-else class="chart-empty-state compact in-tab">
                <AlertTriangle :size="20" />
                <span>No risk data.</span>
              </div>
            </div>

            <div v-else-if="activeSideTab === 'productLine'" class="qualification-tab-panel analysis single">
              <EChartPanel
                title="Product Line Distribution"
                kicker="Product Line"
                :option="productLineBarOption"
                :loading="loading"
                loading-text="Loading chart..."
                :active="visualsActive"
                :height="productLineChartHeight"
                :empty-text="emptyStateText"
                panelless
              />
            </div>

            <div v-else class="qualification-tab-panel analysis single">
              <EChartPanel
                title="Qualification Type Distribution"
                kicker="Qualification Type"
                :option="qualificationTypeBarOption"
                :loading="loading"
                loading-text="Loading chart..."
                :active="visualsActive"
                :height="qualificationTypeChartHeight"
                empty-text="No qualification type data."
                panelless
              />
            </div>
          </div>
        </section>
      </aside>
    </section>

    <Transition name="disclaimer-fade">
      <div v-if="countryDetail.countryStat" class="qualification-drawer-backdrop" @click.self="closeCountryDetail">
        <aside class="qualification-drawer">
          <div class="qualification-drawer-head">
            <div>
              <p class="section-kicker">Country Detail</p>
              <h2>{{ countryDetail.countryStat.country }} Qualification Detail</h2>
            </div>
            <div class="qualification-drawer-actions">
              <button
                class="ghost-button"
                :class="{ locked: !canExportExcel }"
                type="button"
                :disabled="Boolean(activeExportKey) || (canExportExcel && !countryDetail.recordCount)"
                :title="!canExportExcel ? 'Excel export is not enabled in the current license.' : ''"
                @click="exportCountryDetail"
              >
                <LoaderCircle v-if="activeExportKey === 'country'" class="spin" :size="17" />
                <Download v-else :size="17" />
                <span>Export Country Detail</span>
              </button>
              <button class="icon-button" type="button" @click="closeCountryDetail">
                <X :size="18" />
              </button>
            </div>
          </div>

          <div class="qualification-drawer-metrics">
            <article v-for="metric in countryMetricCards" :key="metric.label" class="metric-card" :class="metric.tone">
              <component :is="metric.icon" :size="18" />
              <span>{{ metric.label }}</span>
              <strong>{{ metric.value }}</strong>
            </article>
          </div>

          <div class="qualification-drawer-chart-grid">
            <EChartPanel
              title="Product Line Distribution"
              kicker="Country Product Line"
              :option="countryProductLineOption"
              :active="visualsActive"
              loading-text="Loading chart..."
              height="220px"
              empty-text="No product line data."
            />
            <EChartPanel
              title="Qualification Type Distribution"
              kicker="Country Type Mix"
              :option="countryTypeOption"
              :active="visualsActive"
              loading-text="Loading chart..."
              height="220px"
              empty-text="No qualification type data."
            />
            <EChartPanel
              title="Expiry Risk Distribution"
              kicker="Country Risk"
              :option="countryRiskOption"
              :active="visualsActive"
              loading-text="Loading chart..."
              height="220px"
              empty-text="No risk data."
            />
          </div>
        </aside>
      </div>
    </Transition>

    <QualificationImportOverlay
      :visible="importOverlay.visible"
      :mode="importOverlay.mode"
      :progress="importOverlay.progress"
      :message="importOverlay.message"
      :steps="importOverlay.steps"
      :error-title="importOverlay.errorTitle"
      :error-message="importOverlay.errorMessage"
      progress-label="Progress"
      default-title="Importing international qualification data"
      default-subtitle="The system is reading Excel, matching regions and countries, and preparing the offline world map."
      default-message="Preparing import..."
      success-title="Import completed"
      success-subtitle="International qualification data has been parsed and the map is refreshing."
      success-message="Map, filters, metrics, rankings, and dirty-row export are ready."
      default-error-title="Import failed"
      default-error-subtitle="Please check Excel headers, account status, region, and country fields."
      default-error-message="Please check whether the Excel header structure is correct."
      pending-label="Pending"
      processing-label="Processing"
      completed-label="Completed"
      failed-label="Failed"
      retry-label="Retry Import"
      close-label="Close"
      @retry="openImporter"
      @close="closeImportOverlay"
    />

    <BlockingOperationModal
      :visible="Boolean(activeExportKey)"
      title="Processing Export"
      message="Please wait until the current Excel file is generated."
    />

    <BlockingOperationModal
      :visible="querying"
      :kicker="queryingAction === 'reset' ? 'RESETTING' : 'SEARCHING'"
      :title="queryingAction === 'reset' ? 'Resetting filters...' : 'Searching...'"
      :message="queryingAction === 'reset'
        ? 'Restoring all filter options and refreshing the map, metrics, and rankings.'
        : 'Applying the current filters and refreshing the map, metrics, and rankings.'"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch, watchEffect } from 'vue';
import {
  AlertTriangle,
  CalendarClock,
  CircleX,
  Download,
  Eraser,
  Globe2,
  ListOrdered,
  LoaderCircle,
  Maximize2,
  Minimize2,
  RotateCcw,
  Search,
  ShieldCheck,
  Upload,
  Users,
  WalletCards,
  X
} from 'lucide-vue-next';
import QualificationFilterSelect from '../components/QualificationFilterSelect.vue';
import InternationalQualificationWorldMap from '../components/InternationalQualificationWorldMap.vue';
import EChartPanel from '../components/EChartPanel.vue';
import QualificationImportOverlay from '../components/QualificationImportOverlay.vue';
import BlockingOperationModal from '../components/BlockingOperationModal.vue';
import { DEFAULT_INTERNATIONAL_QUALIFICATION_FILTERS } from '../utils/internationalQualificationAggregator';
import { parseInternationalQualificationFiles } from '../utils/internationalQualificationParser';

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
  },
  embedded: {
    type: Boolean,
    default: false
  },
  allowImport: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['status-change', 'log', 'feature-blocked', 'enter-fullscreen', 'exit-fullscreen', 'dataset-updated']);

const TOP_LIST_LIMIT = 10;
const CHART_TOP_LIMIT = 10;
const FILTER_OPTION_DEBOUNCE_MS = 140;
const filterFields = [
  { key: 'secondaryRegions', label: 'Secondary Region', placeholder: 'Search secondary region' },
  { key: 'countries', label: 'Country', placeholder: 'Search country' },
  { key: 'productLines', label: 'Product Line', placeholder: 'Search product line' },
  { key: 'subProductLines', label: 'Sub-line', placeholder: 'Search sub-line' },
  { key: 'modelCategories', label: 'Model Category', placeholder: 'Search model category' },
  { key: 'qualificationTypes', label: 'Qualification Type', placeholder: 'Search qualification type' }
];
const sideTabs = [
  { key: 'country', label: 'Country TOP10' },
  { key: 'risk', label: 'Risk TOP10' },
  { key: 'productLine', label: 'Product Line' },
  { key: 'qualificationType', label: 'Qualification Type' }
];

const fileInputRef = ref(null);
const datasetMeta = shallowRef(createEmptyDatasetMetadata());
const dirtyRowCount = ref(0);
const importWarnings = ref([]);
const loading = ref(false);
const querying = ref(false);
const queryingAction = ref('search');
const activeExportKey = ref('');
const warningMessage = ref('');
const selectedCountry = ref('');
const activeSideTab = ref('country');
const fullscreenFiltersOpen = ref(false);
const fullscreenControlsVisible = ref(true);
let fullscreenControlsTimer = null;
let importOverlayCloseTimer = null;
let filterOptionTimer = null;
let filterOptionRequestId = 0;
let countryDetailRequestId = 0;

const allOptions = reactive(createEmptyOptions());
const dynamicOptions = shallowRef(createEmptyOptions());
const draftFilters = reactive(cloneFilters(DEFAULT_INTERNATIONAL_QUALIFICATION_FILTERS));
const appliedFilters = reactive(cloneFilters(DEFAULT_INTERNATIONAL_QUALIFICATION_FILTERS));
const dashboard = shallowRef(createEmptyDashboard());
const countryDetail = shallowRef(createEmptyCountryDetail());
const importOverlay = reactive({
  visible: false,
  mode: 'progress',
  progress: 0,
  message: '',
  errorTitle: '',
  errorMessage: '',
  steps: createImportSteps()
});

const hasData = computed(() => datasetMeta.value.recordCount > 0);
const visualsActive = computed(() => props.active);
const emptyStateText = computed(() => hasData.value ? 'No data matches the current filters.' : 'Import International Service Qualification Data from the Global tab.');
const dataStatusText = computed(() => {
  if (!hasData.value) return 'Waiting for import';
  return `${dashboard.value.filteredRecordCount.toLocaleString('en-US')} rows in current result`;
});

const metricCards = computed(() => [
  { key: 'totalPeople', label: 'Certified Engineers', value: formatNumber(dashboard.value.summary.totalPeople), icon: Users, tone: 'blue' },
  { key: 'validQualifications', label: 'Valid Qualifications', value: formatNumber(dashboard.value.summary.validQualifications), icon: ShieldCheck, tone: 'cyan' },
  { key: 'coveredCountries', label: 'Covered Countries', value: formatNumber(dashboard.value.summary.coveredCountries), icon: Globe2, tone: 'green' },
  { key: 'coveredPartners', label: 'Covered Partners', value: formatNumber(dashboard.value.summary.coveredPartners), icon: WalletCards, tone: 'orange' }
]);
const fullscreenMetricCards = computed(() => metricCards.value.map((metric) => ({
  key: metric.key,
  label: metric.label,
  value: metric.value,
  tone: metric.tone
})));

const displayedValidCountries = computed(() => dashboard.value.topValidCountries.slice(0, TOP_LIST_LIMIT));
const displayedRiskCountries = computed(() => dashboard.value.topRiskCountries.slice(0, TOP_LIST_LIMIT));
const productLineBarOption = computed(() => buildBarOption(dashboard.value.productLineDistribution, 'Valid Qualifications'));
const qualificationTypeBarOption = computed(() => buildBarOption(dashboard.value.qualificationTypeDistribution, 'Valid Qualifications'));
const productLineChartHeight = computed(() => chartHeightForRows(Math.min(dashboard.value.productLineDistribution.length, CHART_TOP_LIMIT), 248));
const qualificationTypeChartHeight = computed(() => chartHeightForRows(Math.min(dashboard.value.qualificationTypeDistribution.length, CHART_TOP_LIMIT), 248));

const countryMetricCards = computed(() => {
  const stat = countryDetail.value.countryStat;
  if (!stat) return [];
  return [
    { label: 'Certified Engineers', value: formatNumber(stat.totalPeople), icon: Users, tone: 'blue' },
    { label: 'Valid Qualifications', value: formatNumber(stat.validQualifications), icon: ShieldCheck, tone: 'cyan' },
    { label: 'Expiring 30 Days', value: formatNumber(stat.expiring30), icon: CalendarClock, tone: 'orange' },
    { label: 'Expired', value: formatNumber(stat.expiredQualifications), icon: CircleX, tone: 'red' }
  ];
});
const countryProductLineOption = computed(() => buildBarOption(countryDetail.value.productLineDistribution || [], 'Valid Qualifications', 6));
const countryTypeOption = computed(() => buildBarOption(countryDetail.value.qualificationTypeDistribution || [], 'Valid Qualifications', 6));
const countryRiskOption = computed(() => buildTrendOption(countryDetail.value.expiryDistribution || []));

watchEffect(() => {
  if (!props.fullscreenActive && fullscreenFiltersOpen.value) {
    fullscreenFiltersOpen.value = false;
  }
  if (!props.active) return;
  if (loading.value) {
    emit('status-change', 'International qualification data is processing.');
    return;
  }
  emit('status-change', hasData.value
    ? `International qualification map ready, ${dashboard.value.filteredRecordCount.toLocaleString('en-US')} rows in current result`
    : 'International service qualification map is waiting for import.');
});

watch(
  () => props.active,
  (isActive) => {
    if (isActive && hasData.value) refreshDashboardFromBackend();
  }
);

watch(
  () => filterFields.map((field) => draftFilters[field.key]),
  () => {
    scheduleFilterOptionRefresh();
  },
  { deep: true }
);

onMounted(() => {
  loadBackendDataset();
});

onBeforeUnmount(() => {
  clearTimeout(fullscreenControlsTimer);
  clearTimeout(importOverlayCloseTimer);
  clearTimeout(filterOptionTimer);
});

function openImporter() {
  if (interactionDisabled.value) return;
  fileInputRef.value?.click();
}

async function handleFileImport(event) {
  const files = Array.from(event.target.files || []);
  event.target.value = '';
  if (!files.length) return;

  loading.value = true;
  warningMessage.value = '';
  selectedCountry.value = '';
  resetImportOverlay();
  importOverlay.visible = true;

  try {
    const result = await parseInternationalQualificationFiles(files, {
      onProgress: updateImportProgress
    });

    // Keep parsed rows only long enough to hand them to the local service.
    updateImportProgress({ step: 'chart', status: 'processing', progress: 94, message: 'Saving the local query dataset...' });
    await nextTick();
    await yieldToBrowser();
    const metadata = await requestInternationalApi('/api/international-qualification/dataset', {
      method: 'POST',
      body: {
        records: result.records || [],
        dirtyRows: result.dirtyRows || [],
        warnings: result.warnings || []
      }
    });
    applyDatasetMetadata(metadata);
    assignFilters(draftFilters, createAllSelectedFilters(allOptions));
    assignFilters(appliedFilters, draftFilters);
    await refreshDashboardFromBackend();
    emit('dataset-updated');

    importOverlay.mode = 'success';
    importOverlay.progress = 100;
    importOverlay.message = `Imported ${datasetMeta.value.recordCount.toLocaleString('en-US')} valid rows. Excluded ${dirtyRowCount.value.toLocaleString('en-US')} rows.`;
    scheduleImportOverlayClose();
    emit('log', `International qualification import completed: ${datasetMeta.value.recordCount} valid rows, ${dirtyRowCount.value} dirty rows.`);
    if (dirtyRowCount.value) {
      warningMessage.value = `${dirtyRowCount.value.toLocaleString('en-US')} rows were excluded. Export dirty rows to review the reasons.`;
    }
  } catch (error) {
    importOverlay.mode = 'error';
    importOverlay.errorTitle = 'Import failed';
    importOverlay.errorMessage = error.message || 'Failed to import international qualification data.';
    markCurrentImportStepFailed();
    emit('log', `International qualification import failed: ${importOverlay.errorMessage}`);
  } finally {
    loading.value = false;
    scheduleFilterOptionRefresh(0);
  }
}

async function importFiles(files) {
  await handleFileImport({ target: { files, value: '' } });
}

async function getDatasetStatus() {
  try {
    const metadata = await requestInternationalApi('/api/international-qualification/dataset');
    return {
      recordCount: Number(metadata?.recordCount || 0),
      dirtyRowCount: Number(metadata?.dirtyRowCount || 0),
      updatedAt: metadata?.updatedAt || ''
    };
  } catch (error) {
    return { recordCount: 0, dirtyRowCount: 0, updatedAt: '' };
  }
}

defineExpose({ importFiles, getDatasetStatus });

async function applyFilters() {
  if (!hasData.value) {
    warningMessage.value = 'Please import international qualification data first.';
    return;
  }
  const missingFields = filterFields.filter((field) => !draftFilters[field.key]?.length).map((field) => field.label);
  if (missingFields.length) {
    warningMessage.value = `Please select: ${missingFields.join(', ')}. "All" is also a valid selection.`;
    return;
  }
  queryingAction.value = 'search';
  querying.value = true;
  await nextTick();
  await yieldToBrowser();
  try {
    warningMessage.value = dirtyRowCount.value
      ? `${dirtyRowCount.value.toLocaleString('en-US')} rows were excluded. Export dirty rows to review the reasons.`
      : '';
    assignFilters(appliedFilters, draftFilters);
    countryDetail.value = createEmptyCountryDetail();
    await refreshDashboardFromBackend();
  } finally {
    querying.value = false;
    scheduleFilterOptionRefresh(0);
  }
}

async function resetFilters() {
  if (!hasData.value) {
    warningMessage.value = 'Please import international qualification data first.';
    return;
  }
  queryingAction.value = 'reset';
  querying.value = true;
  await nextTick();
  await yieldToBrowser();
  try {
    assignFilters(draftFilters, createAllSelectedFilters(allOptions));
    assignFilters(appliedFilters, draftFilters);
    selectedCountry.value = '';
    countryDetail.value = createEmptyCountryDetail();
    await refreshDashboardFromBackend();
    warningMessage.value = dirtyRowCount.value
      ? `${dirtyRowCount.value.toLocaleString('en-US')} rows were excluded. Export dirty rows to review the reasons.`
      : '';
  } finally {
    querying.value = false;
    scheduleFilterOptionRefresh(0);
  }
}

async function exportCurrentResult() {
  if (!guardExportPermission()) return;
  activeExportKey.value = 'current';
  try {
    await yieldToBrowser();
    await downloadInternationalExport('/api/international-qualification/export/current', {
      filters: cloneFilters(appliedFilters)
    });
    emit('log', `Exported ${dashboard.value.filteredRecordCount} international qualification rows.`);
  } catch (error) {
    warningMessage.value = error.message || 'Export failed.';
  } finally {
    activeExportKey.value = '';
  }
}

async function exportDirtyRows() {
  if (!guardExportPermission()) return;
  activeExportKey.value = 'dirty';
  try {
    await yieldToBrowser();
    await downloadInternationalExport('/api/international-qualification/export/dirty');
    emit('log', `Exported ${dirtyRowCount.value} international qualification dirty rows.`);
  } catch (error) {
    warningMessage.value = error.message || 'Export failed.';
  } finally {
    activeExportKey.value = '';
  }
}

async function exportCountryDetail() {
  if (!guardExportPermission()) return;
  activeExportKey.value = 'country';
  try {
    await yieldToBrowser();
    await downloadInternationalExport('/api/international-qualification/export/country', {
      country: selectedCountry.value,
      filters: cloneFilters(appliedFilters)
    });
    emit('log', `Exported ${selectedCountry.value} qualification detail.`);
  } catch (error) {
    warningMessage.value = error.message || 'Export failed.';
  } finally {
    activeExportKey.value = '';
  }
}

async function openCountryDetail(country) {
  selectedCountry.value = country;
  countryDetail.value = createEmptyCountryDetail();
  const requestId = ++countryDetailRequestId;
  try {
    const detail = await requestInternationalApi('/api/international-qualification/country-detail', {
      method: 'POST',
      body: { country, filters: cloneFilters(appliedFilters) }
    });
    if (requestId === countryDetailRequestId && selectedCountry.value === country) {
      countryDetail.value = detail;
    }
  } catch (error) {
    if (requestId === countryDetailRequestId) {
      warningMessage.value = error.message || 'Unable to load country detail.';
    }
  }
}

function closeCountryDetail() {
  selectedCountry.value = '';
  countryDetail.value = createEmptyCountryDetail();
  countryDetailRequestId += 1;
}

function getFilterOptions(key) {
  return dynamicOptions.value[key] || [];
}

async function refreshDashboardFromBackend() {
  const result = await requestInternationalApi('/api/international-qualification/query', {
    method: 'POST',
    body: { filters: cloneFilters(appliedFilters) }
  });
  assignFilters(appliedFilters, result.filters || appliedFilters);
  dashboard.value = result.dashboard || createEmptyDashboard();
}

async function loadBackendDataset() {
  try {
    const metadata = await requestInternationalApi('/api/international-qualification/dataset');
    applyDatasetMetadata(metadata);
    const savedFilters = normalizeSavedFilters(metadata.filters, allOptions);
    assignFilters(draftFilters, savedFilters);
    assignFilters(appliedFilters, savedFilters);
    await refreshDashboardFromBackend();
    scheduleFilterOptionRefresh(0);
    warningMessage.value = dirtyRowCount.value
      ? `${dirtyRowCount.value.toLocaleString('en-US')} rows were excluded. Export dirty rows to review the reasons.`
      : '';
  } catch (error) {
    // A first-time user has no local dataset yet, which is an expected state.
    if (error.status && error.status !== 400 && error.status !== 404) {
      warningMessage.value = error.message || 'Unable to load the local dataset.';
    }
  }
}

function applyDatasetMetadata(metadata) {
  datasetMeta.value = {
    recordCount: Number(metadata?.recordCount || 0),
    dirtyRowCount: Number(metadata?.dirtyRowCount || 0),
    updatedAt: metadata?.updatedAt || ''
  };
  dirtyRowCount.value = datasetMeta.value.dirtyRowCount;
  importWarnings.value = metadata?.warnings || [];
  replaceOptions(metadata?.allOptions || createEmptyOptions());
}

function scheduleFilterOptionRefresh(delay = FILTER_OPTION_DEBOUNCE_MS) {
  clearTimeout(filterOptionTimer);
  if (!hasData.value || loading.value || querying.value) return;
  filterOptionTimer = setTimeout(() => {
    refreshDynamicFilterOptions();
  }, delay);
}

async function refreshDynamicFilterOptions() {
  if (!hasData.value || loading.value || querying.value) return;
  const requestId = ++filterOptionRequestId;
  try {
    const result = await requestInternationalApi('/api/international-qualification/filter-options', {
      method: 'POST',
      body: { filters: cloneFilters(draftFilters) }
    });
    if (requestId === filterOptionRequestId) {
      dynamicOptions.value = result.options || createEmptyOptions();
    }
  } catch (error) {
    if (requestId === filterOptionRequestId) {
      dynamicOptions.value = cloneOptions(allOptions);
    }
  }
}

function normalizeSavedFilters(filters, options) {
  if (!filters) return createAllSelectedFilters(options);
  const normalized = cloneFilters(filters);
  filterFields.forEach((field) => {
    const optionSet = new Set(options[field.key] || []);
    normalized[field.key] = (normalized[field.key] || []).filter((value) => optionSet.has(value));
    if (!normalized[field.key].length) {
      normalized[field.key] = [...(options[field.key] || [])];
    }
  });
  return normalized;
}

function replaceOptions(options) {
  filterFields.forEach((field) => {
    allOptions[field.key] = [...(options[field.key] || [])];
  });
  dynamicOptions.value = cloneOptions(allOptions);
}

function assignFilters(target, source) {
  filterFields.forEach((field) => {
    target[field.key] = [...(source[field.key] || [])];
  });
}

function createAllSelectedFilters(options) {
  return Object.fromEntries(filterFields.map((field) => [field.key, [...(options[field.key] || [])]]));
}

function cloneFilters(filters) {
  return {
    secondaryRegions: [...(filters.secondaryRegions || [])],
    countries: [...(filters.countries || [])],
    productLines: [...(filters.productLines || [])],
    subProductLines: [...(filters.subProductLines || [])],
    modelCategories: [...(filters.modelCategories || [])],
    qualificationTypes: [...(filters.qualificationTypes || [])]
  };
}

function cloneOptions(options) {
  return Object.fromEntries(filterFields.map((field) => [field.key, [...(options[field.key] || [])]]));
}

function createEmptyOptions() {
  return cloneFilters(DEFAULT_INTERNATIONAL_QUALIFICATION_FILTERS);
}

function createEmptyDatasetMetadata() {
  return {
    recordCount: 0,
    dirtyRowCount: 0,
    updatedAt: ''
  };
}

function createEmptyDashboard() {
  return {
    filteredRecordCount: 0,
    summary: {
      totalPeople: 0,
      validQualifications: 0,
      totalQualifications: 0,
      coveredCountries: 0,
      coveredPartners: 0
    },
    countryStats: [],
    mapPoints: [],
    topValidCountries: [],
    topRiskCountries: [],
    productLineDistribution: [],
    subProductLineDistribution: [],
    modelCategoryDistribution: [],
    qualificationTypeDistribution: [],
    expiryTrend: []
  };
}

function createEmptyCountryDetail() {
  return {
    country: '',
    recordCount: 0,
    countryStat: null,
    productLineDistribution: [],
    subProductLineDistribution: [],
    qualificationTypeDistribution: [],
    expiryDistribution: []
  };
}

async function requestInternationalApi(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || 'GET',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if (!response.ok) {
    let message = `Request failed (HTTP ${response.status}).`;
    try {
      const errorBody = await response.json();
      message = errorBody?.detail || errorBody?.message || message;
    } catch (_) {
      // The service may return an empty response for a transport-level failure.
    }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function downloadInternationalExport(path, body = null) {
  const response = await fetch(path, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) {
    let message = `Export failed (HTTP ${response.status}).`;
    try {
      const errorBody = await response.json();
      message = errorBody?.detail || errorBody?.message || message;
    } catch (_) {
      // Keep the transport error when the response body cannot be parsed.
    }
    throw new Error(message);
  }

  const disposition = response.headers.get('content-disposition') || '';
  const matchedName = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  const fileName = matchedName || 'international_service_qualification_export.xlsx';
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function resetImportOverlay() {
  clearTimeout(importOverlayCloseTimer);
  importOverlay.mode = 'progress';
  importOverlay.progress = 0;
  importOverlay.message = 'Preparing import...';
  importOverlay.errorTitle = '';
  importOverlay.errorMessage = '';
  importOverlay.steps = createImportSteps();
}

function closeImportOverlay() {
  clearTimeout(importOverlayCloseTimer);
  importOverlay.visible = false;
}

function scheduleImportOverlayClose() {
  clearTimeout(importOverlayCloseTimer);
  importOverlayCloseTimer = setTimeout(() => {
    if (importOverlay.mode === 'success') {
      closeImportOverlay();
    }
  }, 800);
}

function updateImportProgress(event) {
  importOverlay.progress = Math.max(importOverlay.progress, Number(event.progress || 0));
  importOverlay.message = event.message || importOverlay.message;
  importOverlay.steps = importOverlay.steps.map((step) => {
    if (step.key === event.step) return { ...step, status: event.status || 'processing' };
    if (isStepBefore(step.key, event.step) && step.status !== 'failed') return { ...step, status: 'completed' };
    return step;
  });
}

function markCurrentImportStepFailed() {
  const activeStep = importOverlay.steps.find((step) => step.status === 'processing') || importOverlay.steps.find((step) => step.status === 'pending');
  if (!activeStep) return;
  importOverlay.steps = importOverlay.steps.map((step) => step.key === activeStep.key ? { ...step, status: 'failed' } : step);
}

function createImportSteps() {
  return [
    { key: 'read', label: 'Read Excel file', status: 'pending' },
    { key: 'structure', label: 'Recognize fields', status: 'pending' },
    { key: 'clean', label: 'Match regions and countries', status: 'pending' },
    { key: 'status', label: 'Calculate qualification status', status: 'pending' },
    { key: 'chart', label: 'Generate map and charts', status: 'pending' }
  ];
}

function isStepBefore(leftKey, rightKey) {
  const order = createImportSteps().map((step) => step.key);
  return order.indexOf(leftKey) >= 0 && order.indexOf(rightKey) >= 0 && order.indexOf(leftKey) < order.indexOf(rightKey);
}

function guardExportPermission() {
  if (props.canExportExcel) return true;
  emit('feature-blocked', 'Excel Export');
  return false;
}

const interactionDisabled = computed(() => loading.value || querying.value || Boolean(activeExportKey.value));

function toggleBrowserFullscreen() {
  if (props.fullscreenActive) {
    emit('exit-fullscreen');
  } else {
    emit('enter-fullscreen');
  }
}

function handleFullscreenMouseMove() {
  if (!props.fullscreenActive) return;
  fullscreenControlsVisible.value = true;
  clearTimeout(fullscreenControlsTimer);
  fullscreenControlsTimer = setTimeout(() => {
    fullscreenControlsVisible.value = false;
  }, 2600);
}

function handleFullscreenControlsMouseEnter() {
  clearTimeout(fullscreenControlsTimer);
  fullscreenControlsVisible.value = true;
}

function handleFullscreenControlsMouseLeave() {
  if (!props.fullscreenActive) return;
  fullscreenControlsTimer = setTimeout(() => {
    fullscreenControlsVisible.value = false;
  }, 1800);
}

function buildBarOption(seriesData, seriesName, limit = CHART_TOP_LIMIT) {
  if (!seriesData?.length) return null;
  const rows = seriesData.slice(0, limit);
  const displayRows = [...rows].reverse();
  return {
    backgroundColor: 'transparent',
    grid: { left: 92, right: 58, top: 10, bottom: 10, containLabel: true },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false }
    },
    yAxis: {
      type: 'category',
      data: displayRows.map((item) => item.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#d4e6f8',
        width: 92,
        overflow: 'truncate',
        formatter: (value) => truncateLabel(value, 16)
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const current = params?.[0];
        if (!current) return '';
        return `${current.name}<br/>${seriesName}: ${formatNumber(current.value)}`;
      }
    },
    series: [
      {
        name: seriesName,
        type: 'bar',
        data: displayRows.map((item) => ({ name: item.name, value: item.value })),
        barWidth: 12,
        showBackground: true,
        backgroundStyle: {
          color: 'rgba(96, 165, 250, 0.08)',
          borderRadius: 999
        },
        itemStyle: {
          borderRadius: 999,
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#00d4ff' },
              { offset: 1, color: '#00ff88' }
            ]
          }
        },
        label: {
          show: true,
          position: 'right',
          distance: 6,
          color: '#e4f4ff',
          fontWeight: 700,
          formatter: ({ value }) => formatShortNumber(value),
          avoidLabelOverlap: true
        }
      }
    ]
  };
}

function buildTrendOption(seriesData) {
  const rows = (seriesData || []).filter((item) => Number(item.value || 0) > 0);
  if (!rows.length) return null;
  return {
    backgroundColor: 'transparent',
    grid: { left: 46, right: 20, top: 18, bottom: 38, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const current = params?.[0];
        if (!current) return '';
        return `${current.name}<br/>Count: ${formatNumber(current.value)}`;
      }
    },
    xAxis: {
      type: 'category',
      data: rows.map((item) => item.label),
      axisLabel: {
        color: '#b7cde6',
        interval: 0,
        rotate: rows.length > 3 ? 18 : 0,
        width: 70,
        overflow: 'truncate'
      },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.28)' } }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#8db4d8' },
      splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.12)' } }
    },
    series: [
      {
        type: 'bar',
        data: rows.map((item) => item.value),
        barMaxWidth: 24,
        itemStyle: {
          borderRadius: [8, 8, 0, 0],
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#fbbf24' },
              { offset: 1, color: '#0ea5e9' }
            ]
          }
        },
        label: {
          show: true,
          position: 'top',
          color: '#e2e8f0',
          formatter: ({ value }) => formatShortNumber(value)
        }
      }
    ]
  };
}

function chartHeightForRows(rowCount, minHeight) {
  return `${Math.max(minHeight, rowCount * 34 + 42)}px`;
}

function truncateLabel(value, maxLength) {
  const text = String(value || '');
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-US');
}

function formatShortNumber(value) {
  const number = Number(value || 0);
  if (number >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(1)}K`;
  return number.toLocaleString('en-US');
}

function yieldToBrowser() {
  const schedule = typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
    ? window.requestAnimationFrame.bind(window)
    : (callback) => setTimeout(callback, 0);
  return new Promise((resolve) => schedule(() => schedule(resolve)));
}
</script>
