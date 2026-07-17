<template>
  <div
    ref="pageRef"
    class="tool-page qualification-page"
    :class="{ 'fullscreen-workspace': fullscreenActive, 'fullscreen-filter-open': fullscreenFiltersOpen, 'presentation-mode': presentationCarouselEnabled }"
    @mousemove="handleFullscreenMouseMove"
  >
    <section v-if="!fullscreenActive && !embedded" class="tool-header qualification-tool-header">
      <div class="qualification-tool-heading">
        <div class="tool-icon">
          <MapIcon :size="24" />
        </div>
        <div>
          <p class="section-kicker">SERVICE QUALIFICATION MAP</p>
          <h1>中国区人员服务资质地图</h1>
          <p>基于人员资质数据，按分公司、产品线、型号和资质类型展示全国服务能力分布</p>
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
          <span>导入资质表</span>
        </button>
        <button
          class="ghost-button"
          :class="{ locked: !canExportExcel }"
          type="button"
          :disabled="interactionDisabled || Boolean(activeExportKey) || (canExportExcel && !dashboard.filteredRecords.length)"
          :title="!canExportExcel ? '当前授权未开放该功能' : ''"
          @click="exportCurrentResult"
        >
          <LoaderCircle v-if="activeExportKey === 'current'" class="spin" :size="18" />
          <Download v-else :size="18" />
          <span>导出当前结果</span>
        </button>
        <button class="ghost-button" type="button" :disabled="interactionDisabled" @click="resetFilters">
          <RotateCcw :size="18" />
          <span>重置筛选</span>
        </button>
        <button class="ghost-button fullscreen-toggle-button" type="button" @click="toggleBrowserFullscreen">
          <Minimize2 v-if="fullscreenActive" :size="18" />
          <Maximize2 v-else :size="18" />
          <span>{{ fullscreenActive ? '退出全屏' : '浏览器全屏' }}</span>
        </button>
      </div>
    </section>

    <section v-else class="fullscreen-training-toolbar">
      <div class="fullscreen-training-title">
        <strong>中国区人员服务资质地图</strong>
        <span>Service Qualification Map</span>
      </div>
      <div
        class="fullscreen-training-actions"
        :class="{ visible: fullscreenControlsVisible }"
        @mouseenter="handleFullscreenControlsMouseEnter"
        @mouseleave="handleFullscreenControlsMouseLeave"
        @mousemove.stop
        @click.capture="handleFullscreenControlsClick"
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
          <span>导入资质表</span>
        </button>
        <button
          class="ghost-button compact"
          :class="{ locked: !canExportExcel }"
          type="button"
          :disabled="interactionDisabled || Boolean(activeExportKey) || (canExportExcel && !dashboard.filteredRecords.length)"
          :title="!canExportExcel ? '当前授权未开放该功能' : ''"
          @click="exportCurrentResult"
        >
          <LoaderCircle v-if="activeExportKey === 'current'" class="spin" :size="16" />
          <Download v-else :size="16" />
          <span>导出当前结果</span>
        </button>
        <button class="ghost-button compact" :class="{ active: fullscreenFiltersOpen }" type="button" @click="fullscreenFiltersOpen = !fullscreenFiltersOpen">
          <Search :size="16" />
          <span>筛选器</span>
        </button>
        <button
          class="ghost-button compact"
          :class="{ active: presentationCarouselEnabled && !carouselPaused }"
          type="button"
          @click="toggleCarouselPaused"
        >
          <Play v-if="carouselPaused" :size="16" />
          <Pause v-else :size="16" />
          <span>自动轮播（{{ carouselPaused ? '暂停' : '开启' }}）</span>
        </button>
        <button class="ghost-button compact fullscreen-toggle-button" type="button" @click="toggleBrowserFullscreen">
          <Minimize2 :size="16" />
          <span>退出全屏</span>
        </button>
      </div>
    </section>

    <section v-if="!fullscreenActive || fullscreenFiltersOpen" class="glass-panel qualification-filter-panel">
      <div class="panel-title-row">
        <div>
          <p class="section-kicker">Filter Controls</p>
          <h2>筛选器</h2>
        </div>
        <span class="status-pill" :class="hasData ? 'success' : 'warning'">
          {{ loading ? '正在处理数据' : dataStatusText }}
        </span>
      </div>

      <div class="qualification-filter-grid">
        <QualificationFilterSelect
          v-model="draftFilters.regions"
          label="大区"
          :options="regionFilterOptions"
          preserve-external-values
          searchable
          search-placeholder="搜索大区"
        />
        <QualificationFilterSelect
          v-model="draftFilters.branches"
          label="分公司"
          :options="branchFilterOptions"
          preserve-external-values
          searchable
          search-placeholder="搜索分公司"
        />
        <QualificationFilterSelect
          v-model="draftFilters.contractors"
          label="渠道商"
          :options="contractorFilterOptions"
          preserve-external-values
          searchable
          search-placeholder="搜索渠道商"
        />
        <QualificationFilterSelect
          v-model="draftFilters.productLines"
          label="产品线"
          :options="productLineFilterOptions"
          preserve-external-values
          searchable
          search-placeholder="搜索产品线"
        />
        <QualificationFilterSelect
          v-model="draftFilters.machineModels"
          label="机器型号"
          :options="machineModelFilterOptions"
          preserve-external-values
          searchable
          search-placeholder="输入型号关键字"
        />
        <QualificationFilterSelect
          v-model="draftFilters.qualificationTypes"
          label="服务资质类型"
          :options="qualificationTypeFilterOptions"
          preserve-external-values
          searchable
          search-placeholder="搜索资质类型"
        />

        <div class="qualification-filter-actions">
          <button class="primary-button" type="button" :disabled="interactionDisabled" @click="applyFilters">
            <Search :size="17" />
            <span>查询</span>
          </button>
          <button class="ghost-button" type="button" :disabled="interactionDisabled" @click="resetFilters">
            <Eraser :size="17" />
            <span>重置</span>
          </button>
        </div>
      </div>

      <div v-if="warningMessage" class="qualification-warning-list">
        <AlertTriangle :size="16" />
        <span>{{ warningMessage }}</span>
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
      <div class="training-map-stage" @click="pauseAutoAnalysisForInteraction">
        <section v-if="fullscreenActive" class="fullscreen-kpi-overlay">
          <article v-for="metric in fullscreenMetricCards" :key="`fullscreen-${metric.key}`" class="fullscreen-kpi-card" :class="metric.tone">
            <span>{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
          </article>
        </section>
        <QualificationAmap
          :points="dashboard.mapPoints"
          :loading="loading || viewBusy"
          :active="visualsActive"
          :fullscreen-active="fullscreenActive && !fullscreenFiltersOpen"
          :selected-branch="fullscreenActive ? focusedBranch : selectedBranch"
          :presentation-mode="fullscreenActive && presentationCarouselEnabled"
          :focused-branch="focusedBranch"
          :label-branches="permanentLabelBranches"
          :selected-regions="appliedFilters.regions"
          :empty-text="emptyStateText"
          @select-branch="handleMapBranchSelect"
        />
      </div>

      <aside class="qualification-side-panel">
        <section class="glass-panel qualification-side-tabs">
          <div class="qualification-side-tabs-head">
            <div>
              <p class="section-kicker">Ranking And Analysis</p>
              <h2>排行与分析</h2>
            </div>
            <div class="qualification-tab-nav">
              <button
                v-for="tab in visibleSideTabs"
                :key="tab.key"
                class="qualification-tab-button"
                :class="{ active: activeSideTab === tab.key }"
                type="button"
                @click="selectSideTab(tab.key)"
              >
                {{ tab.label }}
              </button>
            </div>
          </div>

          <div class="qualification-tab-body">
            <div v-if="activeSideTab === 'branch'" class="qualification-tab-panel">
              <div class="qualification-tab-caption">
                <span>分公司有效资质 TOP10</span>
                <strong>{{ dashboard.topValidBranches.length }}</strong>
              </div>
              <div v-if="dashboard.topValidBranches.length" class="qualification-expandable-block">
                <div class="qualification-rank-list scrollable" :class="{ expanded: expandedSidePanels.branch || fullscreenActive }">
                  <button
                    v-for="(item, index) in displayedValidBranches"
                    :key="item.branch"
                    class="qualification-rank-row"
                    :class="{ focused: activeSideTab === 'branch' && index === sideAnalysisIndex }"
                    :data-branch="item.branch"
                    type="button"
                    @click="openBranchDetail(item.branch)"
                  >
                    <span class="rank-index">{{ index + 1 }}</span>
                    <span class="rank-branch">{{ item.branch }}</span>
                    <strong>{{ item.validQualifications }}</strong>
                  </button>
                </div>
                <button v-if="!fullscreenActive && dashboard.topValidBranches.length > TOP_LIST_LIMIT" class="qualification-expand-button" type="button" @click="toggleSidePanel('branch')">
                  <ChevronUp v-if="expandedSidePanels.branch" :size="16" />
                  <ChevronDown v-else :size="16" />
                  <span>{{ expandedSidePanels.branch ? '收起，仅显示TOP10' : `展开全部 ${dashboard.topValidBranches.length}项` }}</span>
                </button>
              </div>
              <div v-else class="chart-empty-state compact in-tab">
                <ListOrdered :size="20" />
                <span>{{ emptyStateText }}</span>
              </div>
            </div>

            <div v-else-if="activeSideTab === 'productLine'" class="qualification-tab-panel analysis single">
              <div class="qualification-expandable-chart" :class="{ expanded: expandedSidePanels.productLine }">
                <EChartPanel
                  title="产品线资质分布"
                  kicker="Product Line"
                  :option="productLineBarOption"
                  :loading="loading || viewBusy"
                  :active="visualsActive"
                  :height="productLineChartHeight"
                  :highlight-index="activeSideTab === 'productLine' ? sideChartHighlightIndex : -1"
                  :empty-text="emptyStateText"
                  panelless
                />
              </div>
              <button v-if="!fullscreenActive && dashboard.productLineDistribution.length > CHART_TOP_LIMIT" class="qualification-expand-button" type="button" @click="toggleSidePanel('productLine')">
                <ChevronUp v-if="expandedSidePanels.productLine" :size="16" />
                <ChevronDown v-else :size="16" />
                <span>{{ expandedSidePanels.productLine ? '收起，仅显示TOP10' : `展开全部 ${dashboard.productLineDistribution.length}项` }}</span>
              </button>
            </div>

            <div v-else-if="activeSideTab === 'qualificationType'" class="qualification-tab-panel analysis single">
              <div class="qualification-expandable-chart compact" :class="{ expanded: expandedSidePanels.qualificationType }">
                <EChartPanel
                  title="资质类型分布"
                  kicker="Qualification Type"
                  :option="qualificationTypeBarOption"
                  :loading="loading || viewBusy"
                  :active="visualsActive"
                  :height="qualificationTypeChartHeight"
                  :highlight-index="activeSideTab === 'qualificationType' ? sideChartHighlightIndex : -1"
                  :empty-text="'暂无资质类型分布数据'"
                  panelless
                />
              </div>
              <button v-if="!fullscreenActive && dashboard.qualificationTypeDistribution.length > CHART_TOP_LIMIT" class="qualification-expand-button" type="button" @click="toggleSidePanel('qualificationType')">
                <ChevronUp v-if="expandedSidePanels.qualificationType" :size="16" />
                <ChevronDown v-else :size="16" />
                <span>{{ expandedSidePanels.qualificationType ? '收起，仅显示TOP10' : `展开全部 ${dashboard.qualificationTypeDistribution.length}项` }}</span>
              </button>
            </div>

            <div v-else-if="activeSideTab === 'expiryTrend'" class="qualification-tab-panel analysis single">
              <EChartPanel
                title="到期趋势分析"
                kicker="Expiry Analysis"
                :option="expiryTrendOption"
                :loading="loading || viewBusy"
                :active="visualsActive"
                height="248px"
                :highlight-index="activeSideTab === 'expiryTrend' ? sideChartHighlightIndex : -1"
                :empty-text="'暂无到期风险数据'"
                panelless
              />
            </div>

            <div v-else class="qualification-tab-panel analysis">
              <div class="qualification-expandable-chart" :class="{ expanded: expandedSidePanels.productLine }">
                <EChartPanel
                  title="产品线资质分布"
                  kicker="Product Line"
                  :option="productLineBarOption"
                  :loading="loading || viewBusy"
                  :active="visualsActive"
                  :height="productLineChartHeight"
                  :empty-text="emptyStateText"
                  panelless
                />
              </div>
              <button v-if="dashboard.productLineDistribution.length > CHART_TOP_LIMIT" class="qualification-expand-button" type="button" @click="toggleSidePanel('productLine')">
                <ChevronUp v-if="expandedSidePanels.productLine" :size="16" />
                <ChevronDown v-else :size="16" />
                <span>{{ expandedSidePanels.productLine ? '收起，仅显示TOP10' : `展开全部 ${dashboard.productLineDistribution.length}项` }}</span>
              </button>
              <div class="qualification-tab-analysis-grid">
                <div class="qualification-expandable-chart compact" :class="{ expanded: expandedSidePanels.qualificationType }">
                  <EChartPanel
                    title="资质类型分布"
                    kicker="Qualification Type"
                    :option="qualificationTypeBarOption"
                    :loading="loading || viewBusy"
                    :active="visualsActive"
                    :height="qualificationTypeChartHeight"
                    :empty-text="'暂无资质类型分布数据'"
                    panelless
                  />
                </div>
                <button v-if="dashboard.qualificationTypeDistribution.length > CHART_TOP_LIMIT" class="qualification-expand-button" type="button" @click="toggleSidePanel('qualificationType')">
                  <ChevronUp v-if="expandedSidePanels.qualificationType" :size="16" />
                  <ChevronDown v-else :size="16" />
                  <span>{{ expandedSidePanels.qualificationType ? '收起，仅显示TOP10' : `展开全部 ${dashboard.qualificationTypeDistribution.length}项` }}</span>
                </button>
                <EChartPanel
                  title="到期趋势分析"
                  kicker="Expiry Analysis"
                  :option="expiryTrendOption"
                  :loading="loading || viewBusy"
                  :active="visualsActive"
                  height="212px"
                  :empty-text="'暂无到期风险数据'"
                  panelless
                />
              </div>
            </div>
          </div>
        </section>
      </aside>
    </section>

    <Transition name="disclaimer-fade">
      <div v-if="branchDetail.branchStat" class="qualification-drawer-backdrop" @click.self="closeBranchDetail">
        <aside class="qualification-drawer">
          <div class="qualification-drawer-head">
            <div>
              <p class="section-kicker">Branch Detail</p>
              <h2>{{ branchDetail.branchStat.branch }}资质详情</h2>
            </div>
            <div class="qualification-drawer-actions">
              <button
                class="ghost-button"
                :class="{ locked: !canExportExcel }"
                type="button"
                :disabled="Boolean(activeExportKey) || (canExportExcel && !filteredBranchRows.length)"
                :title="!canExportExcel ? '当前授权未开放该功能' : ''"
                @click="exportBranchDetail"
              >
                <LoaderCircle v-if="activeExportKey === 'branch'" class="spin" :size="17" />
                <Download v-else :size="17" />
                <span>导出当前分公司明细</span>
              </button>
              <button class="icon-button" type="button" @click="closeBranchDetail">
                <X :size="18" />
              </button>
            </div>
          </div>

          <div class="qualification-drawer-metrics">
            <article v-for="metric in branchMetricCards" :key="metric.label" class="metric-card" :class="metric.tone">
              <component :is="metric.icon" :size="18" />
              <span>{{ metric.label }}</span>
              <strong>{{ metric.value }}</strong>
            </article>
          </div>

          <div class="qualification-drawer-chart-grid">
            <EChartPanel
              title="产品线分布"
              kicker="Branch Product Line"
              :option="branchProductLineOption"
              :active="visualsActive"
              height="220px"
              :empty-text="'暂无产品线分布数据'"
            />
            <EChartPanel
              title="资质类型分布"
              kicker="Branch Type Mix"
              :option="branchTypeOption"
              :active="visualsActive"
              height="220px"
              :empty-text="'暂无资质类型分布数据'"
            />
            <EChartPanel
              title="到期风险分布"
              kicker="Branch Risk"
              :option="branchRiskOption"
              :active="visualsActive"
              height="220px"
              :empty-text="'暂无风险分布数据'"
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
      @retry="retryImport"
      @close="closeImportOverlay"
    />
    <BlockingOperationModal
      :visible="exportFeedback.visible"
      :title="exportFeedback.title"
      :message="exportFeedback.message"
    />
    <Transition name="disclaimer-fade">
      <div v-if="viewBusy" class="qualification-view-overlay">
        <div class="qualification-view-overlay-card">
          <LoaderCircle class="spin" :size="28" />
          <strong>{{ viewBusyMessage }}</strong>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, markRaw, nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch, watchEffect } from 'vue';
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  CircleX,
  Download,
  Eraser,
  ListOrdered,
  LoaderCircle,
  Map as MapIcon,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Search,
  ShieldCheck,
  Upload,
  Users,
  WalletCards,
  X
} from 'lucide-vue-next';
import BlockingOperationModal from '../components/BlockingOperationModal.vue';
import EChartPanel from '../components/EChartPanel.vue';
import QualificationAmap from '../components/QualificationAmap.vue';
import QualificationFilterSelect from '../components/QualificationFilterSelect.vue';
import QualificationImportOverlay from '../components/QualificationImportOverlay.vue';
import { LOCAL_DATASET_KEYS, loadToolDataset, saveToolDataset } from '../services/localDataStore';
import {
  buildBranchDetail,
  buildQualificationDashboard,
  collectQualificationOptions,
  DEFAULT_QUALIFICATION_FILTERS
} from '../utils/qualificationAggregator';
import { NO_CONTRACTOR_LABEL } from '../utils/qualificationBranchResolver';
import { exportBranchQualificationRecords, exportQualificationRecords } from '../utils/qualificationExport';
import { parseQualificationFiles } from '../utils/qualificationParser';
import { runWithMinimumVisibleTime } from '../utils/blockingOperation';

const props = defineProps({
  canExportExcel: {
    type: Boolean,
    default: true
  },
  active: {
    type: Boolean,
    default: true
  },
  fullscreenActive: {
    type: Boolean,
    default: false
  },
  embedded: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['status-change', 'log', 'feature-blocked', 'enter-fullscreen', 'exit-fullscreen']);

const TOP_LIST_LIMIT = 10;
const CHART_TOP_LIMIT = 10;
const MAP_CAROUSEL_INTERVAL_MS = 5000;
const SIDE_ITEM_INTERVAL_MS = 4000;
const AUTO_RESUME_DELAY_MS = 30000;
const REACTIVATION_IDLE_TIMEOUT_MS = 360;
const pageRef = ref(null);
const fileInputRef = ref(null);
const loading = ref(false);
const restoringView = ref(false);
const reactivatingView = ref(false);
const importedRecords = shallowRef([]);
const importWarnings = ref([]);
const filterValidationMessage = ref('');
const selectedBranch = ref('');
const detailKeyword = ref('');
const detailStatus = ref('全部');
const activeSideTab = ref('branch');
const fullscreenFiltersOpen = ref(false);
const fullscreenControlsVisible = ref(false);
const fullscreenControlsHovering = ref(false);
const presentationCarouselEnabled = ref(false);
const carouselPaused = ref(false);
const carouselLocked = ref(false);
const focusedBranch = ref('');
const sideAnalysisIndex = ref(0);
let mapCarouselTimerId = null;
let sideAnalysisTimerId = null;
let autoResumeTimerId = null;
let fullscreenControlsHideTimerId = null;
let reactivationToken = 0;
const expandedSidePanels = reactive({
  branch: false,
  productLine: false,
  qualificationType: false
});
const importOverlay = reactive(createImportOverlayState());
const activeExportKey = ref('');
const exportFeedback = reactive({
  visible: false,
  title: '',
  message: ''
});

function toggleBrowserFullscreen() {
  emit(props.fullscreenActive ? 'exit-fullscreen' : 'enter-fullscreen');
}

const draftFilters = reactive(createDefaultFilters());
const appliedFilters = ref(createDefaultFilters());
const dashboardState = shallowRef(markRaw(buildQualificationDashboard([], appliedFilters.value)));
const DYNAMIC_FILTER_FIELDS = {
  regions: 'mappedRegion',
  branches: 'branch',
  contractors: 'contractorFilterValue',
  productLines: 'productLine',
  machineModels: 'machineModel',
  qualificationTypes: 'qualificationType'
};
const DYNAMIC_FILTER_KEYS = Object.keys(DYNAMIC_FILTER_FIELDS);

const filterOptions = computed(() => {
  const options = collectQualificationOptions(importedRecords.value);
  return {
    ...options,
    statusOptions: options.statusOptions || ['全部', '有效', '30天内到期', '60天内到期', '90天内到期', '已过期']
  };
});
const dynamicFilterOptions = computed(() => buildDynamicFilterOptions(importedRecords.value, draftFilters, filterOptions.value));
const regionFilterOptions = computed(() => dynamicFilterOptions.value.regions);
const branchFilterOptions = computed(() => dynamicFilterOptions.value.branches);
const contractorFilterOptions = computed(() => dynamicFilterOptions.value.contractors);
const productLineFilterOptions = computed(() => dynamicFilterOptions.value.productLines);
const machineModelFilterOptions = computed(() => dynamicFilterOptions.value.machineModels);
const qualificationTypeFilterOptions = computed(() => dynamicFilterOptions.value.qualificationTypes);

function buildDynamicFilterOptions(records, filters, baseOptions) {
  const selectedSets = buildSelectedFilterSets(filters, baseOptions);
  const buckets = Object.fromEntries(DYNAMIC_FILTER_KEYS.map((key) => [key, new Set()]));

  records.forEach((record) => {
    DYNAMIC_FILTER_KEYS.forEach((targetKey, targetIndex) => {
      for (const key of DYNAMIC_FILTER_KEYS.slice(0, targetIndex)) {
        const selectedSet = selectedSets[key];
        if (!selectedSet?.size) continue;
        if (!selectedSet.has(getRecordFilterValue(record, key))) {
          return;
        }
      }
      if (targetKey === 'contractors' && !record.isChannelPartner) return;
      const value = getRecordFilterValue(record, targetKey);
      if (value) buckets[targetKey].add(value);
    });
  });

  return Object.fromEntries(
    DYNAMIC_FILTER_KEYS.map((key) => [key, sortFilterValues([...buckets[key]])])
  );
}

function buildSelectedFilterSets(filters, baseOptions) {
  return Object.fromEntries(
    DYNAMIC_FILTER_KEYS.map((key) => [key, buildEffectiveSelectedSet(key, filters[key] || [], baseOptions?.[key] || [])])
  );
}

function buildEffectiveSelectedSet(key, selectedValues, baseValues) {
  const selected = selectedValues.filter(Boolean);
  const base = (baseValues || []).filter(Boolean);
  const baseSet = new Set(base);
  const selectedSet = new Set(selected);
  const allBaseSelected = base.length > 0 && base.every((value) => selectedSet.has(value));

  if (key === 'contractors') {
    if (allBaseSelected && selectedSet.has(NO_CONTRACTOR_LABEL)) return new Set();
    return new Set(selected.filter((value) => value !== NO_CONTRACTOR_LABEL));
  }

  if (allBaseSelected) return new Set();
  return new Set(selected.filter((value) => baseSet.has(value)));
}

function getRecordFilterValue(record, key) {
  return record?.[DYNAMIC_FILTER_FIELDS[key]] || '';
}

function sortFilterValues(values) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right, 'zh-CN'));
}

function isHiddenImportWarning(warning) {
  return String(warning || '').startsWith('未纳入统计');
}

const dashboard = computed(() => dashboardState.value);
const hasData = computed(() => Boolean(importedRecords.value.length));
const emptyStateText = computed(() => (hasData.value ? '暂无符合条件的资质数据，请调整筛选条件。' : '请导入资质表'));
const interactionDisabled = computed(() => loading.value || importOverlay.visible);
const dataStatusText = computed(() => {
  if (!hasData.value) return '待导入资质数据';
  return `已导入 ${importedRecords.value.length.toLocaleString()} 条资质记录`;
});
const viewBusy = computed(() => restoringView.value || reactivatingView.value);
const visualsActive = computed(() => props.active && !viewBusy.value);
const visibleImportWarning = computed(() => (importWarnings.value || []).find((warning) => !isHiddenImportWarning(warning)) || '');
const warningMessage = computed(() => filterValidationMessage.value || visibleImportWarning.value || '');
const viewBusyMessage = computed(() => (
  restoringView.value
    ? '正在恢复上次资质地图数据，请稍候...'
    : '正在刷新地图和图表，请稍候...'
));
const regularSideTabs = [
  { key: 'branch', label: '分公司TOP10' },
  { key: 'analysis', label: '产品线分布' }
];
const fullscreenSideTabs = [
  { key: 'branch', label: '公司TOP10' },
  { key: 'productLine', label: '产品线分布' },
  { key: 'qualificationType', label: '资质类型分布' },
  { key: 'expiryTrend', label: '到期趋势分析' }
];
const visibleSideTabs = computed(() => (props.fullscreenActive ? fullscreenSideTabs : regularSideTabs));

const metricCards = computed(() => [
  { key: 'totalPeople', label: '总持证人数', value: dashboard.value.summary.totalPeople, icon: Users, tone: 'blue' },
  { key: 'validQualifications', label: '有效资质总数', value: dashboard.value.summary.validQualifications, icon: ShieldCheck, tone: 'cyan' },
  { key: 'coveredBranches', label: '覆盖分公司数', value: dashboard.value.summary.coveredBranches, icon: WalletCards, tone: 'green' },
  { key: 'coveredContractors', label: '覆盖渠道商', value: dashboard.value.summary.coveredContractors, icon: WalletCards, tone: 'orange' }
]);
const fullscreenMetricCards = computed(() => [
  { key: 'validQualifications', label: '有效资质', value: dashboard.value.summary.validQualifications, tone: 'cyan' },
  { key: 'totalPeople', label: '持证人数', value: dashboard.value.summary.totalPeople, tone: 'blue' },
  { key: 'coveredBranches', label: '覆盖分公司', value: dashboard.value.summary.coveredBranches, tone: 'green' },
  { key: 'coveredContractors', label: '覆盖渠道商', value: dashboard.value.summary.coveredContractors, tone: 'orange' }
]);

const branchDetail = computed(() => {
  if (!selectedBranch.value) return { branchRecords: [], branchStat: null };
  return buildBranchDetail(selectedBranch.value, dashboard.value.filteredRecords);
});

const filteredBranchRows = computed(() => {
  let rows = branchDetail.value.branchRecords || [];
  if (detailKeyword.value) {
    const keyword = detailKeyword.value.toLowerCase();
    rows = rows.filter((row) => row.personName.toLowerCase().includes(keyword));
  }
  if (detailStatus.value !== '全部') {
    rows = rows.filter((row) => row.qualificationStatus === detailStatus.value);
  }
  return rows;
});

const branchMetricCards = computed(() => {
  const stat = branchDetail.value.branchStat;
  if (!stat) return [];
  return [
    { label: '持证人数', value: stat.totalPeople, icon: Users, tone: 'blue' },
    { label: '有效资质', value: stat.validQualifications, icon: ShieldCheck, tone: 'cyan' },
    { label: '即将到期', value: stat.expiring30, icon: CalendarClock, tone: 'orange' },
    { label: '已过期', value: stat.expiredQualifications, icon: CircleX, tone: 'red' }
  ];
});

const productLineBarOption = computed(() => buildBarOption(dashboard.value.productLineDistribution, '有效资质数量', expandedSidePanels.productLine));
const qualificationTypeBarOption = computed(() => buildTopTypeBarOption(dashboard.value.qualificationTypeDistribution, expandedSidePanels.qualificationType));
const expiryTrendOption = computed(() => buildTrendOption(dashboard.value.expiryTrend));
const branchProductLineOption = computed(() => buildBarOption(branchDetail.value.productLineDistribution || [], '有效资质'));
const branchTypeOption = computed(() => buildBranchTypeBarOption(branchDetail.value.qualificationTypeDistribution || []));
const branchRiskOption = computed(() => buildTrendOption(branchDetail.value.expiryDistribution || []));
const displayedValidBranches = computed(() => (props.fullscreenActive
  ? dashboard.value.topValidBranches
  : getVisibleRows(dashboard.value.topValidBranches, expandedSidePanels.branch, TOP_LIST_LIMIT)));
const productLineChartRows = computed(() => getDistributionRows(dashboard.value.productLineDistribution, expandedSidePanels.productLine, CHART_TOP_LIMIT));
const qualificationTypeChartRows = computed(() => getDistributionRows(dashboard.value.qualificationTypeDistribution, expandedSidePanels.qualificationType, CHART_TOP_LIMIT));
const expiryTrendRows = computed(() => (dashboard.value.expiryTrend || [])
  .map((item, index) => ({ ...item, sourceIndex: index }))
  .filter((item) => Number(item.value || 0) > 0));
const productLineChartHeight = computed(() => chartHeightForRows(productLineChartRows.value.length, 248));
const qualificationTypeChartHeight = computed(() => chartHeightForRows(qualificationTypeChartRows.value.length, 212));
const permanentLabelBranches = computed(() => {
  if (!props.fullscreenActive || !presentationCarouselEnabled.value) return [];
  return focusedBranch.value ? [focusedBranch.value] : [];
});
const activeSideRows = computed(() => {
  if (activeSideTab.value === 'branch') return displayedValidBranches.value;
  if (activeSideTab.value === 'productLine') return productLineChartRows.value;
  if (activeSideTab.value === 'qualificationType') return qualificationTypeChartRows.value;
  if (activeSideTab.value === 'expiryTrend') return expiryTrendRows.value;
  return [];
});
const activeSideBranch = computed(() => {
  if (activeSideTab.value !== 'branch') return '';
  return activeSideRows.value[sideAnalysisIndex.value]?.branch || '';
});
const sideChartHighlightIndex = computed(() => {
  if (!['productLine', 'qualificationType', 'expiryTrend'].includes(activeSideTab.value)) return -1;
  const rowCount = activeSideRows.value.length;
  if (!rowCount || sideAnalysisIndex.value < 0 || sideAnalysisIndex.value >= rowCount) return -1;
  if (activeSideTab.value === 'expiryTrend') return activeSideRows.value[sideAnalysisIndex.value]?.sourceIndex ?? -1;
  return rowCount - 1 - sideAnalysisIndex.value;
});
const carouselSequence = computed(() => {
  const mapPointByBranch = new Map(dashboard.value.mapPoints.map((point) => [point.branch, point]));
  const addUniquePoints = (target, items) => {
    items.forEach((item) => {
      const point = mapPointByBranch.get(item.branch);
      if (point && !target.some((candidate) => candidate.branch === point.branch)) {
        target.push(point);
      }
    });
  };

  const result = [];
  addUniquePoints(result, dashboard.value.topValidBranches.slice(0, 10));
  addUniquePoints(result, dashboard.value.mapPoints);
  return result;
});

watchEffect(() => {
  if (!props.fullscreenActive && fullscreenFiltersOpen.value) {
    fullscreenFiltersOpen.value = false;
  }
  if (!props.active) return;
  if (loading.value) {
    emit('status-change', '资质地图数据处理中');
    return;
  }
  if (viewBusy.value) {
    emit('status-change', viewBusyMessage.value);
    return;
  }
  emit('status-change', hasData.value ? `资质地图就绪，当前 ${dashboard.value.filteredRecords.length} 条` : '中国区人员服务资质地图待导入数据');
});

watch(
  () => props.active,
  async (isActive, wasActive) => {
    if (!isActive) {
      reactivationToken += 1;
      reactivatingView.value = false;
      return;
    }
    if (wasActive !== false) return;
    if (!hasData.value) {
      await loadLastDataset();
      return;
    }
    await deferViewReactivation();
  }
);

watch(
  () => dynamicFilterOptions.value,
  () => {
    pruneInvalidSpecificFilterSelections();
  },
  { deep: true }
);

onMounted(loadLastDataset);

onBeforeUnmount(() => {
  reactivationToken += 1;
  stopAutoAnalysisTimers();
  clearAutoResumeTimer();
  clearFullscreenControlsTimer();
});

watch(
  () => props.fullscreenActive,
  (isFullscreen) => {
    if (isFullscreen) {
      fullscreenControlsVisible.value = false;
      fullscreenControlsHovering.value = false;
      clearFullscreenControlsTimer();
      presentationCarouselEnabled.value = true;
      carouselPaused.value = false;
      carouselLocked.value = false;
      activeSideTab.value = 'branch';
      sideAnalysisIndex.value = 0;
      focusFirstCarouselPoint();
      startAutoAnalysisTimers();
      return;
    }
    presentationCarouselEnabled.value = false;
    fullscreenControlsVisible.value = false;
    fullscreenControlsHovering.value = false;
    carouselPaused.value = false;
    carouselLocked.value = false;
    focusedBranch.value = '';
    sideAnalysisIndex.value = 0;
    stopAutoAnalysisTimers();
    clearAutoResumeTimer();
    clearFullscreenControlsTimer();
  }
);

watch(
  () => carouselSequence.value.map((point) => point.branch).join('|'),
  () => {
    if (!props.fullscreenActive || !presentationCarouselEnabled.value) return;
    if (!carouselSequence.value.some((point) => point.branch === focusedBranch.value)) {
      focusFirstCarouselPoint();
    }
    startAutoAnalysisTimers();
  }
);

watch(
  () => activeSideTab.value,
  async () => {
    sideAnalysisIndex.value = 0;
    await nextTick();
    scrollActiveSideRowIntoView();
  }
);

watch(
  () => sideAnalysisIndex.value,
  async () => {
    await nextTick();
    scrollActiveSideRowIntoView();
  }
);

watch(
  () => activeSideRows.value.length,
  (rowCount) => {
    if (!rowCount) {
      sideAnalysisIndex.value = 0;
      return;
    }
    if (sideAnalysisIndex.value >= rowCount) {
      sideAnalysisIndex.value = rowCount - 1;
    }
  }
);

watch(
  draftFilters,
  () => {
    if (filterValidationMessage.value) {
      filterValidationMessage.value = '';
    }
  },
  { deep: true }
);

function openImporter() {
  if (interactionDisabled.value) return;
  fileInputRef.value?.click();
}

function handleFullscreenMouseMove(event) {
  if (!props.fullscreenActive) return;
  if (event.clientY < 100) {
    revealFullscreenControls();
  }
}

function revealFullscreenControls() {
  if (!props.fullscreenActive) return;
  fullscreenControlsVisible.value = true;
  scheduleFullscreenControlsHide();
}

function handleFullscreenControlsMouseEnter() {
  if (!props.fullscreenActive) return;
  fullscreenControlsHovering.value = true;
  fullscreenControlsVisible.value = true;
  clearFullscreenControlsTimer();
}

function handleFullscreenControlsMouseLeave() {
  if (!props.fullscreenActive) return;
  fullscreenControlsHovering.value = false;
  scheduleFullscreenControlsHide();
}

function handleFullscreenControlsClick() {
  if (!props.fullscreenActive) return;
  fullscreenControlsVisible.value = true;
  scheduleFullscreenControlsHide();
}

function scheduleFullscreenControlsHide() {
  clearFullscreenControlsTimer();
  if (fullscreenControlsHovering.value) return;
  fullscreenControlsHideTimerId = window.setTimeout(() => {
    if (!fullscreenControlsHovering.value) {
      fullscreenControlsVisible.value = false;
    }
  }, 3000);
}

function clearFullscreenControlsTimer() {
  if (!fullscreenControlsHideTimerId) return;
  window.clearTimeout(fullscreenControlsHideTimerId);
  fullscreenControlsHideTimerId = null;
}

function toggleCarouselPaused() {
  if (!presentationCarouselEnabled.value) return;
  carouselPaused.value = !carouselPaused.value;
  carouselLocked.value = carouselPaused.value;
  if (carouselPaused.value) {
    stopAutoAnalysisTimers();
    return;
  }
  carouselLocked.value = false;
  startAutoAnalysisTimers();
}

function pauseAutoAnalysisForInteraction() {
  if (!presentationCarouselEnabled.value || carouselLocked.value) return;
  carouselPaused.value = true;
  stopAutoAnalysisTimers();
  scheduleAutoAnalysisResume();
}

function scheduleAutoAnalysisResume() {
  if (!presentationCarouselEnabled.value || carouselLocked.value) return;
  clearAutoResumeTimer();
  autoResumeTimerId = window.setTimeout(() => {
    carouselPaused.value = false;
    startAutoAnalysisTimers();
  }, AUTO_RESUME_DELAY_MS);
}

function handleMapBranchSelect(branch) {
  if (!props.fullscreenActive) {
    openBranchDetail(branch);
    return;
  }
  focusBranchManually(branch, { pause: true });
}

function focusBranchManually(branch, options = {}) {
  if (!branch) return;
  focusedBranch.value = branch;
  if (options.pause) {
    pauseAutoAnalysisForInteraction();
  }
}

function focusFirstCarouselPoint() {
  const firstPoint = carouselSequence.value[0];
  focusedBranch.value = firstPoint?.branch || '';
}

function advanceCarouselFocus() {
  if (!presentationCarouselEnabled.value || carouselPaused.value || carouselLocked.value) return;
  const sequence = carouselSequence.value;
  if (!sequence.length) {
    focusedBranch.value = '';
    return;
  }
  const currentIndex = sequence.findIndex((point) => point.branch === focusedBranch.value);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % sequence.length;
  focusedBranch.value = sequence[nextIndex].branch;
}

function advanceSideAnalysisTab() {
  const keys = fullscreenSideTabs.map((tab) => tab.key);
  const currentIndex = keys.indexOf(activeSideTab.value);
  activeSideTab.value = keys[(currentIndex + 1) % keys.length] || 'branch';
  sideAnalysisIndex.value = 0;
}

function advanceSideAnalysisItem() {
  if (!props.fullscreenActive || !presentationCarouselEnabled.value || carouselPaused.value || carouselLocked.value) return;
  const rowCount = activeSideRows.value.length;
  if (!rowCount) {
    advanceSideAnalysisTab();
    return;
  }
  if (sideAnalysisIndex.value < rowCount - 1) {
    sideAnalysisIndex.value += 1;
    return;
  }
  advanceSideAnalysisTab();
}

function startAutoAnalysisTimers() {
  stopAutoAnalysisTimers();
  clearAutoResumeTimer();
  if (!props.fullscreenActive || !presentationCarouselEnabled.value || carouselPaused.value || carouselLocked.value) return;
  mapCarouselTimerId = window.setInterval(advanceCarouselFocus, MAP_CAROUSEL_INTERVAL_MS);
  sideAnalysisTimerId = window.setInterval(advanceSideAnalysisItem, SIDE_ITEM_INTERVAL_MS);
}

function stopAutoAnalysisTimers() {
  if (mapCarouselTimerId) {
    window.clearInterval(mapCarouselTimerId);
    mapCarouselTimerId = null;
  }
  if (sideAnalysisTimerId) {
    window.clearInterval(sideAnalysisTimerId);
    sideAnalysisTimerId = null;
  }
}

function clearAutoResumeTimer() {
  if (!autoResumeTimerId) return;
  window.clearTimeout(autoResumeTimerId);
  autoResumeTimerId = null;
}

function scrollActiveSideRowIntoView() {
  if (!props.fullscreenActive || !activeSideBranch.value || !pageRef.value) return;
  const selector = `.qualification-rank-row.focused[data-branch="${cssEscape(activeSideBranch.value)}"], .qualification-risk-row.focused[data-branch="${cssEscape(activeSideBranch.value)}"]`;
  const row = pageRef.value.querySelector(selector);
  row?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
}

function cssEscape(value) {
  if (window.CSS?.escape) return window.CSS.escape(value);
  return String(value).replace(/["\\]/g, '\\$&');
}

async function handleFileImport(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;

  loading.value = true;
  importWarnings.value = [];
  filterValidationMessage.value = '';
  selectedBranch.value = '';
  prepareImportOverlay();

  try {
    await waitForPaint();
    emit('log', `开始导入资质表，共 ${files.length} 个文件`);
    const payload = await parseQualificationFilesOffMainThread(files, handleImportProgress);
    updateImportOverlayStep('generate', 'processing', 94, '正在生成离线地图点位...');
    await waitForPaint();
    importedRecords.value = markRaw(payload.records || []);
    importWarnings.value = payload.warnings || [];
    const allFilters = createAllFiltersFromOptions();
    Object.assign(draftFilters, allFilters);
    appliedFilters.value = cloneFilters(allFilters);
    refreshDashboard();
    resetSidePanelExpansion();
    await saveToolDataset(LOCAL_DATASET_KEYS.SERVICE_QUALIFICATION_MAP, {
      records: importedRecords.value,
      warnings: importWarnings.value
    });
    await nextTick();
    updateImportOverlayStep('generate', 'completed', 100, '导入完成');
    importOverlay.mode = 'success';
    emit('log', `资质数据导入完成，共识别 ${payload.records.length} 条记录；地图使用离线分公司坐标`);
    window.setTimeout(() => {
      loading.value = false;
      resetImportOverlay();
    }, 500);
  } catch (error) {
    emit('log', error.message || '资质数据导入失败');
    importWarnings.value = [error.message || '资质数据导入失败'];
    loading.value = false;
    markImportOverlayFailed(error.message || '导入失败，请检查 Excel 表头和字段结构。');
  } finally {
    event.target.value = '';
  }
}

function applyFilters() {
  const validation = validateDraftFilters();
  if (!validation.valid) {
    filterValidationMessage.value = validation.message;
    emit('log', validation.message);
    return;
  }
  filterValidationMessage.value = '';
  appliedFilters.value = {
    regions: [...draftFilters.regions],
    branches: [...draftFilters.branches],
    contractors: [...draftFilters.contractors],
    productLines: [...draftFilters.productLines],
    machineModels: [...draftFilters.machineModels],
    qualificationTypes: [...draftFilters.qualificationTypes],
    status: draftFilters.status
  };
  refreshDashboard();
  selectedBranch.value = '';
  detailKeyword.value = '';
  detailStatus.value = '全部';
  resetSidePanelExpansion();
  sideAnalysisIndex.value = 0;
  emit('log', `刷新资质地图，当前结果 ${dashboard.value.filteredRecords.length} 条`);
}

function resetFilters() {
  filterValidationMessage.value = '';
  const allFilters = createAllFiltersFromOptions();
  Object.assign(draftFilters, allFilters);
  appliedFilters.value = cloneFilters(allFilters);
  refreshDashboard();
  selectedBranch.value = '';
  detailKeyword.value = '';
  detailStatus.value = '全部';
  resetSidePanelExpansion();
  sideAnalysisIndex.value = 0;
  emit('log', '已重置资质地图筛选条件');
}

function selectSideTab(tabKey) {
  if (props.fullscreenActive) {
    pauseAutoAnalysisForInteraction();
  }
  activeSideTab.value = tabKey;
  sideAnalysisIndex.value = 0;
  resetSidePanelExpansion();
}

function toggleSidePanel(panelKey) {
  if (props.fullscreenActive) {
    pauseAutoAnalysisForInteraction();
  }
  expandedSidePanels[panelKey] = !expandedSidePanels[panelKey];
}

function resetSidePanelExpansion() {
  Object.keys(expandedSidePanels).forEach((key) => {
    expandedSidePanels[key] = false;
  });
}

async function runExportFeedback(key, title, message, action) {
  if (activeExportKey.value) return;
  activeExportKey.value = key;
  exportFeedback.visible = true;
  exportFeedback.title = title;
  exportFeedback.message = message;
  try {
    await runWithMinimumVisibleTime(action);
  } finally {
    exportFeedback.visible = false;
    activeExportKey.value = '';
  }
}

async function exportCurrentResult() {
  if (!props.canExportExcel) {
    emit('feature-blocked', 'Excel导出');
    return;
  }
  if (!dashboard.value.filteredRecords.length || activeExportKey.value) return;
  await runExportFeedback(
    'current',
    '正在导出当前结果',
    '系统正在生成资质筛选结果 Excel，请不要重复点击导出按钮。',
    () => {
      exportQualificationRecords(dashboard.value.filteredRecords);
      emit('log', `已导出当前资质结果，共 ${dashboard.value.filteredRecords.length} 条`);
    }
  );
}

function openBranchDetail(branch) {
  if (props.fullscreenActive) {
    pauseAutoAnalysisForInteraction();
    return;
  }
  selectedBranch.value = branch;
  detailKeyword.value = '';
  detailStatus.value = '全部';
}

function closeBranchDetail() {
  selectedBranch.value = '';
}

async function exportBranchDetail() {
  if (!props.canExportExcel) {
    emit('feature-blocked', 'Excel导出');
    return;
  }
  if (!branchDetail.value.branchStat || !filteredBranchRows.value.length || activeExportKey.value) return;
  await runExportFeedback(
    'branch',
    '正在导出分公司明细',
    `系统正在生成 ${branchDetail.value.branchStat.branch} 资质明细 Excel，请不要重复点击导出按钮。`,
    () => {
      exportBranchQualificationRecords(branchDetail.value.branchStat.branch, filteredBranchRows.value);
      emit('log', `已导出 ${branchDetail.value.branchStat.branch} 分公司资质明细`);
    }
  );
}

function createDefaultFilters() {
  return {
    regions: [],
    branches: [],
    contractors: [],
    productLines: [],
    machineModels: [],
    qualificationTypes: [],
    status: DEFAULT_QUALIFICATION_FILTERS.status
  };
}

function refreshDashboard(filters = appliedFilters.value) {
  dashboardState.value = markRaw(buildQualificationDashboard(importedRecords.value, filters));
}

function pruneInvalidSpecificFilterSelections() {
  if (!hasData.value) return;
  let changed = false;
  const optionMap = dynamicFilterOptions.value;
  const baseOptions = filterOptions.value;

  DYNAMIC_FILTER_KEYS.forEach((key) => {
    const currentValues = draftFilters[key] || [];
    if (!currentValues.length || isGlobalAllSelected(key, currentValues, baseOptions[key] || [])) return;
    const optionSet = new Set(optionMap[key] || []);
    const nextValues = currentValues.filter((value) => optionSet.has(value));
    if (nextValues.length === currentValues.length) return;
    draftFilters[key] = nextValues;
    changed = true;
  });

  if (changed) {
    filterValidationMessage.value = '';
  }
}

function isGlobalAllSelected(key, selectedValues, baseValues) {
  const base = (baseValues || []).filter(Boolean);
  if (!base.length) return false;
  const selectedSet = new Set((selectedValues || []).filter(Boolean));
  if (!base.every((value) => selectedSet.has(value))) return false;
  return key !== 'contractors' || selectedSet.has(NO_CONTRACTOR_LABEL);
}

function validateDraftFilters() {
  if (!hasData.value) {
    return { valid: false, message: '请先导入资质表后再查询。' };
  }

  const rules = [
    { key: 'regions', label: '大区', options: regionFilterOptions.value },
    { key: 'branches', label: '分公司', options: branchFilterOptions.value },
    { key: 'contractors', label: '渠道商', options: contractorFilterOptions.value },
    { key: 'productLines', label: '产品线', options: productLineFilterOptions.value },
    { key: 'machineModels', label: '机器型号', options: machineModelFilterOptions.value },
    { key: 'qualificationTypes', label: '服务资质类型', options: qualificationTypeFilterOptions.value }
  ];
  const missingLabels = [];
  const emptyOptionLabels = [];

  rules.forEach(({ key, label, options }) => {
    const optionList = options || [];
    if (!optionList.length) {
      if (key === 'contractors' && (draftFilters.contractors || []).includes(NO_CONTRACTOR_LABEL)) {
        return;
      }
      emptyOptionLabels.push(label);
      return;
    }
    const optionSet = new Set(optionList);
    const selectedVisibleCount = (draftFilters[key] || []).filter((value) => optionSet.has(value)).length;
    if (!selectedVisibleCount) {
      missingLabels.push(label);
    }
  });

  if (emptyOptionLabels.length) {
    return {
      valid: false,
      message: `当前筛选条件下「${emptyOptionLabels.join('、')}」暂无可选项，请先调整上级筛选条件。`
    };
  }
  if (missingLabels.length) {
    return {
      valid: false,
      message: `请选择：${missingLabels.join('、')}。`
    };
  }
  return { valid: true, message: '' };
}

function createAllFiltersFromOptions() {
  const options = filterOptions.value;
  return {
    regions: [...options.regions],
    branches: [...options.branches],
    contractors: [...options.contractors, NO_CONTRACTOR_LABEL],
    productLines: [...options.productLines],
    machineModels: [...options.machineModels],
    qualificationTypes: [...options.qualificationTypes],
    status: DEFAULT_QUALIFICATION_FILTERS.status
  };
}

function cloneFilters(filters) {
  return {
    regions: [...filters.regions],
    branches: [...filters.branches],
    contractors: [...(filters.contractors || [])],
    productLines: [...filters.productLines],
    machineModels: [...filters.machineModels],
    qualificationTypes: [...filters.qualificationTypes],
    status: filters.status
  };
}

function buildBarOption(seriesData, seriesName, expanded = false) {
  if (!seriesData?.length) return null;
  const rows = getDistributionRows(seriesData, expanded, CHART_TOP_LIMIT);
  const displayRows = [...rows].reverse();
  return {
    backgroundColor: 'transparent',
    grid: { left: 70, right: 45, top: 10, bottom: 10, containLabel: true },
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
        width: 70,
        overflow: 'truncate',
        formatter: (value) => truncateLabel(value, 6)
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const current = params?.[0];
        if (!current) return '';
        return `${current.name}<br/>${seriesName}：${Number(current.value || 0).toLocaleString('zh-CN')}`;
      }
    },
    series: [
      {
        name: seriesName,
        type: 'bar',
        data: displayRows.map((item) => ({
          name: item.name,
          value: item.value
        })),
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
          color: '#e4f4ff',
          fontWeight: 700,
          formatter: ({ value }) => formatShortNumber(value),
          avoidLabelOverlap: true
        }
      }
    ]
  };
}

function buildBranchTypeBarOption(seriesData) {
  if (!seriesData?.length) return null;
  const rows = getDistributionRows(seriesData, false, 6);
  const displayRows = [...rows].reverse();
  return {
    backgroundColor: 'transparent',
    grid: { left: 82, right: 58, top: 12, bottom: 12 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const current = params?.[0];
        if (!current) return '';
        return `${current.name}<br/>有效资质：${Number(current.value || 0).toLocaleString('zh-CN')}`;
      }
    },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      max: ({ max }) => Math.ceil(Number(max || 0) * 1.22) || 1
    },
    yAxis: {
      type: 'category',
      data: displayRows.map((item) => item.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#d7e8fa',
        width: 76,
        overflow: 'truncate',
        formatter: (value) => truncateLabel(value, 8)
      }
    },
    series: [
      {
        type: 'bar',
        data: displayRows.map((item) => item.value),
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
          color: '#eef8ff',
          fontWeight: 700,
          formatter: ({ value }) => formatChartLabelNumber(value)
        }
      }
    ]
  };
}

function buildTrendOption(seriesData) {
  if (!seriesData?.length) return null;
  if (seriesData.every((item) => Number(item.value || 0) === 0)) return null;
  return {
    backgroundColor: 'transparent',
    grid: { left: 36, right: 18, top: 24, bottom: 34, containLabel: true },
    xAxis: {
      type: 'category',
      data: seriesData.map((item) => item.label),
      axisLine: { lineStyle: { color: 'rgba(150, 190, 220, 0.3)' } },
      axisLabel: { color: '#bcd6ef' }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: 'rgba(120, 170, 210, 0.08)' } },
      axisLabel: { color: '#8fb5d8' }
    },
    tooltip: {
      trigger: 'axis'
    },
    series: [
      {
        type: 'bar',
        data: seriesData.map((item) => item.value),
        barWidth: 28,
        itemStyle: {
          borderRadius: [8, 8, 0, 0],
          color: ({ dataIndex }) => ['#fbbf24', '#fb923c', '#38bdf8', '#ff5d73'][dataIndex] || '#00d4ff'
        },
        label: {
          show: true,
          position: 'top',
          color: '#e5f2ff'
        }
      }
    ]
  };
}

function buildTopTypeBarOption(seriesData, expanded = false) {
  if (!seriesData?.length) return null;

  const rows = getDistributionRows(seriesData, expanded, CHART_TOP_LIMIT);
  const displayRows = [...rows].reverse();

  return {
    backgroundColor: 'transparent',
    grid: { left: 10, right: 72, top: 8, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const current = params?.[0];
        if (!current) return '';
        return `${current.name}<br/>数量：${current.value}`;
      }
    },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      max: ({ max }) => Math.ceil(Number(max || 0) * 1.2) || 1
    },
    yAxis: {
      type: 'category',
      data: displayRows.map((item) => item.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#d7e8fa',
        width: 84,
        overflow: 'truncate',
        formatter: (value) => truncateLabel(value, 10)
      }
    },
    series: [
      {
        type: 'bar',
        data: displayRows.map((item) => item.value),
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
          color: '#eef8ff',
          fontWeight: 700,
          formatter: ({ value }) => formatChartLabelNumber(value),
          avoidLabelOverlap: true
        }
      }
    ]
  };
}

function getVisibleRows(rows, expanded, limit) {
  return expanded ? rows : rows.slice(0, limit);
}

function getDistributionRows(seriesData, expanded, limit) {
  const sorted = [...(seriesData || [])].sort((left, right) => Number(right.value || 0) - Number(left.value || 0) || left.name.localeCompare(right.name, 'zh-CN'));
  if (expanded) return sorted;
  const topRows = sorted.slice(0, limit);
  const otherValue = sorted.slice(limit).reduce((total, item) => total + Number(item.value || 0), 0);
  return otherValue > 0 ? [...topRows, { name: '其他', value: otherValue }] : topRows;
}

function chartHeightForRows(rowCount, fallbackHeight) {
  if (!rowCount) return `${fallbackHeight}px`;
  return `${Math.max(fallbackHeight, rowCount * 32 + 72)}px`;
}

function truncateLabel(value, maxLength) {
  const text = String(value || '');
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function formatShortNumber(value) {
  const numericValue = Number(value || 0);
  if (numericValue < 10000) return String(numericValue);
  return `${(numericValue / 10000).toFixed(1).replace(/\.0$/, '')}万`;
}

function formatChartLabelNumber(value) {
  return Number(value || 0).toLocaleString('zh-CN');
}

function createImportOverlayState() {
  return {
    visible: false,
    mode: 'progress',
    progress: 0,
    message: '',
    errorTitle: '',
    errorMessage: '',
    steps: createImportSteps()
  };
}

function createImportSteps() {
  return [
    { key: 'read', label: '读取 Excel 文件', status: 'waiting' },
    { key: 'structure', label: '识别字段结构', status: 'waiting' },
    { key: 'clean', label: '清洗资质数据', status: 'waiting' },
    { key: 'status', label: '计算资质状态', status: 'waiting' },
    { key: 'generate', label: '生成地图与图表数据', status: 'waiting' }
  ];
}

function prepareImportOverlay() {
  importOverlay.visible = true;
  importOverlay.mode = 'progress';
  importOverlay.progress = 0;
  importOverlay.message = '正在准备导入...';
  importOverlay.errorTitle = '';
  importOverlay.errorMessage = '';
  importOverlay.steps = createImportSteps();
}

function resetImportOverlay() {
  Object.assign(importOverlay, createImportOverlayState());
}

function handleImportProgress(payload) {
  updateImportOverlayStep(payload.step, payload.status, payload.progress, payload.message);
}

function updateImportOverlayStep(stepKey, status, progress, message) {
  const stepIndex = importOverlay.steps.findIndex((step) => step.key === stepKey);
  if (stepIndex === -1) return;
  if (status === 'processing') {
    importOverlay.steps = importOverlay.steps.map((step, index) => ({
      ...step,
      status: index < stepIndex && step.status !== 'failed' ? 'completed' : index === stepIndex ? 'processing' : step.status
    }));
  } else if (status === 'completed' || status === 'failed') {
    importOverlay.steps = importOverlay.steps.map((step, index) => ({
      ...step,
      status: index === stepIndex ? status : step.status
    }));
  }
  if (Number.isFinite(Number(progress))) {
    const nextProgress = Math.max(0, Math.min(100, Number(progress)));
    importOverlay.progress = Math.max(importOverlay.progress || 0, nextProgress);
  }
  importOverlay.message = message || importOverlay.message;
}

function parseQualificationFilesOffMainThread(files, onProgress) {
  if (typeof Worker === 'undefined') {
    return parseQualificationFiles(files, { onProgress });
  }

  return new Promise((resolve, reject) => {
    const requestId = `qualification-import-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const worker = new Worker(new URL('../workers/qualificationImportWorker.js', import.meta.url), { type: 'module' });
    let settled = false;

    const cleanup = () => {
      if (settled) return;
      settled = true;
      worker.terminate();
    };

    worker.onmessage = (event) => {
      const message = event.data || {};
      if (message.requestId !== requestId) return;

      if (message.type === 'progress') {
        onProgress?.(message.payload || {});
        return;
      }

      cleanup();
      if (message.type === 'success') {
        resolve(message.payload || { records: [], warnings: [] });
      } else {
        reject(new Error(message.error?.message || '资质数据后台解析失败'));
      }
    };

    worker.onerror = (error) => {
      cleanup();
      reject(new Error(error?.message || '资质数据后台解析失败'));
    };

    worker.postMessage({ requestId, files });
  });
}

function markImportOverlayFailed(message) {
  const activeProcessingStep = [...importOverlay.steps].reverse().find((step) => step.status === 'processing')?.key || 'structure';
  updateImportOverlayStep(activeProcessingStep, 'failed', importOverlay.progress || 0, message);
  importOverlay.mode = 'error';
  importOverlay.visible = true;
  importOverlay.errorTitle = '导入失败';
  importOverlay.errorMessage = message;
}

function retryImport() {
  closeImportOverlay();
  window.setTimeout(() => {
    openImporter();
  }, 60);
}

function closeImportOverlay() {
  resetImportOverlay();
}

async function loadLastDataset() {
  if (restoringView.value) return;
  restoringView.value = true;
  await waitForPaint();
  const record = await loadToolDataset(LOCAL_DATASET_KEYS.SERVICE_QUALIFICATION_MAP);
  const payload = record?.payload;
  if (!payload?.records?.length) {
    restoringView.value = false;
    return;
  }
  importedRecords.value = markRaw(payload.records || []);
  importWarnings.value = payload.warnings || [];
  const allFilters = createAllFiltersFromOptions();
  Object.assign(draftFilters, allFilters);
  appliedFilters.value = cloneFilters(allFilters);
  refreshDashboard();
  selectedBranch.value = '';
  detailKeyword.value = '';
  detailStatus.value = '全部';
  resetSidePanelExpansion();
  await nextTick();
  window.setTimeout(() => {
    restoringView.value = false;
  }, 260);
  emit('log', `已加载上次资质地图数据，共 ${importedRecords.value.length} 条`);
}

async function deferViewReactivation() {
  const token = reactivationToken + 1;
  reactivationToken = token;
  reactivatingView.value = true;
  await waitForPaint();
  await waitForBrowserIdle(REACTIVATION_IDLE_TIMEOUT_MS);
  if (token === reactivationToken) {
    reactivatingView.value = false;
  }
}

async function waitForPaint() {
  await nextTick();
  await new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

function waitForBrowserIdle(timeout = REACTIVATION_IDLE_TIMEOUT_MS) {
  return new Promise((resolve) => {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => resolve(), { timeout });
      return;
    }
    window.setTimeout(resolve, timeout);
  });
}
</script>
