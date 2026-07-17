<template>
  <div
    class="tool-page qualification-page training-page training-construction-page"
    :class="{ 'fullscreen-workspace': fullscreenActive, 'fullscreen-filter-open': fullscreenFiltersOpen }"
  >
    <section v-if="!fullscreenActive" class="tool-header qualification-tool-header">
      <div class="qualification-tool-heading">
        <div class="tool-icon">
          <MapPinned :size="24" />
        </div>
        <div>
          <p class="section-kicker">TRAINING CENTER CONSTRUCTION</p>
          <h1>中国区培训中心建设地图</h1>
          <p>基于内部承接、渠道承接方案和课程标准，展示全国培训中心可承接课程能力</p>
        </div>
      </div>
      <div class="qualification-header-actions">
        <input
          ref="fileInputRef"
          class="hidden-file-input"
          type="file"
          accept=".xlsx,.xls"
          @change="handleFileImport"
        />
        <button class="primary-button" type="button" :disabled="interactionDisabled" @click="openImporter">
          <Upload :size="18" />
          <span>导入建设表</span>
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
          :title="!canExportExcel ? '当前授权未开放该功能' : !dirtyRows.length ? '暂无可导出的脏数据，请重新导入建设表生成明细' : ''"
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
        <strong>中国区培训中心建设地图</strong>
        <span>Training Center Construction</span>
      </div>
      <div class="fullscreen-training-actions visible">
        <input
          ref="fileInputRef"
          class="hidden-file-input"
          type="file"
          accept=".xlsx,.xls"
          @change="handleFileImport"
        />
        <button class="primary-button compact" type="button" :disabled="interactionDisabled" @click="openImporter">
          <Upload :size="16" />
          <span>导入建设表</span>
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
          <span>导出</span>
        </button>
        <button
          class="ghost-button compact"
          :class="{ locked: !canExportExcel }"
          type="button"
          :disabled="interactionDisabled || Boolean(activeExportKey) || (canExportExcel && !dirtyRows.length)"
          :title="!canExportExcel ? '当前授权未开放该功能' : !dirtyRows.length ? '暂无可导出的脏数据，请重新导入建设表生成明细' : ''"
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

      <div class="construction-filter-grid">
        <QualificationFilterSelect v-model="draftFilters.regions" label="大区" :options="regionFilterOptions" searchable search-placeholder="搜索大区" />
        <QualificationFilterSelect v-model="draftFilters.productLines" label="产线" :options="productLineFilterOptions" searchable search-placeholder="搜索产线" />
        <QualificationFilterSelect v-model="draftFilters.courses" label="课程" :options="courseFilterOptions" searchable search-placeholder="搜索课程名称" />

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

    <section v-if="!fullscreenActive" class="qualification-metric-grid construction-metric-grid">
      <article v-for="metric in metricCards" :key="metric.key" class="metric-card" :class="metric.tone">
        <component :is="metric.icon" :size="20" />
        <span class="qualification-metric-label">{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
      </article>
    </section>

    <section class="qualification-main-grid">
      <div class="training-map-stage">
        <section v-if="fullscreenActive" class="fullscreen-kpi-overlay">
          <article v-for="metric in metricCards" :key="`fullscreen-${metric.key}`" class="fullscreen-kpi-card" :class="metric.tone">
            <span>{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
          </article>
        </section>
        <TrainingConstructionMapCanvas
          :active="active"
          :points="dashboard.mapPoints"
          :loading="loading"
          :fullscreen-active="fullscreenActive && !fullscreenFiltersOpen"
          :selected-center="selectedCenter"
          :selected-regions="appliedFilters.regions"
          :empty-text="emptyStateText"
          @select-center="openCenterDetail"
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
                @click="activeSideTab = tab.key"
              >
                {{ tab.label }}
              </button>
            </div>
          </div>

          <div class="qualification-tab-body">
            <div v-if="activeSideTab === 'center'" class="qualification-tab-panel">
              <div class="qualification-tab-caption">
                <span>中心能力TOP10</span>
                <strong>{{ dashboard.topCenters.length }}</strong>
              </div>
              <div v-if="dashboard.topCenters.length" class="qualification-rank-list scrollable">
                <button
                  v-for="(item, index) in dashboard.topCenters.slice(0, 10)"
                  :key="item.centerName"
                  class="qualification-rank-row construction-rank-row"
                  :class="{ focused: selectedCenter === item.centerName }"
                  type="button"
                  @click="openCenterDetail(item.centerName)"
                >
                  <span>{{ index + 1 }}</span>
                  <strong>{{ item.centerName }}</strong>
                  <em>{{ item.courseCount }}门</em>
                </button>
              </div>
              <div v-else class="empty-inline">暂无中心数据</div>
            </div>

            <div v-else-if="activeSideTab === 'product'" class="qualification-tab-panel analysis single">
              <EChartPanel
                title="产线承接分布"
                :option="productLineBarOption"
                height="260px"
                panelless
                :show-header="false"
              />
            </div>

            <div v-else-if="activeSideTab === 'region'" class="qualification-tab-panel">
              <div class="qualification-tab-caption">
                <span>大区覆盖</span>
                <strong>{{ dashboard.regionDistribution.filter((item) => item.centerCount).length }}</strong>
              </div>
              <div class="qualification-rank-list scrollable">
                <button
                  v-for="item in dashboard.regionDistribution"
                  :key="item.name"
                  class="qualification-rank-row construction-rank-row"
                  type="button"
                  @click="selectRegionFromSide(item.name)"
                >
                  <span>{{ item.centerCount }}</span>
                  <strong>{{ item.name }}</strong>
                  <em>{{ item.courseCount }}门</em>
                </button>
              </div>
            </div>

            <div v-else class="qualification-tab-panel">
              <div class="qualification-tab-caption">
                <span>导入校验</span>
                <strong>{{ importWarnings.length }}</strong>
              </div>
              <div class="construction-validation-list">
                <div class="construction-validation-row">
                  <span>基础信息中心</span>
                  <strong>{{ validationSummary.baseCenterCount }}</strong>
                </div>
                <div class="construction-validation-row">
                  <span>课程标准课程</span>
                  <strong>{{ validationSummary.courseCatalogCount }}</strong>
                </div>
                <div class="construction-validation-row">
                  <span>原始课程名</span>
                  <strong>{{ validationSummary.rawCourseNameCount }}</strong>
                </div>
                <div class="construction-validation-row">
                  <span>命中标准课程</span>
                  <strong>{{ validationSummary.standardMatchedCourseCount }}</strong>
                </div>
                <div class="construction-validation-row">
                  <span>标准外课程</span>
                  <strong>{{ validationSummary.nonStandardCourses?.length || 0 }}</strong>
                </div>
                <div class="construction-validation-row">
                  <span>内部承接课程</span>
                  <strong>{{ validationSummary.internalCourseCount }}</strong>
                </div>
                <div class="construction-validation-row">
                  <span>讲师待维护关系</span>
                  <strong>{{ validationSummary.missingTeacherRows }}</strong>
                </div>
                <div class="construction-validation-row">
                  <span>重复承接跳过</span>
                  <strong>{{ validationSummary.duplicateCenterCourseRows }}</strong>
                </div>
                <div class="construction-validation-row">
                  <span>脏数据明细</span>
                  <strong>{{ dirtyRows.length }}</strong>
                </div>
                <div class="construction-validation-row">
                  <span>缺字段跳过行</span>
                  <strong>{{ validationSummary.channelRowsMissingRequiredFields }}</strong>
                </div>
                <p v-for="warning in importWarnings" :key="warning" class="construction-validation-warning">
                  {{ warning }}
                </p>
                <p v-if="!importWarnings.length" class="construction-validation-ok">当前导入数据校验通过。</p>
              </div>
            </div>
          </div>
        </section>
      </aside>
    </section>

    <Teleport to="body">
      <div v-if="centerDetail.centerStat" class="qualification-drawer-backdrop" @click.self="closeCenterDetail">
        <aside class="qualification-drawer construction-detail-drawer">
          <div class="qualification-drawer-head">
            <div>
              <p class="section-kicker">Center Detail</p>
              <h2>{{ centerDetail.centerStat.centerName }}</h2>
              <span>{{ centerDetail.centerStat.centerType }}｜{{ centerDetail.centerStat.mappedRegion }}｜{{ centerDetail.centerStat.city }}</span>
            </div>
            <div class="qualification-drawer-actions">
              <button
                class="ghost-button"
                type="button"
                :disabled="!canExportExcel || Boolean(activeExportKey)"
                @click="exportCenterDetail"
              >
                <LoaderCircle v-if="activeExportKey === 'center'" class="spin" :size="17" />
                <Download v-else :size="17" />
                <span>导出当前中心明细</span>
              </button>
              <button class="icon-button" type="button" @click="closeCenterDetail">
                <X :size="18" />
              </button>
            </div>
          </div>

          <div class="qualification-drawer-metrics">
            <article class="metric-card blue">
              <BookOpenCheck :size="20" />
              <span>可承接课程</span>
              <strong>{{ centerDetail.centerStat.courseCount }}</strong>
            </article>
            <article class="metric-card cyan">
              <Layers3 :size="20" />
              <span>覆盖产线</span>
              <strong>{{ centerDetail.centerStat.productLineCount }}</strong>
            </article>
            <article class="metric-card green">
              <Users :size="20" />
              <span>维护讲师</span>
              <strong>{{ centerDetail.centerStat.teacherCount }}</strong>
            </article>
          </div>

          <section class="glass-panel qualification-drawer-filter construction-center-profile">
            <div>
              <span>地址</span>
              <strong>{{ centerDetail.centerStat.address || '-' }}</strong>
            </div>
            <div>
              <span>对接人</span>
              <strong>{{ centerDetail.centerStat.contact || '-' }}</strong>
            </div>
            <div>
              <span>电话</span>
              <strong>{{ centerDetail.centerStat.phone || '-' }}</strong>
            </div>
          </section>

          <div class="qualification-drawer-chart-grid construction-drawer-grid">
            <EChartPanel
              title="中心产线分布"
              :option="centerProductLineBarOption"
              height="240px"
              panelless
              :show-header="false"
            />
            <EChartPanel
              title="讲师课程分布"
              :option="centerTeacherBarOption"
              height="240px"
              panelless
              :show-header="false"
            />
          </div>

          <div class="table-shell qualification-table-shell construction-center-table">
            <table>
              <thead>
                <tr>
                  <th>产线</th>
                  <th>课程</th>
                  <th>子产线</th>
                  <th>需要样机</th>
                  <th>讲师</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in centerDetail.courseRows" :key="`${row.centerName}-${row.courseName}`">
                  <td>{{ row.productLine }}</td>
                  <td>{{ row.courseName }}</td>
                  <td>{{ row.subProductLine || '-' }}</td>
                  <td>{{ row.requiredModel || '-' }}</td>
                  <td>{{ row.teacherText }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </aside>
      </div>
    </Teleport>

    <QualificationImportOverlay
      :visible="importOverlay.visible"
      :mode="importOverlay.mode"
      :progress="importOverlay.progress"
      :title="importOverlay.title"
      :subtitle="importOverlay.subtitle"
      :message="importOverlay.message"
      :steps="importOverlay.steps"
      :error-title="importOverlay.errorTitle"
      :error-message="importOverlay.errorMessage"
      @retry="openImporter"
      @close="importOverlay.visible = false"
    />

    <BlockingOperationModal
      :visible="exportFeedback.visible"
      title="正在导出 Excel"
      :message="exportFeedback.message"
    />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch, watchEffect } from 'vue';
import {
  AlertTriangle,
  BookOpenCheck,
  Building2,
  Download,
  Eraser,
  Layers3,
  LoaderCircle,
  MapPinned,
  Maximize2,
  Minimize2,
  Network,
  RotateCcw,
  Search,
  Upload,
  Users,
  X
} from 'lucide-vue-next';
import BlockingOperationModal from '../components/BlockingOperationModal.vue';
import EChartPanel from '../components/EChartPanel.vue';
import QualificationFilterSelect from '../components/QualificationFilterSelect.vue';
import QualificationImportOverlay from '../components/QualificationImportOverlay.vue';
import TrainingConstructionMapCanvas from '../components/TrainingConstructionMapCanvas.vue';
import { LOCAL_DATASET_KEYS, loadToolDataset, saveToolDataset } from '../services/localDataStore';
import {
  buildTrainingConstructionCenterDetail,
  buildTrainingConstructionDashboard,
  buildTrainingConstructionDynamicOptions,
  cloneTrainingConstructionFilters,
  collectTrainingConstructionOptions,
  createAllTrainingConstructionFilters,
  DEFAULT_TRAINING_CONSTRUCTION_FILTERS,
  TRAINING_CONSTRUCTION_FILTER_KEYS
} from '../utils/trainingConstructionAggregator';
import {
  exportTrainingConstructionCenterRecords,
  exportTrainingConstructionDirtyRecords,
  exportTrainingConstructionRecords
} from '../utils/exportTrainingExcel';
import { parseTrainingConstructionFiles } from '../utils/trainingConstructionParser';
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

const fileInputRef = ref(null);
const loading = ref(false);
const importedRecords = ref([]);
const dirtyRows = ref([]);
const importWarnings = ref([]);
const validationSummary = ref(createEmptyValidationSummary());
const fullscreenFiltersOpen = ref(false);
const selectedCenter = ref('');
const activeSideTab = ref('center');
const filterValidationMessage = ref('');
const activeExportKey = ref('');
const importOverlay = reactive(createImportOverlayState());
const exportFeedback = reactive({
  visible: false,
  message: ''
});

const draftFilters = reactive(createDefaultFilters());
const appliedFilters = ref(createDefaultFilters());

const filterOptions = computed(() => collectTrainingConstructionOptions(importedRecords.value));
const dynamicFilterOptions = computed(() => buildTrainingConstructionDynamicOptions(importedRecords.value, draftFilters, filterOptions.value));
const regionFilterOptions = computed(() => dynamicFilterOptions.value.regions);
const productLineFilterOptions = computed(() => dynamicFilterOptions.value.productLines);
const courseFilterOptions = computed(() => dynamicFilterOptions.value.courses);
const dashboard = computed(() => buildTrainingConstructionDashboard(importedRecords.value, appliedFilters.value));
const hasData = computed(() => Boolean(importedRecords.value.length));
const interactionDisabled = computed(() => loading.value || importOverlay.visible);
const emptyStateText = computed(() => (hasData.value ? '暂无符合条件的建设数据，请调整筛选条件。' : '请导入培训中心建设表'));
const dataStatusText = computed(() => {
  if (!hasData.value) return '待导入建设数据';
  return `已导入 ${importedRecords.value.length.toLocaleString('zh-CN')} 条中心课程关系`;
});
const warningMessage = computed(() => filterValidationMessage.value);

const metricCards = computed(() => [
  { key: 'totalCenters', label: '培训中心数', value: dashboard.value.summary.totalCenters, icon: Building2, tone: 'blue' },
  { key: 'internalCenters', label: '内部中心', value: dashboard.value.summary.internalCenters, icon: MapPinned, tone: 'cyan' },
  { key: 'channelCenters', label: '渠道中心', value: dashboard.value.summary.channelCenters, icon: Network, tone: 'green' },
  { key: 'coveredCourses', label: '覆盖标准课程', value: dashboard.value.summary.coveredCourses, icon: BookOpenCheck, tone: 'orange' },
  { key: 'relations', label: '承接关系', value: dashboard.value.summary.centerCourseRelations, icon: Layers3, tone: 'green' }
]);

const sideTabs = [
  { key: 'center', label: '中心TOP10' },
  { key: 'product', label: '产线分布' },
  { key: 'region', label: '大区覆盖' },
  { key: 'validation', label: '导入校验' }
];

const centerDetail = computed(() => {
  if (!selectedCenter.value) {
    return { centerStat: null, centerRecords: [], courseRows: [], productLineDistribution: [], teacherDistribution: [] };
  }
  return buildTrainingConstructionCenterDetail(selectedCenter.value, dashboard.value.filteredRecords);
});
const productLineBarOption = computed(() => buildBarOption(dashboard.value.productLineDistribution, '承接关系'));
const centerProductLineBarOption = computed(() => buildBarOption(centerDetail.value.productLineDistribution || [], '课程数'));
const centerTeacherBarOption = computed(() => buildBarOption(centerDetail.value.teacherDistribution || [], '课程数'));

onMounted(loadLastDataset);

onBeforeUnmount(() => {
  importOverlay.visible = false;
  exportFeedback.visible = false;
});

watchEffect(() => {
  if (!props.active) return;
  if (loading.value) {
    emit('status-change', '培训中心建设地图数据处理中');
    return;
  }
  emit('status-change', hasData.value ? `培训中心建设地图就绪，当前 ${dashboard.value.filteredRecords.length} 条` : '中国区培训中心建设地图待导入数据');
});

watch(
  () => dynamicFilterOptions.value,
  () => pruneInvalidSpecificFilterSelections(),
  { deep: true }
);

function toggleBrowserFullscreen() {
  emit(props.fullscreenActive ? 'exit-fullscreen' : 'enter-fullscreen');
}

function openImporter() {
  if (interactionDisabled.value) return;
  fileInputRef.value?.click();
}

async function handleFileImport(event) {
  const files = Array.from(event.target.files || []);
  event.target.value = '';
  if (!files.length) return;

  loading.value = true;
  selectedCenter.value = '';
  filterValidationMessage.value = '';
  importOverlay.visible = true;
  importOverlay.mode = 'progress';
  importOverlay.progress = 0;
  importOverlay.title = '正在导入培训中心建设数据';
  importOverlay.subtitle = '系统正在解析内部承接、渠道承接方案、基础信息和课程标准。';
  importOverlay.message = '正在准备读取 Excel...';
  resetImportSteps();

  try {
    const result = await runWithMinimumVisibleTime(() => parseTrainingConstructionFiles(files, {
      onProgress: updateImportProgress
    }), 700);
    importedRecords.value = result.records;
    dirtyRows.value = result.dirtyRows || [];
    importWarnings.value = result.warnings || [];
    validationSummary.value = normalizeValidationSummary(result.validation);
    resetFiltersToAll();
    await saveToolDataset(LOCAL_DATASET_KEYS.TRAINING_CONSTRUCTION_MAP, {
      records: result.records,
      dirtyRows: result.dirtyRows || [],
      warnings: result.warnings || [],
      validation: result.validation || createEmptyValidationSummary(),
      sourceFiles: files.map((file) => file.name),
      importedAt: result.importedAt
    });
    importOverlay.mode = 'success';
    importOverlay.progress = 100;
    importOverlay.message = '培训中心建设地图数据已更新。';
    window.setTimeout(() => {
      importOverlay.visible = false;
    }, 500);
    emit('log', `已导入培训中心建设数据，共 ${result.records.length} 条中心课程关系`);
  } catch (error) {
    importOverlay.mode = 'error';
    importOverlay.errorTitle = '导入建设表失败';
    importOverlay.errorMessage = error.message || '请检查 Excel 文件结构后重试。';
    emit('log', `培训中心建设表导入失败：${importOverlay.errorMessage}`);
  } finally {
    loading.value = false;
  }
}

function updateImportProgress(payload = {}) {
  importOverlay.progress = Math.max(importOverlay.progress, Math.round(payload.progress || 0));
  importOverlay.message = payload.message || importOverlay.message;
  const step = importOverlay.steps.find((item) => item.key === payload.step);
  if (step) {
    step.status = payload.status || 'processing';
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
  appliedFilters.value = cloneTrainingConstructionFilters(draftFilters);
  selectedCenter.value = '';
  emit('log', `刷新培训中心建设地图，当前结果 ${dashboard.value.filteredRecords.length} 条`);
}

function resetFilters() {
  if (!hasData.value) {
    filterValidationMessage.value = '请先导入培训中心建设表后再重置筛选。';
    return;
  }
  resetFiltersToAll();
  selectedCenter.value = '';
  emit('log', '已重置培训中心建设地图筛选条件');
}

function resetFiltersToAll() {
  const allFilters = createAllTrainingConstructionFilters(filterOptions.value);
  Object.assign(draftFilters, allFilters);
  appliedFilters.value = cloneTrainingConstructionFilters(allFilters);
  filterValidationMessage.value = '';
}

function validateDraftFilters() {
  if (!hasData.value) {
    return { valid: false, message: '请先导入培训中心建设表后再查询。' };
  }
  const rules = [
    { key: 'regions', label: '大区', options: regionFilterOptions.value },
    { key: 'productLines', label: '产线', options: productLineFilterOptions.value },
    { key: 'courses', label: '课程', options: courseFilterOptions.value }
  ];
  const missingLabels = [];
  const emptyOptionLabels = [];
  rules.forEach(({ key, label, options }) => {
    const optionList = options || [];
    if (!optionList.length) {
      emptyOptionLabels.push(label);
      return;
    }
    const optionSet = new Set(optionList);
    const selectedVisibleCount = (draftFilters[key] || []).filter((value) => optionSet.has(value)).length;
    if (!selectedVisibleCount) missingLabels.push(label);
  });
  if (emptyOptionLabels.length) {
    return {
      valid: false,
      message: `当前筛选条件下「${emptyOptionLabels.join('、')}」暂无可选项，请先调整上级筛选条件。`
    };
  }
  if (missingLabels.length) {
    return { valid: false, message: `请选择：${missingLabels.join('、')}。` };
  }
  return { valid: true, message: '' };
}

function pruneInvalidSpecificFilterSelections() {
  if (!hasData.value) return;
  let changed = false;
  const baseOptions = filterOptions.value;
  const optionMap = dynamicFilterOptions.value;
  TRAINING_CONSTRUCTION_FILTER_KEYS.forEach((key) => {
    const currentValues = draftFilters[key] || [];
    if (!currentValues.length || isGlobalAllSelected(currentValues, baseOptions[key] || [])) return;
    const optionSet = new Set(optionMap[key] || []);
    const nextValues = currentValues.filter((value) => optionSet.has(value));
    if (nextValues.length === currentValues.length) return;
    draftFilters[key] = nextValues;
    changed = true;
  });
  if (changed) filterValidationMessage.value = '';
}

function isGlobalAllSelected(selectedValues, baseValues) {
  const base = (baseValues || []).filter(Boolean);
  if (!base.length) return false;
  const selectedSet = new Set((selectedValues || []).filter(Boolean));
  return base.every((value) => selectedSet.has(value));
}

function openCenterDetail(centerName) {
  if (props.fullscreenActive) {
    selectedCenter.value = centerName;
    return;
  }
  selectedCenter.value = centerName;
}

function closeCenterDetail() {
  selectedCenter.value = '';
}

function selectRegionFromSide(regionName) {
  if (!regionName) return;
  draftFilters.regions = [regionName];
  applyFilters();
}

async function exportCurrentResult() {
  if (!props.canExportExcel) {
    emit('feature-blocked', 'Excel导出');
    return;
  }
  if (!dashboard.value.filteredRecords.length || activeExportKey.value) return;
  await runExportFeedback('current', '系统正在生成培训中心建设筛选结果 Excel，请不要重复点击导出按钮。', () => {
    exportTrainingConstructionRecords(dashboard.value.filteredRecords);
    emit('log', `已导出当前培训中心建设结果，共 ${dashboard.value.filteredRecords.length} 条`);
  });
}

async function exportCenterDetail() {
  if (!props.canExportExcel) {
    emit('feature-blocked', 'Excel导出');
    return;
  }
  if (!centerDetail.value.centerStat || !centerDetail.value.centerRecords.length || activeExportKey.value) return;
  await runExportFeedback('center', `系统正在生成 ${centerDetail.value.centerStat.centerName} 建设明细 Excel，请不要重复点击导出按钮。`, () => {
    exportTrainingConstructionCenterRecords(centerDetail.value.centerStat.centerName, centerDetail.value.centerRecords);
    emit('log', `已导出 ${centerDetail.value.centerStat.centerName} 建设明细`);
  });
}

async function exportDirtyData() {
  if (!props.canExportExcel) {
    emit('feature-blocked', 'Excel导出');
    return;
  }
  if (!dirtyRows.value.length || activeExportKey.value) return;
  await runExportFeedback('dirty', '系统正在生成培训中心建设脏数据 Excel，请不要重复点击导出按钮。', () => {
    exportTrainingConstructionDirtyRecords(dirtyRows.value);
    emit('log', `已导出培训中心建设脏数据，共 ${dirtyRows.value.length} 条`);
  });
}

async function runExportFeedback(key, message, action) {
  if (activeExportKey.value) return;
  activeExportKey.value = key;
  exportFeedback.visible = true;
  exportFeedback.message = message;
  try {
    await runWithMinimumVisibleTime(action);
  } finally {
    exportFeedback.visible = false;
    activeExportKey.value = '';
  }
}

async function loadLastDataset() {
  try {
    const record = await loadToolDataset(LOCAL_DATASET_KEYS.TRAINING_CONSTRUCTION_MAP);
    if (!record?.payload?.records?.length) return;
    importedRecords.value = record.payload.records;
    dirtyRows.value = record.payload.dirtyRows || [];
    importWarnings.value = record.payload.warnings || [];
    validationSummary.value = normalizeValidationSummary(record.payload.validation);
    resetFiltersToAll();
    emit('log', `已加载上次培训中心建设地图数据，共 ${importedRecords.value.length} 条`);
  } catch (error) {
    console.warn('加载培训中心建设地图缓存失败', error);
  }
}

function createDefaultFilters() {
  return {
    regions: [...DEFAULT_TRAINING_CONSTRUCTION_FILTERS.regions],
    productLines: [...DEFAULT_TRAINING_CONSTRUCTION_FILTERS.productLines],
    courses: [...DEFAULT_TRAINING_CONSTRUCTION_FILTERS.courses]
  };
}

function createEmptyValidationSummary() {
  return {
    baseCenterCount: 0,
    courseCatalogCount: 0,
    internalCourseCount: 0,
    rawCourseNameCount: 0,
    standardMatchedCourseCount: 0,
    missingBaseCenters: [],
    unmatchedAddressCenters: [],
    unmatchedLineCourses: [],
    localLineMappedCourses: [],
    missingTeacherRows: 0,
    duplicateStandardCourses: [],
    standardCoursesMissingProductLine: [],
    duplicateBaseCenters: [],
    baseCentersMissingAddress: [],
    baseCentersUnmatchedLocation: [],
    internalNonStandardCourses: [],
    channelNonStandardCourses: [],
    nonStandardCourses: [],
    teacherColumnMissing: false,
    channelRowsMissingRequiredFields: 0,
    channelRowsMissingRequiredExamples: [],
    duplicateCenterCourseRows: 0,
    duplicateCenterCourseExamples: [],
    dirtyRowCount: 0
  };
}

function normalizeValidationSummary(summary = {}) {
  return {
    ...createEmptyValidationSummary(),
    ...(summary || {})
  };
}

function createImportOverlayState() {
  return {
    visible: false,
    mode: 'progress',
    progress: 0,
    title: '正在导入培训中心建设数据',
    subtitle: '系统正在解析 Excel 并生成地图数据。',
    message: '',
    errorTitle: '',
    errorMessage: '',
    steps: createImportSteps()
  };
}

function resetImportSteps() {
  importOverlay.steps = createImportSteps();
}

function createImportSteps() {
  return [
    { key: 'read', label: '读取 Excel 文件', status: 'pending' },
    { key: 'structure', label: '识别 Sheet 与字段', status: 'pending' },
    { key: 'clean', label: '清洗中心与课程', status: 'pending' },
    { key: 'result', label: '生成地图统计', status: 'pending' }
  ];
}

function buildBarOption(seriesData, seriesName) {
  if (!seriesData?.length) return null;
  const displayRows = [...seriesData].slice(0, 10).reverse();
  return {
    backgroundColor: 'transparent',
    grid: { left: 76, right: 42, top: 10, bottom: 10, containLabel: true },
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
        width: 76,
        overflow: 'truncate',
        formatter: (value) => truncateLabel(value, 7)
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
        data: displayRows.map((item) => item.value),
        barWidth: 10,
        itemStyle: {
          borderRadius: 8,
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
          color: '#e5f6ff',
          fontWeight: 700,
          formatter: ({ value }) => Number(value || 0).toLocaleString('zh-CN')
        }
      }
    ]
  };
}

function truncateLabel(value, maxLength) {
  const text = String(value || '');
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}
</script>
