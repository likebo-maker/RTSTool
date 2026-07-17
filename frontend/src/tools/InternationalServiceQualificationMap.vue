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
        <button class="primary-button" type="button" :disabled="interactionDisabled" @click="openImporter">
          <Upload :size="18" />
          <span>Import Excel</span>
        </button>
        <button
          class="ghost-button"
          :class="{ locked: !canExportExcel }"
          type="button"
          :disabled="interactionDisabled || Boolean(activeExportKey) || (canExportExcel && !dashboard.filteredRecords.length)"
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
          :disabled="interactionDisabled || Boolean(activeExportKey) || (canExportExcel && !dirtyRows.length)"
          :title="!canExportExcel ? 'Excel export is not enabled in the current license.' : !dirtyRows.length ? 'No dirty rows to export.' : ''"
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
        <button class="primary-button" type="button" :disabled="interactionDisabled" @click="openImporter">
          <Upload :size="18" />
          <span>Import Excel</span>
        </button>
        <button
          class="ghost-button"
          :class="{ locked: !canExportExcel }"
          type="button"
          :disabled="interactionDisabled || Boolean(activeExportKey) || (canExportExcel && !dashboard.filteredRecords.length)"
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
          :disabled="interactionDisabled || Boolean(activeExportKey) || (canExportExcel && !dirtyRows.length)"
          :title="!canExportExcel ? 'Excel export is not enabled in the current license.' : !dirtyRows.length ? 'No dirty rows to export.' : ''"
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
        <button class="primary-button compact" type="button" :disabled="interactionDisabled" @click="openImporter">
          <Upload :size="16" />
          <span>Import Excel</span>
        </button>
        <button
          class="ghost-button compact"
          :class="{ locked: !canExportExcel }"
          type="button"
          :disabled="interactionDisabled || Boolean(activeExportKey) || (canExportExcel && !dashboard.filteredRecords.length)"
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
      <div v-if="dirtyRows.length && !warningMessage" class="qualification-warning-list">
        <AlertTriangle :size="16" />
        <span>{{ dirtyRows.length.toLocaleString('en-US') }} rows were excluded. Export dirty rows to review the full original rows and reasons.</span>
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
                :disabled="Boolean(activeExportKey) || (canExportExcel && !filteredCountryRows.length)"
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
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch, watchEffect } from 'vue';
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
import { LOCAL_DATASET_KEYS, loadToolDataset, saveToolDataset } from '../services/localDataStore';
import {
  DEFAULT_INTERNATIONAL_QUALIFICATION_FILTERS,
  buildInternationalCountryDetail,
  buildInternationalDynamicFilterOptions,
  buildInternationalQualificationDashboard,
  collectInternationalQualificationOptions
} from '../utils/internationalQualificationAggregator';
import { parseInternationalQualificationFiles } from '../utils/internationalQualificationParser';
import {
  exportInternationalCountryQualificationRecords,
  exportInternationalDirtyRows,
  exportInternationalQualificationRecords
} from '../utils/internationalQualificationExport';

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
  }
});

const emit = defineEmits(['status-change', 'log', 'feature-blocked', 'enter-fullscreen', 'exit-fullscreen']);

const TOP_LIST_LIMIT = 10;
const CHART_TOP_LIMIT = 10;
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
const records = ref([]);
const dirtyRows = ref([]);
const importWarnings = ref([]);
const loading = ref(false);
const activeExportKey = ref('');
const warningMessage = ref('');
const selectedCountry = ref('');
const activeSideTab = ref('country');
const fullscreenFiltersOpen = ref(false);
const fullscreenControlsVisible = ref(true);
let fullscreenControlsTimer = null;
let importOverlayCloseTimer = null;

const allOptions = reactive(createEmptyOptions());
const draftFilters = reactive(cloneFilters(DEFAULT_INTERNATIONAL_QUALIFICATION_FILTERS));
const appliedFilters = reactive(cloneFilters(DEFAULT_INTERNATIONAL_QUALIFICATION_FILTERS));
const dashboard = ref(buildInternationalQualificationDashboard([], appliedFilters));
const importOverlay = reactive({
  visible: false,
  mode: 'progress',
  progress: 0,
  message: '',
  errorTitle: '',
  errorMessage: '',
  steps: createImportSteps()
});

const hasData = computed(() => records.value.length > 0);
const visualsActive = computed(() => props.active);
const emptyStateText = computed(() => hasData.value ? 'No data matches the current filters.' : 'Import international qualification Excel to generate the world map.');
const dataStatusText = computed(() => {
  if (!hasData.value) return 'Waiting for import';
  return `${dashboard.value.filteredRecords.length.toLocaleString('en-US')} rows in current result`;
});

const dynamicFilterOptions = computed(() => {
  if (!hasData.value) return createEmptyOptions();
  return buildInternationalDynamicFilterOptions(records.value, draftFilters, allOptions);
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

const countryDetail = computed(() => {
  if (!selectedCountry.value) return { countryRecords: [], countryStat: null };
  return buildInternationalCountryDetail(selectedCountry.value, dashboard.value.filteredRecords);
});
const filteredCountryRows = computed(() => countryDetail.value.countryRecords || []);
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
    ? `International qualification map ready, ${dashboard.value.filteredRecords.length.toLocaleString('en-US')} rows in current result`
    : 'International service qualification map is waiting for import.');
});

watch(
  () => props.active,
  (isActive) => {
    if (isActive) refreshDashboard();
  }
);

watch(
  dynamicFilterOptions,
  () => {
    pruneDraftFilters();
  },
  { deep: true }
);

onMounted(() => {
  loadSavedDataset();
});

onBeforeUnmount(() => {
  clearTimeout(fullscreenControlsTimer);
  clearTimeout(importOverlayCloseTimer);
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

    records.value = result.records || [];
    dirtyRows.value = result.dirtyRows || [];
    importWarnings.value = result.warnings || [];
    replaceOptions(collectInternationalQualificationOptions(records.value));
    assignFilters(draftFilters, createAllSelectedFilters(allOptions));
    assignFilters(appliedFilters, draftFilters);
    refreshDashboard();
    await saveCurrentDataset();

    importOverlay.mode = 'success';
    importOverlay.progress = 100;
    importOverlay.message = `Imported ${records.value.length.toLocaleString('en-US')} valid rows. Excluded ${dirtyRows.value.length.toLocaleString('en-US')} rows.`;
    scheduleImportOverlayClose();
    emit('log', `International qualification import completed: ${records.value.length} valid rows, ${dirtyRows.value.length} dirty rows.`);
    if (dirtyRows.value.length) {
      warningMessage.value = `${dirtyRows.value.length.toLocaleString('en-US')} rows were excluded. Export dirty rows to review the reasons.`;
    }
  } catch (error) {
    importOverlay.mode = 'error';
    importOverlay.errorTitle = 'Import failed';
    importOverlay.errorMessage = error.message || 'Failed to import international qualification data.';
    markCurrentImportStepFailed();
    emit('log', `International qualification import failed: ${importOverlay.errorMessage}`);
  } finally {
    loading.value = false;
  }
}

function applyFilters() {
  if (!hasData.value) {
    warningMessage.value = 'Please import international qualification data first.';
    return;
  }
  const missingFields = filterFields.filter((field) => !draftFilters[field.key]?.length).map((field) => field.label);
  if (missingFields.length) {
    warningMessage.value = `Please select: ${missingFields.join(', ')}. "All" is also a valid selection.`;
    return;
  }
  warningMessage.value = dirtyRows.value.length
    ? `${dirtyRows.value.length.toLocaleString('en-US')} rows were excluded. Export dirty rows to review the reasons.`
    : '';
  assignFilters(appliedFilters, draftFilters);
  refreshDashboard();
  saveCurrentDataset();
}

function resetFilters() {
  if (!hasData.value) {
    warningMessage.value = 'Please import international qualification data first.';
    return;
  }
  assignFilters(draftFilters, createAllSelectedFilters(allOptions));
  assignFilters(appliedFilters, draftFilters);
  selectedCountry.value = '';
  refreshDashboard();
  warningMessage.value = dirtyRows.value.length
    ? `${dirtyRows.value.length.toLocaleString('en-US')} rows were excluded. Export dirty rows to review the reasons.`
    : '';
  saveCurrentDataset();
}

async function exportCurrentResult() {
  if (!guardExportPermission()) return;
  activeExportKey.value = 'current';
  try {
    await yieldToBrowser();
    exportInternationalQualificationRecords(dashboard.value.filteredRecords);
    emit('log', `Exported ${dashboard.value.filteredRecords.length} international qualification rows.`);
  } finally {
    activeExportKey.value = '';
  }
}

async function exportDirtyRows() {
  if (!guardExportPermission()) return;
  activeExportKey.value = 'dirty';
  try {
    await yieldToBrowser();
    exportInternationalDirtyRows(dirtyRows.value);
    emit('log', `Exported ${dirtyRows.value.length} international qualification dirty rows.`);
  } finally {
    activeExportKey.value = '';
  }
}

async function exportCountryDetail() {
  if (!guardExportPermission()) return;
  activeExportKey.value = 'country';
  try {
    await yieldToBrowser();
    exportInternationalCountryQualificationRecords(selectedCountry.value, filteredCountryRows.value);
    emit('log', `Exported ${selectedCountry.value} qualification detail.`);
  } finally {
    activeExportKey.value = '';
  }
}

function openCountryDetail(country) {
  selectedCountry.value = country;
}

function closeCountryDetail() {
  selectedCountry.value = '';
}

function getFilterOptions(key) {
  return dynamicFilterOptions.value[key] || [];
}

function refreshDashboard() {
  dashboard.value = buildInternationalQualificationDashboard(records.value, appliedFilters);
}

async function saveCurrentDataset() {
  if (!records.value.length) return;
  await saveToolDataset(LOCAL_DATASET_KEYS.INTERNATIONAL_SERVICE_QUALIFICATION_MAP, {
    records: records.value,
    dirtyRows: dirtyRows.value,
    warnings: importWarnings.value,
    filters: cloneFilters(appliedFilters),
    savedAt: new Date().toISOString()
  });
}

async function loadSavedDataset() {
  const record = await loadToolDataset(LOCAL_DATASET_KEYS.INTERNATIONAL_SERVICE_QUALIFICATION_MAP);
  const payload = record?.payload;
  if (!payload?.records?.length) return;

  records.value = payload.records;
  dirtyRows.value = payload.dirtyRows || [];
  importWarnings.value = payload.warnings || [];
  replaceOptions(collectInternationalQualificationOptions(records.value));
  const savedFilters = normalizeSavedFilters(payload.filters, allOptions);
  assignFilters(draftFilters, savedFilters);
  assignFilters(appliedFilters, savedFilters);
  refreshDashboard();
  warningMessage.value = dirtyRows.value.length
    ? `${dirtyRows.value.length.toLocaleString('en-US')} rows were excluded. Export dirty rows to review the reasons.`
    : '';
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

function pruneDraftFilters() {
  filterFields.forEach((field) => {
    const options = getFilterOptions(field.key);
    const optionSet = new Set(options);
    const current = draftFilters[field.key] || [];
    const selected = current.filter((value) => optionSet.has(value));
    if (selected.length !== current.length) {
      draftFilters[field.key] = selected;
    }
  });
}

function replaceOptions(options) {
  filterFields.forEach((field) => {
    allOptions[field.key] = [...(options[field.key] || [])];
  });
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

function createEmptyOptions() {
  return cloneFilters(DEFAULT_INTERNATIONAL_QUALIFICATION_FILTERS);
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

const interactionDisabled = computed(() => loading.value || Boolean(activeExportKey.value));

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
  return new Promise((resolve) => setTimeout(resolve, 0));
}
</script>
