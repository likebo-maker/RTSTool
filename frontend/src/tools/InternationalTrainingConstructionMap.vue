<template>
  <div class="tool-page qualification-page international-training-construction-page" :class="{ 'fullscreen-workspace': fullscreenActive, 'fullscreen-filter-open': fullscreenFiltersOpen }">
    <section v-if="!fullscreenActive" class="tool-header qualification-tool-header">
      <div class="qualification-tool-heading">
        <div class="tool-icon"><Globe2 :size="24" /></div>
        <div>
          <p class="section-kicker">INTERNATIONAL TRAINING CENTER CONSTRUCTION</p>
          <h1>International Training Center Construction Map</h1>
          <p>Visualize international training centers by secondary region, country, certified product line, and course.</p>
        </div>
      </div>
      <div class="qualification-header-actions">
        <input ref="fileInputRef" class="hidden-file-input" type="file" accept=".xlsx,.xls" multiple @change="handleFileImport" />
        <button v-if="allowImport" class="primary-button" type="button" :disabled="interactionDisabled" @click="openImporter"><Upload :size="18" /><span>Import Excel</span></button>
        <button class="ghost-button" :class="{ locked: !canExportExcel }" type="button" :disabled="interactionDisabled || (canExportExcel && !dashboard.filteredRecords.length)" :title="!canExportExcel ? 'Excel export is not enabled in the current license.' : ''" @click="exportCurrentResult"><LoaderCircle v-if="activeExportKey === 'current'" class="spin" :size="18" /><Download v-else :size="18" /><span>Export Current</span></button>
        <button class="ghost-button" :class="{ locked: !canExportExcel }" type="button" :disabled="interactionDisabled" :title="!canExportExcel ? 'Excel export is not enabled in the current license.' : ''" @click="exportDirtyRows"><LoaderCircle v-if="activeExportKey === 'dirty'" class="spin" :size="18" /><Download v-else :size="18" /><span>Export Dirty Data</span></button>
        <button class="ghost-button" type="button" :disabled="interactionDisabled" @click="resetFilters"><RotateCcw :size="18" /><span>Reset Filters</span></button>
        <button class="ghost-button fullscreen-toggle-button" type="button" @click="toggleBrowserFullscreen"><Minimize2 v-if="fullscreenActive" :size="18" /><Maximize2 v-else :size="18" /><span>{{ fullscreenActive ? 'Exit Fullscreen' : 'Browser Fullscreen' }}</span></button>
      </div>
    </section>

    <section v-else class="fullscreen-training-toolbar">
      <div class="fullscreen-training-title"><strong>International Training Center Construction Map</strong><span>Training Center Construction</span></div>
      <div class="fullscreen-training-actions visible">
        <input ref="fileInputRef" class="hidden-file-input" type="file" accept=".xlsx,.xls" multiple @change="handleFileImport" />
        <button v-if="allowImport" class="primary-button compact" type="button" :disabled="interactionDisabled" @click="openImporter"><Upload :size="16" /><span>Import</span></button>
        <button class="ghost-button compact" :class="{ locked: !canExportExcel }" type="button" :disabled="interactionDisabled || (canExportExcel && !dashboard.filteredRecords.length)" @click="exportCurrentResult"><LoaderCircle v-if="activeExportKey === 'current'" class="spin" :size="16" /><Download v-else :size="16" /><span>Export Current</span></button>
        <button class="ghost-button compact" :class="{ locked: !canExportExcel }" type="button" :disabled="interactionDisabled" @click="exportDirtyRows"><LoaderCircle v-if="activeExportKey === 'dirty'" class="spin" :size="16" /><Download v-else :size="16" /><span>Export Dirty Data</span></button>
        <button class="ghost-button compact" :class="{ active: fullscreenFiltersOpen }" type="button" @click="fullscreenFiltersOpen = !fullscreenFiltersOpen"><Search :size="16" /><span>Filters</span></button>
        <button class="ghost-button compact" type="button" :disabled="interactionDisabled" @click="resetFilters"><RotateCcw :size="16" /><span>Reset Filters</span></button>
        <button class="ghost-button compact fullscreen-toggle-button" type="button" @click="toggleBrowserFullscreen"><Minimize2 :size="16" /><span>Exit Fullscreen</span></button>
      </div>
    </section>

    <section v-if="!fullscreenActive || fullscreenFiltersOpen" class="glass-panel qualification-filter-panel">
      <div class="panel-title-row">
        <div><p class="section-kicker">FILTER CONTROLS</p><h2>Filters</h2></div>
        <span class="status-pill" :class="hasData ? 'success' : 'warning'">{{ loading ? 'Processing data' : dataStatusText }}</span>
      </div>
      <div class="international-training-construction-filter-grid">
        <QualificationFilterSelect
          v-for="field in filterFields"
          :key="field.key"
          v-model="draftFilters[field.key]"
          :label="field.label"
          :options="dynamicFilterOptions[field.key] || []"
          :all-options="dynamicFilterOptions[field.key] || []"
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
          <button class="primary-button" type="button" :disabled="interactionDisabled" @click="applyFilters"><Search :size="17" /><span>Search</span></button>
          <button class="ghost-button" type="button" :disabled="interactionDisabled" @click="resetFilters"><Eraser :size="17" /><span>Reset</span></button>
        </div>
      </div>
      <div v-if="warningMessage" class="qualification-warning-list"><AlertTriangle :size="16" /><span>{{ warningMessage }}</span></div>
    </section>

    <section v-if="!fullscreenActive" class="qualification-metric-grid international-construction-metric-grid">
      <article v-for="metric in metricCards" :key="metric.key" class="metric-card" :class="metric.tone"><component :is="metric.icon" :size="20" /><span class="qualification-metric-label">{{ metric.label }}</span><strong>{{ metric.value }}</strong></article>
    </section>

    <section class="qualification-main-grid">
      <div class="training-map-stage">
        <section v-if="fullscreenActive" class="fullscreen-kpi-overlay"><article v-for="metric in metricCards" :key="`fullscreen-${metric.key}`" class="fullscreen-kpi-card" :class="metric.tone"><span>{{ metric.label }}</span><strong>{{ metric.value }}</strong></article></section>
        <InternationalTrainingConstructionWorldMap :active="active" :points="dashboard.mapPoints" :loading="loading" :fullscreen-active="fullscreenActive && !fullscreenFiltersOpen" :selected-center="selectedCenter" :selected-regions="appliedFilters.secondaryRegions" :empty-text="emptyStateText" @select-center="openCenterDetail" />
      </div>

      <aside class="qualification-side-panel">
        <section class="glass-panel qualification-side-tabs">
          <div class="qualification-side-tabs-head">
            <div><p class="section-kicker">RANKING AND ANALYSIS</p><h2>Ranking & Analysis</h2></div>
            <div class="qualification-tab-nav"><button v-for="tab in sideTabs" :key="tab.key" class="qualification-tab-button" :class="{ active: activeSideTab === tab.key }" type="button" @click="activeSideTab = tab.key">{{ tab.label }}</button></div>
          </div>
          <div class="qualification-tab-body">
            <div v-if="activeSideTab === 'center'" class="qualification-tab-panel">
              <div class="qualification-tab-caption"><span>Training Center TOP10</span><strong>{{ dashboard.topCenters.length }}</strong></div>
              <div v-if="dashboard.topCenters.length" class="qualification-rank-list scrollable">
                <button v-for="(item, index) in dashboard.topCenters.slice(0, 10)" :key="item.centerName" class="qualification-rank-row international-center-rank-row" :class="{ focused: selectedCenter === item.centerName }" type="button" @click="openCenterDetail(item.centerName)"><span class="rank-index">{{ index + 1 }}</span><span class="rank-branch">{{ item.centerName }}</span><strong>{{ item.courseCount }}</strong></button>
              </div>
              <div v-else class="chart-empty-state compact in-tab"><ListOrdered :size="20" /><span>{{ emptyStateText }}</span></div>
            </div>
            <div v-else-if="activeSideTab === 'product'" class="qualification-tab-panel analysis single"><EChartPanel title="Product Line Coverage" kicker="PRODUCT LINE" :option="productLineBarOption" :active="active" height="300px" empty-text="No product line data." panelless /></div>
            <div v-else class="qualification-tab-panel">
              <div class="qualification-tab-caption"><span>Country Coverage</span><strong>{{ dashboard.countryStats.length }}</strong></div>
              <div v-if="dashboard.countryStats.length" class="qualification-rank-list scrollable">
                <div v-for="(item, index) in dashboard.countryStats.slice(0, 10)" :key="item.country" class="qualification-rank-row international-center-rank-row"><span class="rank-index">{{ index + 1 }}</span><span class="rank-branch">{{ item.country }}</span><strong>{{ item.centerCount }}</strong></div>
              </div>
              <div v-else class="chart-empty-state compact in-tab"><Globe2 :size="20" /><span>{{ emptyStateText }}</span></div>
            </div>
          </div>
        </section>
      </aside>
    </section>

    <Teleport to="body">
      <div v-if="centerDetail.centerStat" class="qualification-drawer-backdrop" @click.self="closeCenterDetail">
        <aside class="qualification-drawer international-construction-detail-drawer">
          <div class="qualification-drawer-head">
            <div><p class="section-kicker">CENTER DETAIL</p><h2>{{ centerDetail.centerStat.centerName }}</h2><span>{{ centerDetail.centerStat.secondaryRegion }} / {{ centerDetail.centerStat.country }} / {{ centerDetail.centerStat.displayLocation }}</span></div>
            <div class="qualification-drawer-actions"><button class="ghost-button" :class="{ locked: !canExportExcel }" type="button" :disabled="!canExportExcel || Boolean(activeExportKey)" @click="exportCenterDetail"><LoaderCircle v-if="activeExportKey === 'center'" class="spin" :size="17" /><Download v-else :size="17" /><span>Export Detail</span></button><button class="icon-button" type="button" @click="closeCenterDetail"><X :size="18" /></button></div>
          </div>
          <div class="qualification-drawer-metrics">
            <article class="metric-card blue"><Building2 :size="18" /><span>Contract Status</span><strong class="international-detail-status" :class="centerContractDisplay.className">{{ centerContractDisplay.label }}</strong></article>
            <article class="metric-card cyan international-detail-product-line-card">
              <Layers3 :size="18" />
              <span>Product Lines</span>
              <div v-if="centerDetail.centerStat.productLines.length" class="international-detail-product-line-list">
                <b v-for="productLine in centerDetail.centerStat.productLines" :key="productLine">{{ productLine }}</b>
              </div>
              <strong v-else class="international-detail-product-line-empty">Not maintained</strong>
            </article>
            <article class="metric-card green"><BookOpenCheck :size="18" /><span>Courses</span><strong>{{ centerDetail.centerStat.courseCount }}</strong></article>
          </div>
          <section class="international-center-info-grid"><div v-for="item in centerDetail.detailRows" :key="item.label" class="international-center-info-row"><span>{{ item.label }}</span><strong>{{ item.value }}</strong></div></section>
          <div class="qualification-drawer-chart-grid international-construction-detail-charts">
            <EChartPanel title="Product Line Distribution" kicker="CENTER PRODUCT LINE" :option="centerProductLineOption" :active="active" height="260px" empty-text="No product line data." />
            <EChartPanel title="Course Distribution" kicker="CENTER COURSE" :option="centerCourseOption" :active="active" height="260px" empty-text="No course data." />
          </div>
        </aside>
      </div>
    </Teleport>

    <QualificationImportOverlay :visible="importOverlay.visible" :mode="importOverlay.mode" :progress="importOverlay.progress" :message="importOverlay.message" :steps="importOverlay.steps" :error-title="importOverlay.errorTitle" :error-message="importOverlay.errorMessage" progress-label="Progress" default-title="Importing international training centers" default-subtitle="The system is reading Excel, matching local city and capital coordinates, and preparing the offline world map." default-message="Preparing import..." success-title="Import completed" success-subtitle="International training center construction data is ready." success-message="Map, filters, metrics, and center detail are ready." default-error-title="Import failed" default-error-subtitle="Please check the Excel headers for center name, region, and country." default-error-message="Please check the workbook structure." pending-label="Pending" processing-label="Processing" completed-label="Completed" failed-label="Failed" retry-label="Retry Import" close-label="Close" @retry="openImporter" @close="closeImportOverlay" />
    <BlockingOperationModal :visible="Boolean(activeExportKey)" title="Processing Export" message="Please wait until the current Excel file is generated." />
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch, watchEffect } from 'vue';
import { AlertTriangle, BookOpenCheck, Building2, Download, Eraser, Globe2, Layers3, ListOrdered, LoaderCircle, Maximize2, Minimize2, RotateCcw, Search, Upload, X } from 'lucide-vue-next';
import QualificationFilterSelect from '../components/QualificationFilterSelect.vue';
import InternationalTrainingConstructionWorldMap from '../components/InternationalTrainingConstructionWorldMap.vue';
import EChartPanel from '../components/EChartPanel.vue';
import QualificationImportOverlay from '../components/QualificationImportOverlay.vue';
import BlockingOperationModal from '../components/BlockingOperationModal.vue';
import { LOCAL_DATASET_KEYS, loadToolDataset, saveToolDataset } from '../services/localDataStore';
import {
  DEFAULT_INTERNATIONAL_TRAINING_CONSTRUCTION_FILTERS,
  buildInternationalTrainingConstructionCenterDetail,
  buildInternationalTrainingConstructionDashboard,
  buildInternationalTrainingConstructionDynamicOptions,
  cloneInternationalTrainingConstructionFilters,
  collectInternationalTrainingConstructionOptions,
  createAllInternationalTrainingConstructionFilters
} from '../utils/internationalTrainingConstructionAggregator';
import { exportInternationalTrainingConstructionCenterRecords, exportInternationalTrainingConstructionDirtyRows, exportInternationalTrainingConstructionRecords } from '../utils/exportInternationalTrainingConstruction';
import { parseInternationalTrainingConstructionFiles } from '../utils/internationalTrainingConstructionParser';
import { normalizeInternationalTrainingConstructionRecords } from '../utils/internationalTrainingConstructionConfig';
import {
  buildRetainedInternationalTrainingConstructionDirtyRows,
  mergeInternationalTrainingConstructionDirtyRows
} from '../utils/internationalTrainingConstructionDataQuality';
import { runWithMinimumVisibleTime } from '../utils/blockingOperation';

const props = defineProps({ canExportExcel: { type: Boolean, default: true }, fullscreenActive: { type: Boolean, default: false }, active: { type: Boolean, default: true }, allowImport: { type: Boolean, default: true } });
const emit = defineEmits(['status-change', 'log', 'feature-blocked', 'enter-fullscreen', 'exit-fullscreen', 'dataset-updated']);
const filterFields = [
  { key: 'secondaryRegions', label: 'Secondary Region', placeholder: 'Search secondary region' },
  { key: 'countries', label: 'Country', placeholder: 'Search country' },
  { key: 'productLines', label: 'Product Line', placeholder: 'Search product line' },
  { key: 'courses', label: 'Course', placeholder: 'Search course' }
];
const sideTabs = [{ key: 'center', label: 'Center TOP10' }, { key: 'product', label: 'Product Line' }, { key: 'country', label: 'Country Coverage' }];
const fileInputRef = ref(null);
const records = ref([]);
const dirtyRows = ref([]);
const importWarnings = ref([]);
const loading = ref(false);
const activeExportKey = ref('');
const selectedCenter = ref('');
const activeSideTab = ref('center');
const fullscreenFiltersOpen = ref(false);
const warningMessage = ref('');
const draftFilters = reactive(cloneInternationalTrainingConstructionFilters(DEFAULT_INTERNATIONAL_TRAINING_CONSTRUCTION_FILTERS));
const appliedFilters = ref(cloneInternationalTrainingConstructionFilters(DEFAULT_INTERNATIONAL_TRAINING_CONSTRUCTION_FILTERS));
const importOverlay = reactive(createImportOverlay());
let closeTimer = null;

const allOptions = computed(() => collectInternationalTrainingConstructionOptions(records.value));
const dynamicFilterOptions = computed(() => buildInternationalTrainingConstructionDynamicOptions(records.value, draftFilters, allOptions.value));
const dashboard = computed(() => buildInternationalTrainingConstructionDashboard(records.value, appliedFilters.value));
const hasData = computed(() => records.value.length > 0);
const interactionDisabled = computed(() => loading.value || importOverlay.visible || Boolean(activeExportKey.value));
const emptyStateText = computed(() => hasData.value ? 'No data matches the current filters.' : 'Import International Training Center Construction Data from the Global tab.');
const dataStatusText = computed(() => hasData.value ? `${dashboard.value.summary.totalCenters.toLocaleString('en-US')} training centers in current result` : 'Waiting for import');
const metricCards = computed(() => [
  { key: 'total', label: 'Training Centers', value: dashboard.value.summary.totalCenters.toLocaleString('en-US'), icon: Building2, tone: 'blue' },
  { key: 'signed', label: 'Signed Centers', value: dashboard.value.summary.signedCenters.toLocaleString('en-US'), icon: BookOpenCheck, tone: 'green' },
  { key: 'unsigned', label: 'Unsigned Centers', value: dashboard.value.summary.unsignedCenters.toLocaleString('en-US'), icon: AlertTriangle, tone: 'orange' },
  { key: 'internal', label: 'Internal Centers', value: dashboard.value.summary.internalCenters.toLocaleString('en-US'), icon: Building2, tone: 'violet' }
]);
const centerDetail = computed(() => selectedCenter.value ? buildInternationalTrainingConstructionCenterDetail(selectedCenter.value, dashboard.value.filteredRecords) : emptyCenterDetail());
const centerContractDisplay = computed(() => getCenterContractDisplay(centerDetail.value.centerStat));
const productLineBarOption = computed(() => buildBarOption(dashboard.value.productLineDistribution, 'Centers'));
const centerProductLineOption = computed(() => buildBarOption(centerDetail.value.productLineDistribution, 'Relations', true));
const centerCourseOption = computed(() => buildBarOption(centerDetail.value.courseDistribution, 'Relations', true));

onMounted(loadLastDataset);
onBeforeUnmount(() => clearTimeout(closeTimer));
watchEffect(() => {
  if (!props.active) return;
  emit('status-change', loading.value ? 'International training center construction data is processing.' : hasData.value ? `International training construction map ready, ${dashboard.value.summary.totalCenters} centers in current result.` : 'International training center construction map is waiting for import.');
});
watch(() => props.fullscreenActive, (isFullscreen) => { if (!isFullscreen) fullscreenFiltersOpen.value = false; });
watch(
  () => filterFields.map((field) => [...(draftFilters[field.key] || [])]),
  async (nextSelections, previousSelections) => {
    const changedIndex = nextSelections.findIndex((values, index) =>
      values.join('\u0000') !== (previousSelections?.[index] || []).join('\u0000')
    );
    if (changedIndex < 0) return;
    await nextTick();
    pruneInvalidDownstreamSelections(changedIndex);
  },
  { deep: true }
);

function openImporter() { if (!interactionDisabled.value) fileInputRef.value?.click(); }
function toggleBrowserFullscreen() { emit(props.fullscreenActive ? 'exit-fullscreen' : 'enter-fullscreen'); }

async function handleFileImport(event) {
  const files = Array.from(event.target.files || []);
  event.target.value = '';
  if (!files.length) return;
  loading.value = true;
  selectedCenter.value = '';
  warningMessage.value = '';
  resetImportOverlay();
  importOverlay.visible = true;
  try {
    const result = await runWithMinimumVisibleTime(() => parseInternationalTrainingConstructionFiles(files, { onProgress: updateImportProgress }), 650);
    hydrateDataset(result.records || [], result.dirtyRows || []);
    importWarnings.value = result.warnings || [];
    resetFiltersToAll();
    await saveToolDataset(LOCAL_DATASET_KEYS.INTERNATIONAL_TRAINING_CONSTRUCTION_MAP, { records: records.value, dirtyRows: dirtyRows.value, warnings: importWarnings.value, locationSummary: result.locationSummary || {}, importedAt: result.importedAt });
    emit('dataset-updated');
    importOverlay.mode = 'success';
    importOverlay.progress = 100;
    importOverlay.message = `Imported ${dashboard.value.summary.totalCenters.toLocaleString('en-US')} training centers.`;
    warningMessage.value = buildDataQualityWarning();
    emit('log', `International training construction import completed: ${dashboard.value.summary.totalCenters} centers.`);
    closeTimer = setTimeout(closeImportOverlay, 800);
  } catch (error) {
    importOverlay.mode = 'error';
    importOverlay.errorTitle = 'Import failed';
    importOverlay.errorMessage = error.message || 'Failed to import international training center construction data.';
    markImportStepFailed();
    emit('log', `International training construction import failed: ${importOverlay.errorMessage}`);
  } finally {
    loading.value = false;
  }
}

function applyFilters() {
  if (!hasData.value) { warningMessage.value = 'Please import international training center construction data first.'; return; }
  const missing = filterFields.filter((field) => !draftFilters[field.key]?.length).map((field) => field.label);
  if (missing.length) { warningMessage.value = `Please select: ${missing.join(', ')}. "All" is also a valid selection.`; return; }
  appliedFilters.value = cloneInternationalTrainingConstructionFilters(draftFilters);
  selectedCenter.value = '';
  warningMessage.value = buildDataQualityWarning();
  emit('log', `International training construction filters applied: ${dashboard.value.summary.totalCenters} centers.`);
}

function resetFilters() {
  if (!hasData.value) { warningMessage.value = 'Please import international training center construction data first.'; return; }
  resetFiltersToAll();
  selectedCenter.value = '';
  warningMessage.value = buildDataQualityWarning();
}

function resetFiltersToAll() {
  const all = createAllInternationalTrainingConstructionFilters(allOptions.value);
  Object.assign(draftFilters, all);
  appliedFilters.value = cloneInternationalTrainingConstructionFilters(all);
}

function openCenterDetail(centerName) { selectedCenter.value = centerName; }
function closeCenterDetail() { selectedCenter.value = ''; }

function getCenterContractDisplay(center) {
  if (center?.isSigned) return { label: 'Signed', className: 'signed' };
  if (center?.isInternal) return { label: 'Internal (Mindray)', className: 'internal' };
  return { label: 'Unsigned', className: 'unsigned' };
}

async function exportCurrentResult() {
  if (!guardExportPermission() || !dashboard.value.filteredRecords.length) return;
  activeExportKey.value = 'current';
  try {
    await runWithMinimumVisibleTime(() => exportInternationalTrainingConstructionRecords(dashboard.value.filteredRecords));
    emit('log', `Exported ${dashboard.value.filteredRecords.length} international training center construction relations.`);
  } finally { activeExportKey.value = ''; }
}

async function exportCenterDetail() {
  if (!guardExportPermission() || !centerDetail.value.centerRecords.length) return;
  activeExportKey.value = 'center';
  try {
    await runWithMinimumVisibleTime(() => exportInternationalTrainingConstructionCenterRecords(selectedCenter.value, centerDetail.value.centerRecords));
    emit('log', `Exported international training center detail: ${selectedCenter.value}.`);
  } finally { activeExportKey.value = ''; }
}

async function exportDirtyRows() {
  if (!guardExportPermission()) return;
  if (!dirtyRows.value.length) {
    warningMessage.value = 'There is no dirty data to export from the latest import.';
    emit('log', 'No international training construction dirty rows are available for export.');
    return;
  }
  activeExportKey.value = 'dirty';
  try {
    await runWithMinimumVisibleTime(() => exportInternationalTrainingConstructionDirtyRows(dirtyRows.value));
    emit('log', `Exported ${dirtyRows.value.length} international training construction dirty rows.`);
  } finally { activeExportKey.value = ''; }
}

function guardExportPermission() { if (props.canExportExcel) return true; emit('feature-blocked', 'Excel Export'); return false; }

async function importFiles(files) {
  await handleFileImport({ target: { files, value: '' } });
}

defineExpose({ importFiles });

async function loadLastDataset() {
  try {
    const saved = await loadToolDataset(LOCAL_DATASET_KEYS.INTERNATIONAL_TRAINING_CONSTRUCTION_MAP);
    if (!saved?.payload?.records?.length) return;
    hydrateDataset(saved.payload.records, saved.payload.dirtyRows || []);
    importWarnings.value = saved.payload.warnings || [];
    resetFiltersToAll();
    warningMessage.value = buildDataQualityWarning();
  } catch (error) { console.warn('Unable to load international training construction dataset.', error); }
}

function hydrateDataset(sourceRecords, sourceDirtyRows) {
  records.value = normalizeInternationalTrainingConstructionRecords(sourceRecords);
  const retainedDirtyRows = buildRetainedInternationalTrainingConstructionDirtyRows(records.value);
  dirtyRows.value = mergeInternationalTrainingConstructionDirtyRows(sourceDirtyRows, retainedDirtyRows);
}

/**
 * Filter options cascade from left to right. A later selection never rewrites
 * an earlier one; when a parent changes, only incompatible narrowed selections
 * to its right are cleared. A true "All" selection remains stable.
 */
function pruneInvalidDownstreamSelections(changedIndex) {
  for (let index = changedIndex + 1; index < filterFields.length; index += 1) {
    const key = filterFields[index].key;
    const selected = draftFilters[key] || [];
    const base = allOptions.value[key] || [];
    const isAll = base.length > 0 && base.every((value) => selected.includes(value));
    if (isAll || !selected.length) continue;
    const available = new Set(dynamicFilterOptions.value[key] || []);
    const nextValues = selected.filter((value) => available.has(value));
    if (nextValues.length !== selected.length) draftFilters[key] = nextValues;
  }
}

function buildDataQualityWarning() {
  if (!dirtyRows.value.length) return importWarnings.value[0] || '';
  const retained = dirtyRows.value.filter((row) => String(row?.handling || '').startsWith('Retained')).length;
  const excluded = dirtyRows.value.length - retained;
  const parts = [];
  if (excluded) parts.push(`${excluded.toLocaleString('en-US')} excluded`);
  if (retained) parts.push(`${retained.toLocaleString('en-US')} retained with invalid filter values hidden`);
  return `${dirtyRows.value.length.toLocaleString('en-US')} source rows require review: ${parts.join(', ')}. Export Dirty Data for full original rows and reasons.`;
}

function createImportOverlay() { return { visible: false, mode: 'progress', progress: 0, message: 'Preparing import...', errorTitle: '', errorMessage: '', steps: createImportSteps() }; }
function resetImportOverlay() { clearTimeout(closeTimer); Object.assign(importOverlay, createImportOverlay(), { visible: true }); }
function closeImportOverlay() { clearTimeout(closeTimer); importOverlay.visible = false; }
function createImportSteps() { return [{ key: 'read', label: 'Read Excel file', status: 'pending' }, { key: 'structure', label: 'Recognize fields', status: 'pending' }, { key: 'clean', label: 'Match regions and coordinates', status: 'pending' }, { key: 'chart', label: 'Generate map and metrics', status: 'pending' }]; }
function updateImportProgress(event = {}) { importOverlay.progress = Math.max(importOverlay.progress, Number(event.progress || 0)); importOverlay.message = event.message || importOverlay.message; importOverlay.steps = importOverlay.steps.map((step) => step.key === event.step ? { ...step, status: event.status || 'processing' } : step); }
function markImportStepFailed() { const activeStep = importOverlay.steps.find((step) => step.status === 'processing') || importOverlay.steps.find((step) => step.status === 'pending'); if (activeStep) activeStep.status = 'failed'; }
function emptyCenterDetail() { return { centerStat: null, centerRecords: [], productLineDistribution: [], courseDistribution: [], detailRows: [] }; }

function buildBarOption(series, seriesName, isDetail = false) {
  if (!series?.length) return null;
  const rows = series.slice(0, 10).reverse();
  const labelWidth = isDetail ? 138 : 90;
  return {
    backgroundColor: 'transparent', grid: { left: labelWidth, right: 48, top: 10, bottom: 10, containLabel: true },
    xAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false } },
    yAxis: { type: 'category', data: rows.map((item) => item.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#d4e6f8', width: labelWidth, overflow: 'truncate' } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (params) => { const item = params?.[0]; return item ? `${item.name}<br/>${seriesName}: ${Number(item.value).toLocaleString('en-US')}` : ''; } },
    series: [{ name: seriesName, type: 'bar', data: rows.map((item) => item.value), barWidth: 12, showBackground: true, backgroundStyle: { color: 'rgba(96,165,250,0.08)', borderRadius: 999 }, itemStyle: { borderRadius: 999, color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#00d4ff' }, { offset: 1, color: '#00ff88' }] } }, label: { show: true, position: 'right', color: '#e4f4ff', formatter: ({ value }) => Number(value).toLocaleString('en-US') } }]
  };
}
</script>
