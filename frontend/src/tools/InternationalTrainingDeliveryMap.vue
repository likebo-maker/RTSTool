<template>
  <div class="tool-page qualification-page international-training-delivery-page" :class="{ 'fullscreen-workspace': fullscreenActive, 'fullscreen-filter-open': fullscreenFiltersOpen }">
    <section v-if="!fullscreenActive" class="tool-header qualification-tool-header">
      <div class="qualification-tool-heading">
        <div class="tool-icon"><Presentation :size="24" /></div>
        <div><p class="section-kicker">INTERNATIONAL TRAINING CENTER DELIVERY</p><h1>International Training Center Delivery Map</h1><p>Analyze international delivery by secondary region, country, product line, course, and training center.</p></div>
      </div>
      <div class="qualification-header-actions">
        <input ref="fileInputRef" class="hidden-file-input" type="file" accept=".xlsx,.xls" multiple @change="handleFileImport" />
        <button v-if="allowImport" class="primary-button" type="button" :disabled="interactionDisabled" @click="openImporter"><Upload :size="18" /><span>Import Excel</span></button>
        <button class="ghost-button" :class="{ locked: !canExportExcel }" type="button" :disabled="interactionDisabled || (canExportExcel && !dashboard.filteredRecords.length)" @click="exportCurrentResult"><LoaderCircle v-if="activeExportKey === 'current'" class="spin" :size="18" /><Download v-else :size="18" /><span>Export Current</span></button>
        <button class="ghost-button" :class="{ locked: !canExportExcel }" type="button" :disabled="interactionDisabled" @click="exportDirtyRows"><LoaderCircle v-if="activeExportKey === 'dirty'" class="spin" :size="18" /><Download v-else :size="18" /><span>Export Dirty Data</span></button>
        <button class="ghost-button" type="button" :disabled="interactionDisabled" @click="resetFilters"><RotateCcw :size="18" /><span>Reset Filters</span></button>
        <button class="ghost-button fullscreen-toggle-button" type="button" @click="toggleBrowserFullscreen"><Minimize2 v-if="fullscreenActive" :size="18" /><Maximize2 v-else :size="18" /><span>{{ fullscreenActive ? 'Exit Fullscreen' : 'Browser Fullscreen' }}</span></button>
      </div>
    </section>

    <section v-else class="fullscreen-training-toolbar">
      <div class="fullscreen-training-title"><strong>International Training Center Delivery Map</strong><span>Training Center Delivery</span></div>
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
      <div class="panel-title-row"><div><p class="section-kicker">FILTER CONTROLS</p><h2>Filters</h2></div><span class="status-pill" :class="hasData ? 'success' : 'warning'">{{ loading ? 'Processing data' : dataStatusText }}</span></div>
      <div class="international-training-delivery-filter-grid">
        <TrainingDateRangeFilter
          v-model:start-date="draftFilters.startDate"
          v-model:end-date="draftFilters.endDate"
          label="Time"
          :minimum="allOptions.dateBounds?.minimum"
          :maximum="allOptions.dateBounds?.maximum"
        />
        <QualificationFilterSelect v-for="field in filterFields" :key="field.key" v-model="draftFilters[field.key]" :label="field.label" :options="dynamicFilterOptions[field.key] || []" :all-options="allOptions[field.key] || []" preserve-external-values searchable :search-placeholder="field.placeholder" collapse-label="Collapse" all-label="All" empty-text="No options" all-selected-text="All" unselected-text="Not selected" multi-separator=", " />
        <div class="qualification-filter-actions"><button class="primary-button" type="button" :disabled="interactionDisabled" @click="applyFilters"><Search :size="17" /><span>Search</span></button><button class="ghost-button" type="button" :disabled="interactionDisabled" @click="resetFilters"><Eraser :size="17" /><span>Reset</span></button></div>
      </div>
      <div v-if="warningMessage" class="qualification-warning-list"><AlertTriangle :size="16" /><span>{{ warningMessage }}</span></div>
    </section>

    <section v-if="!fullscreenActive" class="qualification-metric-grid">
      <article v-for="metric in metricCards" :key="metric.key" class="metric-card" :class="metric.tone"><component :is="metric.icon" :size="20" /><span class="qualification-metric-label">{{ metric.label }}</span><strong>{{ metric.value }}</strong></article>
    </section>

    <section class="qualification-main-grid">
      <div class="training-map-stage">
        <section v-if="fullscreenActive" class="fullscreen-kpi-overlay"><article v-for="metric in metricCards" :key="`fullscreen-${metric.key}`" class="fullscreen-kpi-card" :class="metric.tone"><span>{{ metric.label }}</span><strong>{{ metric.value }}</strong></article></section>
        <InternationalTrainingDeliveryWorldMap :active="active" :points="dashboard.mapPoints" :region-stats="dashboard.regionStats" :loading="loading" :fullscreen-active="fullscreenActive && !fullscreenFiltersOpen" :selected-point="selectedPoint" :selected-regions="appliedFilters.secondaryRegions" :display-mode="displayMode" :empty-text="emptyStateText" @select-point="openPointDetail" @update:display-mode="displayMode = $event" />
      </div>

      <aside class="qualification-side-panel"><section class="glass-panel qualification-side-tabs">
        <div class="qualification-side-tabs-head"><div><p class="section-kicker">RANKING AND ANALYSIS</p><h2>Ranking & Analysis</h2></div><div class="qualification-tab-nav"><button v-for="tab in sideTabs" :key="tab.key" class="qualification-tab-button" :class="{ active: activeSideTab === tab.key }" type="button" @click="activeSideTab = tab.key">{{ tab.label }}</button></div></div>
        <div class="qualification-tab-body">
          <div v-if="activeSideTab === 'delivery'" class="qualification-tab-panel">
            <div class="qualification-tab-caption"><span>Training Delivery TOP10</span><strong>{{ dashboard.topPoints.length }}</strong></div>
            <div v-if="dashboard.topPoints.length" class="qualification-expandable-block">
              <div class="qualification-rank-list scrollable" :class="{ expanded: expandedSidePanels.delivery }">
                <button v-for="(item, index) in displayedTopPoints" :key="item.pointKey" class="qualification-rank-row international-center-rank-row" :class="{ focused: selectedPoint === item.pointKey }" type="button" @click="openPointDetail(item.pointKey)"><span class="rank-index">{{ index + 1 }}</span><span class="rank-branch">{{ item.organizer }}</span><strong>{{ formatNumber(item.recordCount) }}</strong></button>
              </div>
              <ExpandButton v-if="dashboard.topPoints.length > TOP_LIST_LIMIT" :expanded="expandedSidePanels.delivery" :count="dashboard.topPoints.length" @toggle="toggleSidePanel('delivery')" />
            </div>
            <div v-else class="chart-empty-state compact in-tab"><ListOrdered :size="20" /><span>{{ emptyStateText }}</span></div>
          </div>
          <div v-else-if="activeSideTab === 'failRate'" class="qualification-tab-panel">
            <div class="qualification-tab-caption"><span>Fail Rate TOP10</span><strong>{{ dashboard.failRatePoints.length }}</strong></div>
            <div v-if="dashboard.failRatePoints.length" class="qualification-expandable-block">
              <div class="qualification-rank-list scrollable" :class="{ expanded: expandedSidePanels.failRate }">
                <button v-for="(item, index) in displayedFailRatePoints" :key="item.pointKey" class="qualification-risk-row" type="button" @click="openPointDetail(item.pointKey)"><span class="rank-index">{{ index + 1 }}</span><span class="rank-branch">{{ item.organizer }}</span><strong>{{ item.failRate }}</strong></button>
              </div>
              <ExpandButton v-if="dashboard.failRatePoints.length > TOP_LIST_LIMIT" :expanded="expandedSidePanels.failRate" :count="dashboard.failRatePoints.length" @toggle="toggleSidePanel('failRate')" />
            </div>
            <div v-else class="chart-empty-state compact in-tab"><ShieldAlert :size="20" /><span>{{ emptyStateText }}</span></div>
          </div>
          <div v-else-if="activeSideTab === 'failCount'" class="qualification-tab-panel">
            <div class="qualification-tab-caption"><span>Failed Trainees TOP10</span><strong>{{ dashboard.failCountPoints.length }}</strong></div>
            <div v-if="dashboard.failCountPoints.length" class="qualification-expandable-block">
              <div class="qualification-rank-list scrollable" :class="{ expanded: expandedSidePanels.failCount }">
                <button v-for="(item, index) in displayedFailCountPoints" :key="item.pointKey" class="qualification-risk-row" type="button" @click="openPointDetail(item.pointKey)"><span class="rank-index">{{ index + 1 }}</span><span class="rank-branch">{{ item.organizer }}</span><strong>{{ formatNumber(item.failPersonCount) }}</strong></button>
              </div>
              <ExpandButton v-if="dashboard.failCountPoints.length > TOP_LIST_LIMIT" :expanded="expandedSidePanels.failCount" :count="dashboard.failCountPoints.length" @toggle="toggleSidePanel('failCount')" />
            </div>
            <div v-else class="chart-empty-state compact in-tab"><ShieldAlert :size="20" /><span>{{ emptyStateText }}</span></div>
          </div>
          <div v-else-if="activeSideTab === 'product'" class="qualification-tab-panel">
            <DistributionList title="Product Line Distribution" :rows="displayedProductLines" :expanded="expandedSidePanels.product" />
            <ExpandButton v-if="dashboard.productLineDistribution.length > TOP_LIST_LIMIT" :expanded="expandedSidePanels.product" :count="dashboard.productLineDistribution.length" @toggle="toggleSidePanel('product')" />
          </div>
          <div v-else class="qualification-tab-panel">
            <DistributionList title="Course Distribution" :rows="displayedCourses" :expanded="expandedSidePanels.course" />
            <ExpandButton v-if="dashboard.courseDistribution.length > TOP_LIST_LIMIT" :expanded="expandedSidePanels.course" :count="dashboard.courseDistribution.length" @toggle="toggleSidePanel('course')" />
          </div>
        </div>
      </section></aside>
    </section>

    <section
      v-if="!fullscreenActive"
      class="glass-panel qualification-table-panel international-training-trend-panel"
      :class="{ collapsed: !trendExpanded }"
    >
      <div class="panel-title-row">
        <div><p class="section-kicker">TRAINING TREND</p><h2>Training Trend Analysis</h2></div>
        <button class="ghost-button compact" type="button" @click="trendExpanded = !trendExpanded">
          <span>{{ trendExpanded ? 'Collapse Trend Analysis' : 'Expand Trend Analysis' }}</span>
        </button>
      </div>
      <div v-if="!trendExpanded" class="qualification-collapsed-summary">
        <span>Training trend is collapsed to keep the map workspace compact.</span>
        <strong>{{ dashboard.trendSeries.length }} periods</strong>
      </div>
      <EChartPanel v-else title="Training Trend Analysis" kicker="TRAINING TREND" :option="trendOption" :active="active" height="320px" empty-text="No training trend data." panelless :show-header="false" />
    </section>

    <Teleport to="body"><div v-if="pointDetail.pointStat" class="qualification-drawer-backdrop" @click.self="closePointDetail"><aside class="qualification-drawer international-construction-detail-drawer">
      <div class="qualification-drawer-head"><div><p class="section-kicker">DELIVERY DETAIL</p><h2>{{ pointDetail.pointStat.organizer }}</h2><span>{{ pointDetail.pointStat.displayLocation }} / {{ pointDetail.pointStat.country }}</span></div><div class="qualification-drawer-actions"><button class="ghost-button" :class="{ locked: !canExportExcel }" type="button" :disabled="!canExportExcel || Boolean(activeExportKey)" @click="exportPointDetail"><LoaderCircle v-if="activeExportKey === 'point'" class="spin" :size="17" /><Download v-else :size="17" /><span>Export Detail</span></button><button class="icon-button" type="button" @click="closePointDetail"><X :size="18" /></button></div></div>
      <div class="qualification-drawer-metrics"><article v-for="metric in pointMetricCards" :key="metric.key" class="metric-card" :class="metric.tone"><component :is="metric.icon" :size="18" /><span>{{ metric.label }}</span><strong>{{ metric.value }}</strong></article></div>
      <section class="international-center-info-grid"><div v-for="item in pointDetail.detailRows" :key="item.label" class="international-center-info-row"><span>{{ item.label }}</span><strong>{{ item.value }}</strong></div></section>
      <div class="qualification-drawer-chart-grid international-delivery-detail-charts"><EChartPanel title="Product Line Distribution" kicker="DELIVERY PRODUCT LINE" :option="pointProductBarOption" :active="active" height="260px" empty-text="No product line data." /><EChartPanel title="Course Distribution" kicker="DELIVERY COURSE" :option="pointCourseBarOption" :active="active" height="260px" empty-text="No course data." /><EChartPanel title="Training Cycle Trend" kicker="TRAINING TREND" :option="pointTrendOption" :active="active" height="260px" empty-text="No training trend data." /></div>
    </aside></div></Teleport>

    <QualificationImportOverlay :visible="importOverlay.visible" :mode="importOverlay.mode" :progress="importOverlay.progress" :message="importOverlay.message" :steps="importOverlay.steps" :error-title="importOverlay.errorTitle" :error-message="importOverlay.errorMessage" progress-label="Progress" default-title="Importing international training delivery" default-subtitle="The system is validating construction data, matching training locations, and preparing the offline world map." default-message="Preparing import..." success-title="Import completed" success-subtitle="International training delivery data is ready." success-message="Map, filters, metrics, rankings, and detail are ready." default-error-title="Import failed" default-error-subtitle="Import international construction data first, then check the delivery Excel headers." default-error-message="Please check the workbook structure." pending-label="Pending" processing-label="Processing" completed-label="Completed" failed-label="Failed" retry-label="Retry Import" close-label="Close" @retry="openImporter" @close="closeImportOverlay" />
    <BlockingOperationModal :visible="isFiltering || Boolean(activeExportKey)" :title="activeExportKey ? 'Processing Export' : 'Applying Filters'" :message="activeExportKey ? 'Please wait until the current Excel file is generated.' : 'Updating map points, metrics, and rankings.'" />
  </div>
</template>

<script setup>
import { computed, defineComponent, h, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch, watchEffect } from 'vue';
import { AlertTriangle, Award, BookOpenCheck, ChevronDown, ChevronUp, CircleX, Download, Eraser, ListOrdered, LoaderCircle, Maximize2, Minimize2, Presentation, RotateCcw, Search, ShieldAlert, Upload, Users, X } from 'lucide-vue-next';
import QualificationFilterSelect from '../components/QualificationFilterSelect.vue';
import TrainingDateRangeFilter from '../components/TrainingDateRangeFilter.vue';
import InternationalTrainingDeliveryWorldMap from '../components/InternationalTrainingDeliveryWorldMap.vue';
import EChartPanel from '../components/EChartPanel.vue';
import QualificationImportOverlay from '../components/QualificationImportOverlay.vue';
import BlockingOperationModal from '../components/BlockingOperationModal.vue';
import { LOCAL_DATASET_KEYS, loadToolDataset, saveToolDataset } from '../services/localDataStore';
import { DEFAULT_INTERNATIONAL_TRAINING_DELIVERY_FILTERS, buildInternationalTrainingDeliveryDashboard, buildInternationalTrainingDeliveryDynamicOptions, buildInternationalTrainingDeliveryPointDetail, cloneInternationalTrainingDeliveryFilters, collectInternationalTrainingDeliveryOptions, createAllInternationalTrainingDeliveryFilters } from '../utils/internationalTrainingDeliveryAggregator';
import { exportInternationalTrainingDeliveryDirtyRows, exportInternationalTrainingDeliveryPointRecords, exportInternationalTrainingDeliveryRecords } from '../utils/exportInternationalTrainingDelivery';
import { parseInternationalTrainingDeliveryFiles } from '../utils/internationalTrainingDeliveryParser';
import { normalizeInternationalTrainingDeliveryRecords } from '../utils/internationalTrainingDeliveryConfig';
import { runWithMinimumVisibleTime } from '../utils/blockingOperation';
import { validateTrainingTimeRange } from '../utils/trainingTime';

const props = defineProps({ canExportExcel: { type: Boolean, default: true }, fullscreenActive: { type: Boolean, default: false }, active: { type: Boolean, default: true }, allowImport: { type: Boolean, default: true } });
const emit = defineEmits(['status-change', 'log', 'feature-blocked', 'enter-fullscreen', 'exit-fullscreen', 'dataset-updated']);
const TOP_LIST_LIMIT = 10;
const filterFields = [{ key: 'secondaryRegions', label: 'Secondary Region', placeholder: 'Search secondary region' }, { key: 'countries', label: 'Country', placeholder: 'Search country' }, { key: 'productLines', label: 'Product Line', placeholder: 'Search product line' }, { key: 'courses', label: 'Course', placeholder: 'Search course' }];
const sideTabs = [{ key: 'delivery', label: 'Delivery TOP10' }, { key: 'failRate', label: 'Fail Rate TOP10' }, { key: 'failCount', label: 'Failed Trainees TOP10' }, { key: 'product', label: 'Product Line' }, { key: 'course', label: 'Course' }];
const fileInputRef = ref(null);
const records = ref([]);
const dirtyRows = ref([]);
const importWarnings = ref([]);
const loading = ref(false);
const isFiltering = ref(false);
const activeExportKey = ref('');
const selectedPoint = ref('');
const activeSideTab = ref('delivery');
const displayMode = ref('training-count');
const fullscreenFiltersOpen = ref(false);
const warningMessage = ref('');
const trendExpanded = ref(false);
const expandedSidePanels = reactive({
  delivery: false,
  failRate: false,
  failCount: false,
  product: false,
  course: false
});
const draftFilters = reactive(cloneInternationalTrainingDeliveryFilters(DEFAULT_INTERNATIONAL_TRAINING_DELIVERY_FILTERS));
const appliedFilters = ref(cloneInternationalTrainingDeliveryFilters(DEFAULT_INTERNATIONAL_TRAINING_DELIVERY_FILTERS));
const importOverlay = reactive(createImportOverlay());
let closeTimer = null;

const allOptions = computed(() => collectInternationalTrainingDeliveryOptions(records.value));
const dynamicFilterOptions = computed(() => buildInternationalTrainingDeliveryDynamicOptions(records.value, draftFilters, allOptions.value));
const dashboard = computed(() => buildInternationalTrainingDeliveryDashboard(records.value, appliedFilters.value));
const hasData = computed(() => records.value.length > 0);
const interactionDisabled = computed(() => loading.value || isFiltering.value || importOverlay.visible || Boolean(activeExportKey.value));
const emptyStateText = computed(() => hasData.value ? 'No data matches the current filters.' : 'Import International Training Center Delivery Data from the Global tab.');
const dataStatusText = computed(() => hasData.value ? `${dashboard.value.summary.recordCount.toLocaleString('en-US')} training records in current result` : 'Waiting for import');
const metricCards = computed(() => [
  { key: 'trainees', label: 'Trainees', value: formatNumber(dashboard.value.summary.traineeCount), icon: Users, tone: 'blue' },
  { key: 'records', label: 'Training Records', value: formatNumber(dashboard.value.summary.recordCount), icon: BookOpenCheck, tone: 'cyan' },
  { key: 'sessions', label: 'Sessions', value: formatNumber(dashboard.value.summary.sessionCount), icon: Presentation, tone: 'green' },
  { key: 'passRate', label: 'Pass Rate', value: dashboard.value.summary.passRate, icon: Award, tone: 'green' },
  { key: 'failed', label: 'Failed Training Records', value: formatNumber(dashboard.value.summary.failCount), icon: CircleX, tone: 'red' }
]);
const pointDetail = computed(() => selectedPoint.value ? buildInternationalTrainingDeliveryPointDetail(selectedPoint.value, dashboard.value.filteredRecords) : emptyPointDetail());
const pointMetricCards = computed(() => {
  const stat = pointDetail.value.pointStat;
  if (!stat) return [];
  return [
    { key: 'trainees', label: 'Trainees', value: formatNumber(stat.traineeCount), icon: Users, tone: 'blue' },
    { key: 'records', label: 'Training Records', value: formatNumber(stat.recordCount), icon: BookOpenCheck, tone: 'cyan' },
    { key: 'sessions', label: 'Sessions', value: formatNumber(stat.sessionCount), icon: Presentation, tone: 'green' },
    { key: 'passRate', label: 'Pass Rate', value: stat.passRate, icon: Award, tone: 'green' },
    { key: 'failed', label: 'Failed Records', value: formatNumber(stat.failCount), icon: CircleX, tone: 'red' }
  ];
});
const displayedTopPoints = computed(() => visibleRows(dashboard.value.topPoints, expandedSidePanels.delivery));
const displayedFailRatePoints = computed(() => visibleRows(dashboard.value.failRatePoints, expandedSidePanels.failRate));
const displayedFailCountPoints = computed(() => visibleRows(dashboard.value.failCountPoints, expandedSidePanels.failCount));
const displayedProductLines = computed(() => visibleRows(dashboard.value.productLineDistribution, expandedSidePanels.product));
const displayedCourses = computed(() => visibleRows(dashboard.value.courseDistribution, expandedSidePanels.course));
const pointProductBarOption = computed(() => buildBarOption(pointDetail.value.productLineDistribution, 'Training Records'));
const pointCourseBarOption = computed(() => buildBarOption(pointDetail.value.courseDistribution, 'Training Records'));
const pointTrendOption = computed(() => buildTrendOption(pointDetail.value.trendSeries));
const trendOption = computed(() => buildTrendOption(dashboard.value.trendSeries));

const ExpandButton = defineComponent({
  name: 'InternationalDeliveryExpandButton',
  props: {
    expanded: { type: Boolean, default: false },
    count: { type: Number, default: 0 }
  },
  emits: ['toggle'],
  setup(expandProps, { emit: expandEmit }) {
    return () => h('button', {
      class: 'qualification-expand-button',
      type: 'button',
      onClick: () => expandEmit('toggle')
    }, [
      h(expandProps.expanded ? ChevronUp : ChevronDown, { size: 16 }),
      h('span', expandProps.expanded ? 'Collapse to TOP10' : `Show All ${expandProps.count}`)
    ]);
  }
});

const DistributionList = defineComponent({
  name: 'InternationalDeliveryDistributionList',
  props: {
    title: { type: String, required: true },
    rows: { type: Array, default: () => [] },
    expanded: { type: Boolean, default: false }
  },
  setup(distributionProps) {
    return () => {
      const maximum = Math.max(...distributionProps.rows.map((item) => Number(item.value || 0)), 1);
      return h('section', {
        class: ['international-distribution-panel', { expanded: distributionProps.expanded }]
      }, [
        h('div', { class: 'international-distribution-head' }, [
          h('p', { class: 'section-kicker' }, distributionProps.title.startsWith('Course') ? 'COURSE' : 'PRODUCT LINE'),
          h('h3', distributionProps.title)
        ]),
        distributionProps.rows.length
          ? h('div', { class: 'international-distribution-list' }, distributionProps.rows.map((item) => h('div', {
            key: item.name,
            class: 'international-distribution-row'
          }, [
            h('span', { title: item.name }, item.name),
            h('div', { class: 'international-distribution-bar' }, [
              h('i', { style: { width: `${Math.max(5, (Number(item.value || 0) / maximum) * 100)}%` } })
            ]),
            h('strong', Number(item.value || 0).toLocaleString('en-US'))
          ])))
          : h('div', { class: 'chart-empty-state compact in-tab' }, 'No distribution data.')
      ]);
    };
  }
});

onMounted(loadLastDataset);
onBeforeUnmount(() => clearTimeout(closeTimer));
watchEffect(() => { if (!props.active) return; emit('status-change', loading.value ? 'International training delivery data is processing.' : hasData.value ? `International training delivery map ready, ${dashboard.value.summary.recordCount} records in current result.` : 'International training delivery map is waiting for import.'); });
watch(() => props.fullscreenActive, (isFullscreen) => { if (!isFullscreen) fullscreenFiltersOpen.value = false; });

async function openImporter() {
  if (interactionDisabled.value) return;
  const construction = await loadToolDataset(LOCAL_DATASET_KEYS.INTERNATIONAL_TRAINING_CONSTRUCTION_MAP);
  if (!construction?.payload?.records?.length) {
    warningMessage.value = 'Import International Training Center Construction data before importing delivery data.';
    return;
  }
  fileInputRef.value?.click();
}
function toggleBrowserFullscreen() { emit(props.fullscreenActive ? 'exit-fullscreen' : 'enter-fullscreen'); }

async function handleFileImport(event) {
  const files = Array.from(event.target.files || []);
  event.target.value = '';
  if (!files.length) return;
  loading.value = true;
  selectedPoint.value = '';
  warningMessage.value = '';
  resetImportOverlay();
  importOverlay.visible = true;
  try {
    const construction = await loadToolDataset(LOCAL_DATASET_KEYS.INTERNATIONAL_TRAINING_CONSTRUCTION_MAP);
    const constructionRecords = construction?.payload?.records || [];
    const result = await runWithMinimumVisibleTime(() => parseInternationalTrainingDeliveryFiles(files, { constructionRecords, onProgress: updateImportProgress }), 650);
    records.value = result.records || [];
    dirtyRows.value = result.dirtyRows || [];
    importWarnings.value = result.warnings || [];
    resetFiltersToAll();
    await saveToolDataset(LOCAL_DATASET_KEYS.INTERNATIONAL_TRAINING_DELIVERY_MAP, { records: records.value, dirtyRows: dirtyRows.value, warnings: importWarnings.value, locationSummary: result.locationSummary || {}, importedAt: result.importedAt });
    emit('dataset-updated');
    importOverlay.mode = 'success';
    importOverlay.progress = 100;
    importOverlay.message = `Imported ${records.value.length.toLocaleString('en-US')} training records.`;
    warningMessage.value = resolveImportWarning();
    emit('log', `International training delivery import completed: ${records.value.length} records.`);
    closeTimer = setTimeout(closeImportOverlay, 800);
  } catch (error) {
    importOverlay.mode = 'error';
    importOverlay.errorTitle = 'Import failed';
    importOverlay.errorMessage = error.message || 'Failed to import international training delivery data.';
    markImportStepFailed();
    emit('log', `International training delivery import failed: ${importOverlay.errorMessage}`);
  } finally { loading.value = false; }
}

async function applyFilters() {
  if (!hasData.value) { warningMessage.value = 'Please import international training delivery data first.'; return; }
  const dateValidation = validateTrainingTimeRange(draftFilters);
  if (!dateValidation.valid) {
    warningMessage.value = dateValidation.reason === 'reversed'
      ? 'Time From cannot be later than Time To.'
      : 'Select both Time From and Time To.';
    return;
  }
  const missing = filterFields.filter((field) => !draftFilters[field.key]?.length).map((field) => field.label);
  if (missing.length) { warningMessage.value = `Please select: ${missing.join(', ')}. "All" is also a valid selection.`; return; }
  await runFilterOperation(() => { appliedFilters.value = cloneInternationalTrainingDeliveryFilters(draftFilters); selectedPoint.value = ''; });
  warningMessage.value = resolveImportWarning();
  emit('log', `International training delivery filters applied: ${dashboard.value.summary.recordCount} records.`);
}

async function resetFilters() {
  if (!hasData.value) { warningMessage.value = 'Please import international training delivery data first.'; return; }
  await runFilterOperation(() => { resetFiltersToAll(); selectedPoint.value = ''; });
  warningMessage.value = resolveImportWarning();
}

async function runFilterOperation(operation) {
  isFiltering.value = true;
  await nextTick();
  await nextFrame();
  try {
    await runWithMinimumVisibleTime(async () => {
      operation();
      await nextTick();
      await nextFrame();
    }, 450);
  } finally {
    isFiltering.value = false;
  }
}

function resetFiltersToAll() {
  const all = createAllInternationalTrainingDeliveryFilters(allOptions.value);
  Object.assign(draftFilters, all);
  appliedFilters.value = cloneInternationalTrainingDeliveryFilters(all);
}

function visibleRows(rows, expanded) {
  return expanded ? rows : rows.slice(0, TOP_LIST_LIMIT);
}

function toggleSidePanel(panelKey) {
  expandedSidePanels[panelKey] = !expandedSidePanels[panelKey];
}

function openPointDetail(pointKey) { selectedPoint.value = pointKey; }
function closePointDetail() { selectedPoint.value = ''; }

async function exportCurrentResult() {
  if (!guardExportPermission() || !dashboard.value.filteredRecords.length) return;
  activeExportKey.value = 'current';
  try { await runWithMinimumVisibleTime(() => exportInternationalTrainingDeliveryRecords(dashboard.value.filteredRecords)); emit('log', `Exported ${dashboard.value.filteredRecords.length} international delivery records.`); } finally { activeExportKey.value = ''; }
}

async function exportPointDetail() {
  if (!guardExportPermission() || !pointDetail.value.pointRecords.length) return;
  activeExportKey.value = 'point';
  try { await runWithMinimumVisibleTime(() => exportInternationalTrainingDeliveryPointRecords(`${pointDetail.value.pointStat.organizer}_${pointDetail.value.pointStat.trainingLocation}`, pointDetail.value.pointRecords)); emit('log', `Exported international delivery detail: ${pointDetail.value.pointStat.organizer}.`); } finally { activeExportKey.value = ''; }
}

async function exportDirtyRows() {
  if (!guardExportPermission()) return;
  if (!dirtyRows.value.length) {
    warningMessage.value = 'There is no dirty data to export from the latest import.';
    emit('log', 'No international training delivery dirty rows are available for export.');
    return;
  }
  activeExportKey.value = 'dirty';
  try { await runWithMinimumVisibleTime(() => exportInternationalTrainingDeliveryDirtyRows(dirtyRows.value)); emit('log', `Exported ${dirtyRows.value.length} international delivery dirty rows.`); } finally { activeExportKey.value = ''; }
}

function guardExportPermission() { if (props.canExportExcel) return true; emit('feature-blocked', 'Excel Export'); return false; }

async function importFiles(files) {
  await handleFileImport({ target: { files, value: '' } });
}

defineExpose({ importFiles });

async function loadLastDataset() {
  try {
    const saved = await loadToolDataset(LOCAL_DATASET_KEYS.INTERNATIONAL_TRAINING_DELIVERY_MAP);
    if (!saved?.payload?.records?.length) return;
    // Rehydrate saved data through the latest center-name rule. This keeps old
    // imports grouped by Training Location without making users import again.
    records.value = normalizeInternationalTrainingDeliveryRecords(saved.payload.records);
    dirtyRows.value = saved.payload.dirtyRows || [];
    importWarnings.value = saved.payload.warnings || [];
    resetFiltersToAll();
    warningMessage.value = resolveImportWarning();
  } catch (error) { console.warn('Unable to load international training delivery dataset.', error); }
}

function createImportOverlay() { return { visible: false, mode: 'progress', progress: 0, message: 'Preparing import...', errorTitle: '', errorMessage: '', steps: createImportSteps() }; }
function resetImportOverlay() { clearTimeout(closeTimer); Object.assign(importOverlay, createImportOverlay(), { visible: true }); }
function closeImportOverlay() { clearTimeout(closeTimer); importOverlay.visible = false; }
function createImportSteps() { return [{ key: 'read', label: 'Read Excel file', status: 'pending' }, { key: 'structure', label: 'Recognize delivery fields', status: 'pending' }, { key: 'match', label: 'Match construction centers and locations', status: 'pending' }, { key: 'calculate', label: 'Calculate delivery metrics', status: 'pending' }, { key: 'chart', label: 'Generate map and analytics', status: 'pending' }]; }
function updateImportProgress(event = {}) { importOverlay.progress = Math.max(importOverlay.progress, Number(event.progress || 0)); importOverlay.message = event.message || importOverlay.message; importOverlay.steps = importOverlay.steps.map((step) => step.key === event.step ? { ...step, status: event.status || 'processing' } : step); }
function markImportStepFailed() { const activeStep = importOverlay.steps.find((step) => step.status === 'processing') || importOverlay.steps.find((step) => step.status === 'pending'); if (activeStep) activeStep.status = 'failed'; }
function emptyPointDetail() { return { pointStat: null, pointRecords: [], productLineDistribution: [], courseDistribution: [], trendSeries: [], detailRows: [] }; }
function formatNumber(value) { return Number(value || 0).toLocaleString('en-US'); }
function resolveImportWarning() {
  if (records.value.length && !allOptions.value.dateBounds?.minimum) {
    return 'The latest dataset does not include Training End Time. Re-import the delivery workbook to use Time.';
  }
  if (dirtyRows.value.length) {
    return `${dirtyRows.value.length.toLocaleString('en-US')} rows require review. Export Dirty Data to review the original data and reason.`;
  }
  return importWarnings.value[0] || '';
}
function nextFrame() { return new Promise((resolve) => { const schedule = typeof window !== 'undefined' && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : setTimeout; schedule(resolve); }); }

function buildBarOption(series, seriesName) {
  if (!series?.length) return null;
  const rows = series.slice(0, 10).reverse();
  return { backgroundColor: 'transparent', grid: { left: 108, right: 50, top: 12, bottom: 12, containLabel: true }, xAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false } }, yAxis: { type: 'category', data: rows.map((item) => item.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#d4e6f8', width: 108, overflow: 'truncate' } }, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (params) => { const item = params?.[0]; return item ? `${item.name}<br/>${seriesName}: ${formatNumber(item.value)}` : ''; } }, series: [{ name: seriesName, type: 'bar', data: rows.map((item) => item.value), barWidth: 12, showBackground: true, backgroundStyle: { color: 'rgba(96,165,250,0.08)', borderRadius: 999 }, itemStyle: { borderRadius: 999, color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#00d4ff' }, { offset: 1, color: '#00ff88' }] } }, label: { show: true, position: 'right', color: '#e4f4ff', formatter: ({ value }) => formatNumber(value) } }] };
}

function buildTrendOption(series) {
  if (!series?.length) return null;
  return { backgroundColor: 'transparent', legend: { top: 0, textStyle: { color: '#b9d3ee', fontSize: 11 }, itemWidth: 14, itemHeight: 8 }, grid: { top: 34, left: 42, right: 48, bottom: 34, containLabel: true }, tooltip: { trigger: 'axis', formatter: (params) => params.map((item) => `${item.marker}${item.seriesName}: ${item.seriesName === 'Pass Rate' ? `${item.value}%` : formatNumber(item.value)}`).join('<br/>') }, xAxis: { type: 'category', data: series.map((item) => item.label), axisLine: { lineStyle: { color: 'rgba(120,170,220,0.35)' } }, axisTick: { show: false }, axisLabel: { color: '#aac6e2', fontSize: 10 } }, yAxis: [{ type: 'value', minInterval: 1, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: 'rgba(96,165,250,0.12)' } }, axisLabel: { color: '#86a8c8', fontSize: 10 } }, { type: 'value', min: 0, max: 100, interval: 20, axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { color: '#86a8c8', formatter: '{value}%', fontSize: 10 } }], series: [{ name: 'Training Records', type: 'bar', yAxisIndex: 0, data: series.map((item) => item.recordCount), barMaxWidth: 16, itemStyle: { color: '#16c5f7', borderRadius: [3, 3, 0, 0] } }, { name: 'Trainees', type: 'bar', yAxisIndex: 0, data: series.map((item) => item.traineeCount), barMaxWidth: 16, itemStyle: { color: '#00e89a', borderRadius: [3, 3, 0, 0] } }, { name: 'Pass Rate', type: 'line', yAxisIndex: 1, data: series.map((item) => item.passRateValue), symbolSize: 6, connectNulls: false, lineStyle: { color: '#fbbf24', width: 2 }, itemStyle: { color: '#fbbf24' } }] };
}
</script>
