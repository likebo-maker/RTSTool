<template>
  <div
    ref="pageRef"
    class="tool-page qualification-page training-page"
    :class="{ 'fullscreen-workspace': fullscreenActive, 'fullscreen-filter-open': fullscreenFiltersOpen, 'presentation-mode': presentationCarouselEnabled, 'embedded-tool-page': embedded }"
    @mousemove="handleFullscreenMouseMove"
  >
    <section v-if="!fullscreenActive && !embedded" class="tool-header qualification-tool-header">
      <div class="qualification-tool-heading">
        <div class="tool-icon">
          <Presentation :size="24" />
        </div>
        <div>
          <p class="section-kicker">TRAINING CENTER DELIVERY</p>
          <h1>中国区培训中心交付地图</h1>
          <p>基于建设地图培训中心与课程承接范围，展示全国培训中心交付人次、人数、场次和效果</p>
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
          <span>导入培训表</span>
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
        <button
          class="ghost-button"
          :class="{ locked: !canExportExcel }"
          type="button"
          :disabled="interactionDisabled || Boolean(activeExportKey) || (canExportExcel && !dirtyRows.length)"
          :title="!canExportExcel ? '当前授权未开放该功能' : !dirtyRows.length ? '暂无可导出的脏数据，请重新导入交付数据生成明细' : ''"
          @click="exportDirtyData"
        >
          <LoaderCircle v-if="activeExportKey === 'dirty'" class="spin" :size="18" />
          <Download v-else :size="18" />
          <span>导出脏数据</span>
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
        <strong>中国区培训中心交付地图</strong>
        <span>Training Center Delivery</span>
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
          <span>导入培训表</span>
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
        <button
          class="ghost-button compact"
          :class="{ locked: !canExportExcel }"
          type="button"
          :disabled="interactionDisabled || Boolean(activeExportKey) || (canExportExcel && !dirtyRows.length)"
          :title="!canExportExcel ? '当前授权未开放该功能' : !dirtyRows.length ? '暂无可导出的脏数据，请重新导入交付数据生成明细' : ''"
          @click="exportDirtyData"
        >
          <LoaderCircle v-if="activeExportKey === 'dirty'" class="spin" :size="16" />
          <Download v-else :size="16" />
          <span>脏数据</span>
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

      <div class="training-filter-grid">
        <QualificationFilterSelect v-model="draftFilters.regions" label="大区" :options="dynamicFilterOptions.regions" searchable search-placeholder="搜索大区" />
        <QualificationFilterSelect v-model="draftFilters.productLines" label="产线" :options="dynamicFilterOptions.productLines" searchable search-placeholder="搜索产线" />
        <QualificationFilterSelect v-model="draftFilters.trainingCenters" label="培训中心" :options="dynamicFilterOptions.trainingCenters" searchable search-placeholder="搜索培训中心" />
        <QualificationFilterSelect v-model="draftFilters.courses" label="课程" :options="dynamicFilterOptions.courses" searchable search-placeholder="搜索课程" />

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

      <div v-if="importWarnings.length" class="qualification-warning-list">
        <AlertTriangle :size="16" />
        <span>{{ importWarnings[0] }}</span>
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
          <article v-for="metric in metricCards" :key="`fullscreen-${metric.key}`" class="fullscreen-kpi-card" :class="metric.tone">
            <span>{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
          </article>
        </section>
        <TrainingCoverageAmap
          v-model:displayMode="displayMode"
          :active="active"
          :points="dashboard.mapPoints"
          :loading="loading"
          :fullscreen-active="fullscreenActive && !fullscreenFiltersOpen"
          :selected-branch="fullscreenActive ? focusedCenter : selectedBranch"
          :presentation-mode="fullscreenActive && presentationCarouselEnabled"
          :focused-branch="focusedCenter"
          :label-branches="permanentLabelBranches"
          :selected-regions="appliedFilters.regions"
          :empty-text="emptyStateText"
          @select-center="handleTrainingCenterSelect"
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
                v-for="tab in sideTabs"
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
                <span>培训中心TOP10</span>
                <strong>{{ dashboard.topBranches.length }}</strong>
              </div>
              <div v-if="dashboard.topBranches.length" class="qualification-expandable-block">
                <div class="qualification-rank-list scrollable" :class="{ expanded: expandedSidePanels.branch || fullscreenActive }">
                  <button
                    v-for="(item, index) in displayedTopBranches"
                    :key="item.branch"
                    class="qualification-rank-row"
                    :class="{ focused: activeSideTab === 'branch' && index === sideAnalysisIndex }"
                    :data-branch="item.branch"
                    type="button"
                    @click="openBranchDetail(item.branch)"
                  >
                    <span class="rank-index">{{ index + 1 }}</span>
                    <div class="rank-branch-copy">
                      <strong>{{ item.branch }}</strong>
                      <span>培训人数 {{ item.traineeCount }} / 培训人次 {{ item.recordCount }}</span>
                    </div>
                  </button>
                </div>
                <button v-if="!fullscreenActive && dashboard.topBranches.length > TOP_LIST_LIMIT" class="qualification-expand-button" type="button" @click="toggleSidePanel('branch')">
                  <ChevronUp v-if="expandedSidePanels.branch" :size="16" />
                  <ChevronDown v-else :size="16" />
                  <span>{{ expandedSidePanels.branch ? '收起，仅显示TOP10' : `展开全部 ${dashboard.topBranches.length}项` }}</span>
                </button>
              </div>
              <div v-else class="chart-empty-state compact in-tab">
                <ListOrdered :size="20" />
                <span>{{ emptyStateText }}</span>
              </div>
            </div>

            <div v-else-if="activeSideTab === 'failRate'" class="qualification-tab-panel">
              <div class="qualification-tab-caption">
                <span>不及格率TOP10</span>
                <strong>{{ dashboard.failRateBranches.length }}</strong>
              </div>
              <div v-if="dashboard.failRateBranches.length" class="qualification-expandable-block">
                <div class="qualification-rank-list scrollable" :class="{ expanded: expandedSidePanels.failRate || fullscreenActive }">
                  <button
                    v-for="(item, index) in displayedFailRateBranches"
                    :key="`${item.branch}-fail-rate`"
                    class="qualification-risk-row"
                    :class="{ focused: activeSideTab === 'failRate' && index === sideAnalysisIndex }"
                    :data-branch="item.branch"
                    type="button"
                    @click="openBranchDetail(item.branch)"
                  >
                    <span class="rank-index">{{ index + 1 }}</span>
                    <div class="rank-branch-copy">
                      <strong>{{ item.branch }}</strong>
                      <span>不及格率 {{ item.failRate }} / 不及格 {{ item.failCount }}</span>
                    </div>
                  </button>
                </div>
                <button v-if="!fullscreenActive && dashboard.failRateBranches.length > TOP_LIST_LIMIT" class="qualification-expand-button" type="button" @click="toggleSidePanel('failRate')">
                  <ChevronUp v-if="expandedSidePanels.failRate" :size="16" />
                  <ChevronDown v-else :size="16" />
                  <span>{{ expandedSidePanels.failRate ? '收起，仅显示TOP10' : `展开全部 ${dashboard.failRateBranches.length}项` }}</span>
                </button>
              </div>
              <div v-else class="chart-empty-state compact in-tab">
                <ShieldAlert :size="20" />
                <span>{{ emptyStateText }}</span>
              </div>
            </div>

            <div v-else-if="activeSideTab === 'failCount'" class="qualification-tab-panel">
              <div class="qualification-tab-caption">
                <span>不及格人数TOP10</span>
                <strong>{{ dashboard.failCountBranches.length }}</strong>
              </div>
              <div v-if="dashboard.failCountBranches.length" class="qualification-expandable-block">
                <div class="qualification-rank-list scrollable" :class="{ expanded: expandedSidePanels.failCount || fullscreenActive }">
                  <button
                    v-for="(item, index) in displayedFailCountBranches"
                    :key="`${item.branch}-fail-count`"
                    class="qualification-risk-row"
                    :class="{ focused: activeSideTab === 'failCount' && index === sideAnalysisIndex }"
                    :data-branch="item.branch"
                    type="button"
                    @click="openBranchDetail(item.branch)"
                  >
                    <span class="rank-index">{{ index + 1 }}</span>
                    <div class="rank-branch-copy">
                      <strong>{{ item.branch }}</strong>
                      <span>不及格人数 {{ item.failPersonCount }} / 人次 {{ item.failCount }}</span>
                    </div>
                  </button>
                </div>
                <button v-if="!fullscreenActive && dashboard.failCountBranches.length > TOP_LIST_LIMIT" class="qualification-expand-button" type="button" @click="toggleSidePanel('failCount')">
                  <ChevronUp v-if="expandedSidePanels.failCount" :size="16" />
                  <ChevronDown v-else :size="16" />
                  <span>{{ expandedSidePanels.failCount ? '收起，仅显示TOP10' : `展开全部 ${dashboard.failCountBranches.length}项` }}</span>
                </button>
              </div>
              <div v-else class="chart-empty-state compact in-tab">
                <ShieldAlert :size="20" />
                <span>{{ emptyStateText }}</span>
              </div>
            </div>

            <div v-else-if="activeSideTab === 'product'" class="qualification-tab-panel">
              <div class="qualification-expandable-chart" :class="{ expanded: expandedSidePanels.product }">
                <EChartPanel
                  title="产线分布"
                  kicker="Product Line"
                  :option="productLineBarOption"
                  :loading="loading"
                  :height="productLineChartHeight"
                  :highlight-index="activeSideTab === 'product' ? sideChartHighlightIndex : -1"
                  :empty-text="'暂无产线分布数据'"
                  panelless
                />
              </div>
              <button v-if="!fullscreenActive && dashboard.productLineDistribution.length > CHART_TOP_LIMIT" class="qualification-expand-button" type="button" @click="toggleSidePanel('product')">
                <ChevronUp v-if="expandedSidePanels.product" :size="16" />
                <ChevronDown v-else :size="16" />
                <span>{{ expandedSidePanels.product ? '收起，仅显示TOP10' : `展开全部 ${dashboard.productLineDistribution.length}项` }}</span>
              </button>
            </div>

            <div v-else class="qualification-tab-panel">
              <div class="qualification-expandable-chart" :class="{ expanded: expandedSidePanels.type }">
                <EChartPanel
                  title="课程分布"
                  kicker="Course"
                  :option="trainingTypeBarOption"
                  :loading="loading"
                  :height="trainingTypeChartHeight"
                  :highlight-index="activeSideTab === 'type' ? sideChartHighlightIndex : -1"
                  :empty-text="'暂无课程分布数据'"
                  panelless
                />
              </div>
              <button v-if="!fullscreenActive && dashboard.courseDistribution.length > CHART_TOP_LIMIT" class="qualification-expand-button" type="button" @click="toggleSidePanel('type')">
                <ChevronUp v-if="expandedSidePanels.type" :size="16" />
                <ChevronDown v-else :size="16" />
                <span>{{ expandedSidePanels.type ? '收起，仅显示TOP10' : `展开全部 ${dashboard.courseDistribution.length}项` }}</span>
              </button>
            </div>
          </div>
        </section>
      </aside>
    </section>

    <section v-if="!fullscreenActive" class="glass-panel qualification-table-panel" :class="{ collapsed: !trendExpanded }">
      <div class="panel-title-row">
        <div>
          <p class="section-kicker">Training Trend</p>
          <h2>培训趋势分析</h2>
        </div>
        <button class="ghost-button compact" type="button" @click="trendExpanded = !trendExpanded">
          <span>{{ trendExpanded ? '收起趋势分析' : '展开趋势分析' }}</span>
        </button>
      </div>

      <div v-if="!trendExpanded" class="qualification-collapsed-summary">
        <span>培训趋势分析默认折叠，避免占用首屏空间。</span>
        <strong>{{ dashboard.trendSeries.length }} 个周期</strong>
      </div>
      <EChartPanel
        v-else
        title="培训趋势分析"
        kicker="Training Trend"
        :option="trendOption"
        :loading="loading"
        height="320px"
        :empty-text="'暂无培训趋势数据'"
        panelless
        :show-header="false"
      />
    </section>

    <Transition name="disclaimer-fade">
      <div v-if="branchDetail.branchStat" class="qualification-drawer-backdrop" @click.self="closeBranchDetail">
        <aside class="qualification-drawer">
          <div class="qualification-drawer-head">
            <div>
              <p class="section-kicker">Training Detail</p>
              <h2>{{ branchDetail.branchStat.branch }}培训详情</h2>
            </div>
            <button class="icon-button" type="button" @click="closeBranchDetail">
              <X :size="18" />
            </button>
          </div>

          <div class="training-drawer-metrics">
            <article v-for="metric in branchMetricCards" :key="metric.label" class="metric-card" :class="metric.tone">
              <component :is="metric.icon" :size="18" />
              <span>{{ metric.label }}</span>
              <strong>{{ metric.value }}</strong>
            </article>
          </div>

          <div class="qualification-drawer-chart-grid training-delivery-drawer-chart-grid">
            <EChartPanel title="产线培训分布" kicker="Product Line" :option="branchProductLineOption" height="220px" :empty-text="'暂无产线分布数据'" />
            <EChartPanel title="课程分布" kicker="Course" :option="branchTypeOption" height="220px" :empty-text="'暂无课程数据'" />
            <EChartPanel title="培训周期趋势" kicker="Training Trend" :option="branchTrendOption" height="280px" :empty-text="'暂无趋势数据'" />
          </div>

          <section class="glass-panel qualification-drawer-filter">
            <div class="panel-title-row">
              <div>
                <p class="section-kicker">Detail Table</p>
                <h2>培训明细</h2>
              </div>
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
                <span>导出当前明细</span>
              </button>
            </div>

            <div class="qualification-drawer-filter-row">
              <input v-model.trim="detailKeyword" class="qualification-filter-search" type="text" placeholder="搜索学员姓名" />
              <select v-model="detailStatus">
                <option value="全部">全部</option>
                <option value="合格">合格</option>
                <option value="不合格">不合格</option>
              </select>
            </div>

            <div v-if="filteredBranchRows.length" class="table-shell qualification-table-shell">
              <table>
                <thead>
                  <tr>
                    <th>学员姓名</th>
                    <th>培训名称</th>
                    <th>产线</th>
                    <th>培训周期</th>
                    <th>培训组织方</th>
                    <th>培训中心</th>
                    <th>培训地点</th>
                    <th>培训类型</th>
                    <th>完成情况</th>
                    <th>成绩</th>
                    <th>讲师</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in filteredBranchRows" :key="row.id">
                    <td>{{ row.studentName || '--' }}</td>
                    <td>{{ row.courseName }}</td>
                    <td>{{ row.productLine }}</td>
                    <td>{{ row.trainingCycle }}</td>
                    <td>{{ row.organizer }}</td>
                    <td>{{ row.trainingCenter }}</td>
                    <td>{{ row.trainingLocation }}</td>
                    <td>{{ row.trainingType }}</td>
                    <td>
                      <span class="qualification-status-badge" :class="statusClass(row.trainingResult)">
                        {{ row.trainingResult }}
                      </span>
                    </td>
                    <td>{{ row.score }}</td>
                    <td>{{ row.lecturer }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="empty-preview">
              <TableProperties :size="24" />
              <span>暂无符合条件的培训明细</span>
            </div>
          </section>
        </aside>
      </div>
    </Transition>

    <QualificationImportOverlay
      :visible="importOverlay.visible"
      :mode="importOverlay.mode"
      :progress="importOverlay.progress"
      :title="'正在导入培训数据'"
      :subtitle="'系统正在解析 Excel、清洗培训字段并生成地图数据，请稍候...'"
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
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch, watchEffect } from 'vue';
import {
  AlertTriangle,
  Award,
  BookOpenCheck,
  ChevronDown,
  ChevronUp,
  CircleX,
  Download,
  Eraser,
  ListOrdered,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Presentation,
  RotateCcw,
  Search,
  ShieldAlert,
  TableProperties,
  Upload,
  UserRoundCheck,
  Users,
  X
} from 'lucide-vue-next';
import BlockingOperationModal from '../components/BlockingOperationModal.vue';
import EChartPanel from '../components/EChartPanel.vue';
import QualificationFilterSelect from '../components/QualificationFilterSelect.vue';
import QualificationImportOverlay from '../components/QualificationImportOverlay.vue';
import TrainingCoverageAmap from '../components/TrainingCoverageAmap.vue';
import { LOCAL_DATASET_KEYS, loadToolDataset, saveToolDataset } from '../services/localDataStore';
import { normalizeGeoMap } from '../services/geoCacheService';
import {
  buildTrainingBranchDetail,
  buildTrainingDashboard,
  buildTrainingDynamicOptions,
  cloneTrainingFilters,
  collectTrainingOptions,
  createAllTrainingFilters,
  DEFAULT_TRAINING_FILTERS,
  TRAINING_DELIVERY_FILTER_KEYS
} from '../utils/trainingAggregator';
import { exportBranchTrainingRecords, exportTrainingDirtyRecords, exportTrainingRecords } from '../utils/exportTrainingExcel';
import { parseTrainingFiles } from '../utils/trainingParser';
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
  },
  embedded: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['status-change', 'log', 'feature-blocked', 'enter-fullscreen', 'exit-fullscreen']);

const TOP_LIST_LIMIT = 10;
const CHART_TOP_LIMIT = 10;
const DELIVERY_DATASET_VERSION = 'training-delivery-v2';
const MAP_CAROUSEL_INTERVAL_MS = 5000;
const SIDE_ITEM_INTERVAL_MS = 4000;
const AUTO_RESUME_DELAY_MS = 30000;
const FILTER_LABELS = {
  regions: '大区',
  productLines: '产线',
  trainingCenters: '培训中心',
  courses: '课程'
};
const pageRef = ref(null);
const fileInputRef = ref(null);
const loading = ref(false);
const importedRecords = ref([]);
const constructionRecords = ref([]);
const dirtyRows = ref([]);
const geoCacheMap = shallowRef({});
const importWarnings = ref([]);
const displayMode = ref('training-count');
const fullscreenFiltersOpen = ref(false);
const fullscreenControlsVisible = ref(false);
const fullscreenControlsHovering = ref(false);
const presentationCarouselEnabled = ref(false);
const carouselPaused = ref(false);
const carouselLocked = ref(false);
const focusedCenter = ref('');
const sideAnalysisIndex = ref(0);
const selectedBranch = ref('');
const selectedDetailScope = ref('branch');
const activeSideTab = ref('branch');
const detailKeyword = ref('');
const detailStatus = ref('全部');
const trendExpanded = ref(false);
const expandedSidePanels = reactive({
  branch: false,
  failRate: false,
  failCount: false,
  product: false,
  type: false
});
const importOverlay = reactive(createImportOverlayState());
const activeExportKey = ref('');
const exportFeedback = reactive({
  visible: false,
  title: '',
  message: ''
});
let mapCarouselTimerId = null;
let sideAnalysisTimerId = null;
let autoResumeTimerId = null;
let fullscreenControlsHideTimerId = null;

function toggleBrowserFullscreen() {
  emit(props.fullscreenActive ? 'exit-fullscreen' : 'enter-fullscreen');
}

const draftFilters = reactive(createDefaultFilters());
const appliedFilters = ref(createDefaultFilters());

const filterOptions = computed(() => collectTrainingOptions(importedRecords.value));
const dynamicFilterOptions = computed(() => buildTrainingDynamicOptions(importedRecords.value, draftFilters, filterOptions.value));

const dashboard = computed(() => buildTrainingDashboard(importedRecords.value, appliedFilters.value, geoCacheMap.value));
const hasData = computed(() => Boolean(importedRecords.value.length));
const constructionReady = computed(() => Boolean(constructionRecords.value.length));
const interactionDisabled = computed(() => loading.value || importOverlay.visible);
const emptyStateText = computed(() => {
  if (!constructionReady.value) return '请先导入中国区培训中心建设地图数据';
  return hasData.value ? '暂无符合条件的培训数据，请调整筛选条件。' : '请导入培训中心交付数据';
});
const dataStatusText = computed(() => {
  if (!constructionReady.value) return '请先导入建设地图数据';
  if (!hasData.value) return '待导入交付数据';
  return `已纳入 ${importedRecords.value.length.toLocaleString()} 条交付记录`;
});

const sideTabs = [
  { key: 'branch', label: '培训中心TOP10' },
  { key: 'failRate', label: '不及格率TOP10' },
  { key: 'failCount', label: '不及格人数TOP10' },
  { key: 'product', label: '产线分布' },
  { key: 'type', label: '课程分布' }
];

const metricCards = computed(() => [
  { key: 'traineeCount', label: '培训人数', value: dashboard.value.summary.traineeCount, icon: Users, tone: 'blue' },
  { key: 'recordCount', label: '培训人次', value: dashboard.value.summary.recordCount, icon: BookOpenCheck, tone: 'cyan' },
  { key: 'sessionCount', label: '培训场次', value: dashboard.value.summary.sessionCount, icon: Presentation, tone: 'green' },
  { key: 'passRate', label: '合格率', value: dashboard.value.summary.passRate, icon: Award, tone: 'green' },
  { key: 'failCount', label: '不合格人次', value: dashboard.value.summary.failCount, icon: CircleX, tone: 'red' }
]);

const branchDetail = computed(() => {
  if (!selectedBranch.value) return { branchStat: null, branchRecords: [], fullBranchRecords: [] };
  return buildTrainingBranchDetail(selectedBranch.value, dashboard.value.filteredRecords, selectedDetailScope.value);
});

const filteredBranchRows = computed(() => {
  let rows = branchDetail.value.fullBranchRecords || [];
  if (detailKeyword.value) {
    const keyword = detailKeyword.value.toLowerCase();
    rows = rows.filter((row) => String(row.studentName || '').toLowerCase().includes(keyword));
  }
  if (detailStatus.value !== '全部') {
    rows = rows.filter((row) => row.trainingResult === detailStatus.value);
  }
  return rows.slice(0, 300);
});

const branchMetricCards = computed(() => {
  const stat = branchDetail.value.branchStat;
  if (!stat) return [];
  return [
    { label: '培训人数', value: stat.traineeCount, icon: Users, tone: 'blue' },
    { label: '培训人次', value: stat.recordCount, icon: BookOpenCheck, tone: 'cyan' },
    { label: '培训场次', value: stat.sessionCount, icon: Presentation, tone: 'green' },
    { label: '合格率', value: stat.passRate, icon: UserRoundCheck, tone: 'green' },
    { label: '不合格人次', value: stat.failCount, icon: CircleX, tone: 'red' }
  ];
});

const productLineBarOption = computed(() => buildTopBarOption(dashboard.value.productLineDistribution, '培训人次', expandedSidePanels.product));
const trainingTypeBarOption = computed(() => buildTopBarOption(dashboard.value.courseDistribution, '培训人次', expandedSidePanels.type));
const trendOption = computed(() => buildTrainingTrendOption(dashboard.value.trendSeries));
const branchProductLineOption = computed(() => buildTopBarOption(branchDetail.value.productLineDistribution || [], '培训人次'));
const branchTypeOption = computed(() => buildTopBarOption(branchDetail.value.courseDistribution || [], '培训人次'));
const branchTrendOption = computed(() => buildTrainingTrendOption(branchDetail.value.trendSeries || []));
const displayedTopBranches = computed(() => (props.fullscreenActive
  ? dashboard.value.topBranches
  : getVisibleRows(dashboard.value.topBranches, expandedSidePanels.branch, TOP_LIST_LIMIT)));
const displayedFailRateBranches = computed(() => (props.fullscreenActive
  ? dashboard.value.failRateBranches
  : getVisibleRows(dashboard.value.failRateBranches, expandedSidePanels.failRate, TOP_LIST_LIMIT)));
const displayedFailCountBranches = computed(() => (props.fullscreenActive
  ? dashboard.value.failCountBranches
  : getVisibleRows(dashboard.value.failCountBranches, expandedSidePanels.failCount, TOP_LIST_LIMIT)));
const productLineChartRows = computed(() => getDistributionRows(dashboard.value.productLineDistribution, expandedSidePanels.product, CHART_TOP_LIMIT));
const trainingTypeChartRows = computed(() => getDistributionRows(dashboard.value.courseDistribution, expandedSidePanels.type, CHART_TOP_LIMIT));
const productLineChartHeight = computed(() => chartHeightForRows(productLineChartRows.value.length, 540));
const trainingTypeChartHeight = computed(() => chartHeightForRows(trainingTypeChartRows.value.length, 540));
const permanentLabelBranches = computed(() => {
  if (!props.fullscreenActive || !presentationCarouselEnabled.value) return [];
  return focusedCenter.value ? [focusedCenter.value] : [];
});
const activeSideRows = computed(() => {
  if (activeSideTab.value === 'branch') return displayedTopBranches.value;
  if (activeSideTab.value === 'failRate') return displayedFailRateBranches.value;
  if (activeSideTab.value === 'failCount') return displayedFailCountBranches.value;
  if (activeSideTab.value === 'product') return productLineChartRows.value;
  if (activeSideTab.value === 'type') return trainingTypeChartRows.value;
  return [];
});
const activeSideBranch = computed(() => {
  if (!['branch', 'failRate', 'failCount'].includes(activeSideTab.value)) return '';
  return activeSideRows.value[sideAnalysisIndex.value]?.branch || '';
});
const sideChartHighlightIndex = computed(() => {
  if (!['product', 'type'].includes(activeSideTab.value)) return -1;
  const rowCount = activeSideRows.value.length;
  if (!rowCount || sideAnalysisIndex.value < 0 || sideAnalysisIndex.value >= rowCount) return -1;
  return rowCount - 1 - sideAnalysisIndex.value;
});
const carouselSequence = computed(() => {
  const mapPointByCenter = new Map(dashboard.value.mapPoints.map((point) => [resolveTrainingPointKey(point), point]));
  const addUniquePoints = (target, items) => {
    items.forEach((item) => {
      const point = mapPointByCenter.get(resolveTrainingPointKey(item));
      if (point && !target.some((candidate) => resolveTrainingPointKey(candidate) === resolveTrainingPointKey(point))) {
        target.push(point);
      }
    });
  };

  const result = [];
  addUniquePoints(result, [...dashboard.value.mapPoints].sort(compareTrainingCountPoint).slice(0, 10));
  addUniquePoints(result, [...dashboard.value.mapPoints].filter(isTrainingRiskPoint).sort(compareTrainingRiskPoint).slice(0, 10));
  addUniquePoints(result, dashboard.value.mapPoints);
  return result;
});

watchEffect(() => {
  if (!props.active) return;
  if (!props.fullscreenActive && fullscreenFiltersOpen.value) {
    fullscreenFiltersOpen.value = false;
  }
  if (loading.value) {
    emit('status-change', '培训中心交付地图数据处理中');
    return;
  }
  emit('status-change', hasData.value ? `培训中心交付地图就绪，当前 ${dashboard.value.filteredRecords.length} 条` : '中国区培训中心交付地图待导入数据');
});

onMounted(loadLastDataset);

onBeforeUnmount(() => {
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
    focusedCenter.value = '';
    sideAnalysisIndex.value = 0;
    stopAutoAnalysisTimers();
    clearAutoResumeTimer();
    clearFullscreenControlsTimer();
  }
);

watch(
  () => carouselSequence.value.map((point) => resolveTrainingPointKey(point)).join('|'),
  () => {
    if (!props.fullscreenActive || !presentationCarouselEnabled.value) return;
    if (!carouselSequence.value.some((point) => resolveTrainingPointKey(point) === focusedCenter.value)) {
      focusFirstCarouselPoint();
    }
    startAutoAnalysisTimers();
  }
);

watch(
  () => activeSideTab.value,
  async () => {
    resetSideAnalysisIndex(activeSideTab.value);
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
  dynamicFilterOptions,
  () => {
    pruneInvalidDraftFilters();
  },
  { deep: true }
);

async function openImporter() {
  if (interactionDisabled.value) return;
  const construction = await ensureConstructionContext();
  if (!construction.length) {
    const message = '请先在“中国区培训中心建设地图”导入建设数据，再导入交付数据。';
    importWarnings.value = [message];
    emit('log', message);
    return;
  }
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

function handleTrainingCenterSelect(trainingCenter) {
  if (!props.fullscreenActive) {
    openTrainingCenterDetail(trainingCenter);
    return;
  }
  focusCenterManually(trainingCenter, { pause: true });
}

function focusCenterManually(trainingCenter, options = {}) {
  if (!trainingCenter) return;
  focusedCenter.value = trainingCenter;
  if (options.pause) {
    pauseAutoAnalysisForInteraction();
  }
}

function focusFirstCarouselPoint() {
  const firstPoint = carouselSequence.value[0];
  focusedCenter.value = firstPoint ? resolveTrainingPointKey(firstPoint) : '';
}

function advanceCarouselFocus() {
  if (!presentationCarouselEnabled.value || carouselPaused.value || carouselLocked.value) return;
  const sequence = carouselSequence.value;
  if (!sequence.length) {
    focusedCenter.value = '';
    return;
  }
  const currentIndex = sequence.findIndex((point) => resolveTrainingPointKey(point) === focusedCenter.value);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % sequence.length;
  focusedCenter.value = resolveTrainingPointKey(sequence[nextIndex]);
}

function advanceSideAnalysisTab() {
  const keys = sideTabs.map((tab) => tab.key);
  const currentIndex = keys.indexOf(activeSideTab.value);
  activeSideTab.value = keys[(currentIndex + 1) % keys.length] || 'branch';
  resetSideAnalysisIndex(activeSideTab.value);
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
  selectedBranch.value = '';
  selectedDetailScope.value = 'branch';
  prepareImportOverlay();

  try {
    const construction = await ensureConstructionContext();
    if (!construction.length) {
      throw new Error('请先在“中国区培训中心建设地图”导入建设数据，再导入交付数据。');
    }
    emit('log', `开始导入培训表，共 ${files.length} 个文件`);
    const payload = await parseTrainingFiles(files, {
      onProgress: handleImportProgress,
      constructionRecords: construction
    });
    geoCacheMap.value = {};
    updateImportOverlayStep('generate', 'processing', 94, '正在生成地图与分析数据...');
    importedRecords.value = payload.records;
    dirtyRows.value = payload.dirtyRows || [];
    importWarnings.value = payload.warnings || [];
    const allFilters = createAllFiltersFromOptions();
    Object.assign(draftFilters, allFilters);
    appliedFilters.value = cloneFilters(allFilters);
    resetSidePanelExpansion();
    await saveToolDataset(LOCAL_DATASET_KEYS.TRAINING_COVERAGE_MAP, {
      version: DELIVERY_DATASET_VERSION,
      records: importedRecords.value,
      dirtyRows: dirtyRows.value,
      warnings: importWarnings.value,
      validation: payload.validation,
      geoMap: geoCacheMap.value
    });
    await nextTick();
    updateImportOverlayStep('generate', 'completed', 100, '导入完成');
    importOverlay.mode = 'success';
    emit('log', `培训中心交付数据导入完成，共纳入 ${payload.records.length} 条记录，未纳入 ${payload.validation?.skippedRows || 0} 条`);
    window.setTimeout(() => {
      loading.value = false;
      resetImportOverlay();
    }, 500);
  } catch (error) {
    emit('log', error.message || '培训数据导入失败');
    importWarnings.value = [error.message || '培训数据导入失败'];
    loading.value = false;
    markImportOverlayFailed(error.message || '导入失败：请检查培训表字段结构。');
  } finally {
    event.target.value = '';
  }
}

function applyFilters() {
  if (!validateDraftFilters()) return;
  appliedFilters.value = cloneFilters(draftFilters);
  selectedBranch.value = '';
  selectedDetailScope.value = 'branch';
  detailKeyword.value = '';
  detailStatus.value = '全部';
  resetSidePanelExpansion();
  resetSideAnalysisIndex(activeSideTab.value);
  emit('log', `刷新培训中心交付地图，当前结果 ${dashboard.value.filteredRecords.length} 条`);
}

function resetFilters() {
  const allFilters = createAllFiltersFromOptions();
  Object.assign(draftFilters, allFilters);
  appliedFilters.value = cloneFilters(allFilters);
  selectedBranch.value = '';
  selectedDetailScope.value = 'branch';
  detailKeyword.value = '';
  detailStatus.value = '全部';
  resetSidePanelExpansion();
  resetSideAnalysisIndex(activeSideTab.value);
  emit('log', '已重置培训中心交付地图筛选条件');
}

function selectSideTab(tabKey) {
  if (props.fullscreenActive) {
    pauseAutoAnalysisForInteraction();
  }
  activeSideTab.value = tabKey;
  resetSideAnalysisIndex(tabKey);
  resetSidePanelExpansion();
}

function resetSideAnalysisIndex(tabKey) {
  sideAnalysisIndex.value = ['product', 'type'].includes(tabKey) ? -1 : 0;
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
    '系统正在生成培训中心交付筛选结果 Excel，请不要重复点击导出按钮。',
    () => {
      exportTrainingRecords(dashboard.value.filteredRecords);
      emit('log', `已导出当前培训结果，共 ${dashboard.value.filteredRecords.length} 条`);
    }
  );
}

function openBranchDetail(branch) {
  if (props.fullscreenActive) {
    pauseAutoAnalysisForInteraction();
    return;
  }
  selectedBranch.value = branch;
  selectedDetailScope.value = 'branch';
  detailKeyword.value = '';
  detailStatus.value = '全部';
}

function openTrainingCenterDetail(trainingCenter) {
  selectedBranch.value = trainingCenter;
  selectedDetailScope.value = 'trainingCenter';
  detailKeyword.value = '';
  detailStatus.value = '全部';
}

function closeBranchDetail() {
  selectedBranch.value = '';
  selectedDetailScope.value = 'branch';
}

async function exportBranchDetail() {
  if (!props.canExportExcel) {
    emit('feature-blocked', 'Excel导出');
    return;
  }
  if (!branchDetail.value.branchStat || !filteredBranchRows.value.length || activeExportKey.value) return;
  await runExportFeedback(
    'branch',
    '正在导出当前明细',
    `系统正在生成 ${branchDetail.value.branchStat.branch} 培训明细 Excel，请不要重复点击导出按钮。`,
    () => {
      exportBranchTrainingRecords(branchDetail.value.branchStat.branch, filteredBranchRows.value);
      emit('log', `已导出 ${branchDetail.value.branchStat.branch} 培训明细`);
    }
  );
}

function statusClass(status) {
  if (status === '不合格') return 'critical';
  if (status === '合格') return 'good';
  return 'warning';
}

function resolveTrainingPointKey(point) {
  return point?.trainingCenter || point?.branch || '';
}

function isTrainingRiskPoint(point) {
  if (!point) return false;
  if (Number(point.failCount || 0) > 0) return true;
  if (point.hasEffectiveResult && Number(point.passRateValue ?? 100) < 70) return true;
  return false;
}

function compareTrainingCountPoint(left, right) {
  return Number(right.recordCount || 0) - Number(left.recordCount || 0)
    || Number(right.traineeCount || 0) - Number(left.traineeCount || 0)
    || resolveTrainingPointKey(left).localeCompare(resolveTrainingPointKey(right), 'zh-CN');
}

async function exportDirtyData() {
  if (!props.canExportExcel) {
    emit('feature-blocked', 'Excel导出');
    return;
  }
  if (!dirtyRows.value.length || activeExportKey.value) return;
  await runExportFeedback(
    'dirty',
    '正在导出脏数据',
    '系统正在生成培训中心交付脏数据 Excel，请不要重复点击导出按钮。',
    () => {
      exportTrainingDirtyRecords(dirtyRows.value);
      emit('log', `已导出培训中心交付脏数据，共 ${dirtyRows.value.length} 条`);
    }
  );
}

function compareTrainingRiskPoint(left, right) {
  return Number(right.failCount || 0) - Number(left.failCount || 0)
    || Number(left.passRateValue ?? 100) - Number(right.passRateValue ?? 100)
    || resolveTrainingPointKey(left).localeCompare(resolveTrainingPointKey(right), 'zh-CN');
}

function createDefaultFilters() {
  return cloneFilters(DEFAULT_TRAINING_FILTERS);
}

function createAllFiltersFromOptions() {
  return createAllTrainingFilters(filterOptions.value);
}

function cloneFilters(filters) {
  return cloneTrainingFilters(filters);
}

function validateDraftFilters() {
  if (!hasData.value) {
    importWarnings.value = [constructionReady.value ? '请先导入培训中心交付数据后再查询。' : '请先导入中国区培训中心建设地图数据。'];
    return false;
  }
  const missingKey = TRAINING_DELIVERY_FILTER_KEYS.find((key) => !draftFilters[key]?.length);
  if (missingKey) {
    importWarnings.value = [`请先选择${FILTER_LABELS[missingKey]}后再查询；“全部”也算已选择。`];
    return false;
  }
  return true;
}

function pruneInvalidDraftFilters() {
  TRAINING_DELIVERY_FILTER_KEYS.forEach((key) => {
    const validValues = new Set(dynamicFilterOptions.value[key] || []);
    const currentValues = draftFilters[key] || [];
    if (!currentValues.length) return;
    const nextValues = currentValues.filter((value) => validValues.has(value));
    if (nextValues.length !== currentValues.length) {
      draftFilters[key] = nextValues;
    }
  });
}

async function ensureConstructionContext(options = {}) {
  if (constructionRecords.value.length) return constructionRecords.value;
  const record = await loadToolDataset(LOCAL_DATASET_KEYS.TRAINING_CONSTRUCTION_MAP);
  const records = record?.payload?.records || [];
  if (!records.length) return [];
  constructionRecords.value = records;
  if (!options.silent) {
    emit('log', `已读取建设地图数据，共 ${records.length} 条中心-课程承接关系`);
  }
  return constructionRecords.value;
}

function buildTopBarOption(seriesData, seriesName, expanded = false) {
  if (!seriesData?.length) return null;
  const rows = getDistributionRows(seriesData, expanded, CHART_TOP_LIMIT);
  const displayRows = [...rows].reverse();
  return {
    backgroundColor: 'transparent',
    grid: { left: 8, right: 14, top: 8, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const current = params?.[0];
        if (!current) return '';
        return `${current.name}<br/>${seriesName}：${Number(current.value || 0).toLocaleString('zh-CN')}`;
      }
    },
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
        color: '#d7e8fa',
        width: 86,
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
        backgroundStyle: { color: 'rgba(96, 165, 250, 0.08)', borderRadius: 999 },
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
          color: '#eef8ff',
          fontWeight: 700,
          formatter: ({ value }) => formatShortNumber(value),
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

function buildTrainingTrendOption(seriesData) {
  if (!seriesData?.length) return null;
  return {
    backgroundColor: 'transparent',
    grid: { left: 44, right: 44, top: 58, bottom: 36, containLabel: true },
    tooltip: { trigger: 'axis' },
    legend: {
      top: 2,
      itemWidth: 16,
      itemHeight: 9,
      itemGap: 10,
      textStyle: { color: '#a4c0dd' }
    },
    xAxis: {
      type: 'category',
      data: seriesData.map((item) => item.label),
      axisLine: { lineStyle: { color: 'rgba(150, 190, 220, 0.3)' } },
      axisLabel: { color: '#bcd6ef' }
    },
    yAxis: [
      {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: 'rgba(120, 170, 210, 0.08)' } },
        axisLabel: { color: '#8fb5d8' }
      },
      {
        type: 'value',
        min: 0,
        max: 100,
        axisLine: { show: false },
        splitLine: { show: false },
        axisLabel: {
          color: '#8fb5d8',
          formatter: (value) => `${value}%`
        }
      }
    ],
    series: [
      {
        name: '培训人次',
        type: 'bar',
        data: seriesData.map((item) => item.recordCount),
        barMaxWidth: 18,
        itemStyle: { color: '#00d4ff', borderRadius: [6, 6, 0, 0] }
      },
      {
        name: '培训人数',
        type: 'bar',
        data: seriesData.map((item) => item.traineeCount),
        barMaxWidth: 18,
        itemStyle: { color: '#00ff88', borderRadius: [6, 6, 0, 0] }
      },
      {
        name: '合格率',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        data: seriesData.map((item) => item.passRateValue),
        lineStyle: { color: '#fbbf24', width: 2 },
        itemStyle: { color: '#fbbf24' }
      }
    ]
  };
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

function createImportOverlayState() {
  return {
    visible: false,
    mode: 'progress',
    progress: 0,
    message: '',
    errorTitle: '',
    errorMessage: '',
    steps: [
      { key: 'read', label: '读取 Excel 文件', status: 'waiting' },
      { key: 'structure', label: '识别培训字段', status: 'waiting' },
      { key: 'clean', label: '清洗培训数据', status: 'waiting' },
      { key: 'result', label: '计算培训结果', status: 'waiting' },
      { key: 'generate', label: '生成地图与分析数据', status: 'waiting' }
    ]
  };
}

function prepareImportOverlay() {
  Object.assign(importOverlay, createImportOverlayState(), {
    visible: true,
    mode: 'progress',
    message: '正在准备导入...'
  });
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
  importOverlay.progress = progress ?? importOverlay.progress;
  importOverlay.message = message || importOverlay.message;
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
  window.setTimeout(() => openImporter(), 60);
}

function closeImportOverlay() {
  resetImportOverlay();
}

async function loadLastDataset() {
  const construction = await ensureConstructionContext({ silent: true });
  if (!construction.length) {
    importWarnings.value = ['请先在“中国区培训中心建设地图”导入建设数据，再导入交付数据。'];
    return;
  }
  const record = await loadToolDataset(LOCAL_DATASET_KEYS.TRAINING_COVERAGE_MAP);
  const payload = record?.payload;
  if (!payload?.records?.length) return;
  if (payload.version !== DELIVERY_DATASET_VERSION) {
    importWarnings.value = ['交付地图逻辑已更新，请重新导入培训中心交付数据。'];
    return;
  }
  importedRecords.value = payload.records;
  dirtyRows.value = payload.dirtyRows || [];
  geoCacheMap.value = payload.geoMap ? normalizeGeoMap(payload.geoMap) : {};
  importWarnings.value = payload.warnings || [];
  const allFilters = createAllFiltersFromOptions();
  Object.assign(draftFilters, allFilters);
  appliedFilters.value = cloneFilters(allFilters);
  selectedBranch.value = '';
  selectedDetailScope.value = 'branch';
  detailKeyword.value = '';
  detailStatus.value = '全部';
  resetSidePanelExpansion();
  emit('log', `已加载上次培训中心交付地图数据，共 ${importedRecords.value.length} 条`);
}
</script>
