<template>
  <div class="tool-page qualification-page training-page">
    <section class="tool-header qualification-tool-header">
      <div class="qualification-tool-heading">
        <div class="tool-icon">
          <Presentation :size="24" />
        </div>
        <div>
          <p class="section-kicker">TRAINING COVERAGE MAP</p>
          <h1>中国区培训覆盖地图</h1>
          <p>基于面授课程培训数据，按分公司、大区、产线、培训周期和培训结果展示全国培训覆盖与效果</p>
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
        <button class="ghost-button" type="button" :disabled="interactionDisabled" @click="resetFilters">
          <RotateCcw :size="18" />
          <span>重置筛选</span>
        </button>
      </div>
    </section>

    <section class="glass-panel qualification-filter-panel">
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
        <QualificationFilterSelect v-model="draftFilters.branches" label="分公司" :options="branchOptions" searchable search-placeholder="搜索分公司" />
        <QualificationFilterSelect v-model="draftFilters.regions" label="大区" :options="filterOptions.regions" searchable search-placeholder="搜索大区" />
        <QualificationFilterSelect v-model="draftFilters.productLines" label="产线" :options="filterOptions.productLines" searchable search-placeholder="搜索产线" />
        <QualificationFilterSelect v-model="draftFilters.cycles" label="培训周期" :options="filterOptions.cycles" searchable search-placeholder="搜索 YYYY-MM" />

        <label class="qualification-status-select">
          <span class="qualification-filter-label">培训结果</span>
          <select v-model="draftFilters.result">
            <option v-for="status in filterOptions.results" :key="status" :value="status">{{ status }}</option>
          </select>
        </label>

        <QualificationFilterSelect v-model="draftFilters.trainingCenters" label="培训中心" :options="filterOptions.trainingCenters" searchable search-placeholder="搜索培训中心" />
        <QualificationFilterSelect v-model="draftFilters.trainingTypes" label="培训类型" :options="filterOptions.trainingTypes" searchable search-placeholder="搜索培训类型" />

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

    <section class="qualification-metric-grid">
      <article v-for="metric in metricCards" :key="metric.key" class="metric-card" :class="metric.tone">
        <component :is="metric.icon" :size="20" />
        <span class="qualification-metric-label">{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
      </article>
    </section>

    <section class="qualification-main-grid">
      <TrainingCoverageAmap
        v-model:displayMode="displayMode"
        :points="dashboard.mapPoints"
        :loading="loading"
        :selected-branch="selectedBranch"
        :selected-regions="appliedFilters.regions"
        :empty-text="emptyStateText"
        @select-center="openTrainingCenterDetail"
      />

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
            <div v-if="activeSideTab === 'branch'" class="qualification-tab-panel">
              <div class="qualification-tab-caption">
                <span>分公司TOP10</span>
                <strong>{{ dashboard.topBranches.length }}</strong>
              </div>
              <div v-if="dashboard.topBranches.length" class="qualification-rank-list scrollable">
                <button
                  v-for="(item, index) in dashboard.topBranches"
                  :key="item.branch"
                  class="qualification-rank-row"
                  type="button"
                  @click="openBranchDetail(item.branch)"
                >
                  <span class="rank-index">{{ index + 1 }}</span>
                  <div class="rank-branch-copy">
                    <strong>{{ item.branch }}</strong>
                    <span>培训人次 {{ item.traineeCount }} / 记录数 {{ item.recordCount }}</span>
                  </div>
                </button>
              </div>
              <div v-else class="chart-empty-state compact in-tab">
                <ListOrdered :size="20" />
                <span>{{ emptyStateText }}</span>
              </div>
            </div>

            <div v-else-if="activeSideTab === 'risk'" class="qualification-tab-panel">
              <div class="qualification-tab-caption">
                <span>风险TOP10</span>
                <strong>{{ dashboard.riskBranches.length }}</strong>
              </div>
              <div v-if="dashboard.riskBranches.length" class="qualification-rank-list scrollable">
                <button
                  v-for="(item, index) in dashboard.riskBranches"
                  :key="`${item.branch}-risk`"
                  class="qualification-risk-row"
                  type="button"
                  @click="openBranchDetail(item.branch)"
                >
                  <span class="rank-index">{{ index + 1 }}</span>
                  <div class="rank-branch-copy">
                    <strong>{{ item.branch }}</strong>
                    <span>不合格 {{ item.failCount }} / 合格率 {{ item.passRate }}</span>
                  </div>
                </button>
              </div>
              <div v-else class="chart-empty-state compact in-tab">
                <ShieldAlert :size="20" />
                <span>{{ emptyStateText }}</span>
              </div>
            </div>

            <div v-else-if="activeSideTab === 'product'" class="qualification-tab-panel">
              <EChartPanel
                title="产线分布"
                kicker="Product Line"
                :option="productLineBarOption"
                :loading="loading"
                height="540px"
                :empty-text="'暂无产线分布数据'"
                panelless
              />
            </div>

            <div v-else class="qualification-tab-panel">
              <EChartPanel
                title="培训类型"
                kicker="Training Type"
                :option="trainingTypeBarOption"
                :loading="loading"
                height="540px"
                :empty-text="'暂无培训类型分布数据'"
                panelless
              />
            </div>
          </div>
        </section>
      </aside>
    </section>

    <section class="glass-panel qualification-table-panel" :class="{ collapsed: !trendExpanded }">
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

    <section class="glass-panel qualification-table-panel" :class="{ collapsed: !detailTableExpanded }">
      <div class="panel-title-row">
        <div>
          <p class="section-kicker">Training Detail</p>
          <h2>培训明细表</h2>
        </div>
        <div class="qualification-table-actions">
          <span class="preview-count">共 {{ dashboard.filteredRecords.length }} 条</span>
          <button class="ghost-button compact" type="button" @click="detailTableExpanded = !detailTableExpanded">
            <span>{{ detailTableExpanded ? '收起明细表' : '展开明细表' }}</span>
          </button>
        </div>
      </div>

      <div v-if="!detailTableExpanded" class="qualification-collapsed-summary">
        <span>培训明细表默认折叠，避免占用首屏空间。</span>
        <strong>{{ dashboard.filteredRecords.length }} 条记录</strong>
      </div>
      <div v-else-if="dashboard.filteredRecords.length" class="table-shell qualification-table-shell">
        <table>
          <thead>
            <tr>
              <th>学员姓名</th>
              <th>分公司</th>
              <th>大区</th>
              <th>产线</th>
              <th>培训周期</th>
              <th>培训组织方</th>
              <th>培训中心</th>
              <th>培训地点</th>
              <th>培训类型</th>
              <th>培训名称</th>
              <th>完成情况</th>
              <th>成绩</th>
              <th>讲师</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in dashboard.previewRows" :key="row.id">
              <td>{{ row.studentName || '--' }}</td>
              <td>{{ row.branch }}</td>
              <td>{{ row.mappedRegion }}</td>
              <td>{{ row.productLine }}</td>
              <td>{{ row.trainingCycle }}</td>
              <td>{{ row.organizer }}</td>
              <td>{{ row.trainingCenter }}</td>
              <td>{{ row.trainingLocation }}</td>
              <td>{{ row.trainingType }}</td>
              <td>{{ row.courseName }}</td>
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
        <TableProperties :size="26" />
        <span>{{ emptyStateText }}</span>
      </div>
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

          <div class="qualification-drawer-chart-grid">
            <EChartPanel title="产线培训分布" kicker="Product Line" :option="branchProductLineOption" height="220px" :empty-text="'暂无产线分布数据'" />
            <EChartPanel title="培训类型分布" kicker="Training Type" :option="branchTypeOption" height="220px" :empty-text="'暂无培训类型数据'" />
            <EChartPanel title="培训周期趋势" kicker="Training Trend" :option="branchTrendOption" height="220px" :empty-text="'暂无趋势数据'" />
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
import { computed, nextTick, onMounted, reactive, ref, watchEffect } from 'vue';
import {
  AlertTriangle,
  Award,
  BookOpenCheck,
  CircleX,
  Download,
  Eraser,
  ListOrdered,
  LoaderCircle,
  MapPinned,
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
import { buildTrainingBranchDetail, buildTrainingDashboard, collectTrainingOptions, DEFAULT_TRAINING_FILTERS } from '../utils/trainingAggregator';
import { exportBranchTrainingRecords, exportTrainingRecords } from '../utils/exportTrainingExcel';
import { parseTrainingFiles } from '../utils/trainingParser';
import { runWithMinimumVisibleTime } from '../utils/blockingOperation';

const props = defineProps({
  canExportExcel: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['status-change', 'log', 'feature-blocked']);

const fileInputRef = ref(null);
const loading = ref(false);
const importedRecords = ref([]);
const importWarnings = ref([]);
const displayMode = ref('training-count');
const selectedBranch = ref('');
const selectedDetailScope = ref('branch');
const activeSideTab = ref('branch');
const detailKeyword = ref('');
const detailStatus = ref('全部');
const detailTableExpanded = ref(false);
const trendExpanded = ref(false);
const importOverlay = reactive(createImportOverlayState());
const activeExportKey = ref('');
const exportFeedback = reactive({
  visible: false,
  title: '',
  message: ''
});

const draftFilters = reactive(createDefaultFilters());
const appliedFilters = ref(createDefaultFilters());

const filterOptions = computed(() => collectTrainingOptions(importedRecords.value));
const branchOptions = computed(() => {
  if (!draftFilters.regions.length) return filterOptions.value.branches;
  const selectedRegions = new Set(draftFilters.regions);
  return filterOptions.value.branches.filter((branch) => {
    const record = importedRecords.value.find((item) => item.branch === branch);
    return selectedRegions.has(record?.mappedRegion);
  });
});

const dashboard = computed(() => buildTrainingDashboard(importedRecords.value, appliedFilters.value));
const hasData = computed(() => Boolean(importedRecords.value.length));
const interactionDisabled = computed(() => loading.value || importOverlay.visible);
const emptyStateText = computed(() => (hasData.value ? '暂无符合条件的培训数据，请调整筛选条件。' : '请导入培训表'));
const dataStatusText = computed(() => {
  if (!hasData.value) return '待导入培训数据';
  return `已导入 ${importedRecords.value.length.toLocaleString()} 条培训记录`;
});

const sideTabs = [
  { key: 'branch', label: '分公司TOP10' },
  { key: 'risk', label: '风险TOP10' },
  { key: 'product', label: '产线分布' },
  { key: 'type', label: '培训类型' }
];

const metricCards = computed(() => [
  { key: 'traineeCount', label: '培训人次', value: dashboard.value.summary.traineeCount, icon: Users, tone: 'blue' },
  { key: 'recordCount', label: '培训记录数', value: dashboard.value.summary.recordCount, icon: BookOpenCheck, tone: 'cyan' },
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
    { label: '培训人次', value: stat.traineeCount, icon: Users, tone: 'blue' },
    { label: '培训记录数', value: stat.recordCount, icon: BookOpenCheck, tone: 'cyan' },
    { label: '培训场次', value: stat.sessionCount, icon: Presentation, tone: 'green' },
    { label: '合格率', value: stat.passRate, icon: UserRoundCheck, tone: 'green' },
    { label: '不合格人次', value: stat.failCount, icon: CircleX, tone: 'red' }
  ];
});

const productLineBarOption = computed(() => buildTopBarOption(dashboard.value.productLineDistribution, '培训记录数'));
const trainingTypeBarOption = computed(() => buildTopBarOption(dashboard.value.trainingTypeDistribution, '培训记录数'));
const trendOption = computed(() => buildTrainingTrendOption(dashboard.value.trendSeries));
const branchProductLineOption = computed(() => buildTopBarOption(branchDetail.value.productLineDistribution || [], '培训记录数'));
const branchTypeOption = computed(() => buildTopBarOption(branchDetail.value.trainingTypeDistribution || [], '培训记录数'));
const branchTrendOption = computed(() => buildTrainingTrendOption(branchDetail.value.trendSeries || []));

watchEffect(() => {
  if (loading.value) {
    emit('status-change', '培训覆盖地图数据处理中');
    return;
  }
  emit('status-change', hasData.value ? `培训覆盖地图就绪，当前 ${dashboard.value.filteredRecords.length} 条` : '中国区培训覆盖地图待导入数据');
});

onMounted(loadLastDataset);

function openImporter() {
  if (interactionDisabled.value) return;
  fileInputRef.value?.click();
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
    emit('log', `开始导入培训表，共 ${files.length} 个文件`);
    const payload = await parseTrainingFiles(files, { onProgress: handleImportProgress });
    updateImportOverlayStep('generate', 'processing', 90, '正在生成地图与分析数据...');
    importedRecords.value = payload.records;
    importWarnings.value = payload.warnings || [];
    Object.assign(draftFilters, createDefaultFilters());
    appliedFilters.value = createDefaultFilters();
    await saveToolDataset(LOCAL_DATASET_KEYS.TRAINING_COVERAGE_MAP, {
      records: importedRecords.value,
      warnings: importWarnings.value
    });
    await nextTick();
    updateImportOverlayStep('generate', 'completed', 100, '导入完成');
    importOverlay.mode = 'success';
    emit('log', `培训数据导入完成，共识别 ${payload.records.length} 条记录`);
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
  appliedFilters.value = {
    branches: [...draftFilters.branches],
    regions: [...draftFilters.regions],
    productLines: [...draftFilters.productLines],
    cycles: [...draftFilters.cycles],
    result: draftFilters.result,
    trainingCenters: [...draftFilters.trainingCenters],
    trainingTypes: [...draftFilters.trainingTypes]
  };
  selectedBranch.value = '';
  selectedDetailScope.value = 'branch';
  detailKeyword.value = '';
  detailStatus.value = '全部';
  emit('log', `刷新培训覆盖地图，当前结果 ${dashboard.value.filteredRecords.length} 条`);
}

function resetFilters() {
  Object.assign(draftFilters, createDefaultFilters());
  appliedFilters.value = createDefaultFilters();
  selectedBranch.value = '';
  selectedDetailScope.value = 'branch';
  detailKeyword.value = '';
  detailStatus.value = '全部';
  emit('log', '已重置培训覆盖地图筛选条件');
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
    '系统正在生成培训覆盖筛选结果 Excel，请不要重复点击导出按钮。',
    () => {
      exportTrainingRecords(dashboard.value.filteredRecords);
      emit('log', `已导出当前培训结果，共 ${dashboard.value.filteredRecords.length} 条`);
    }
  );
}

function openBranchDetail(branch) {
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

function createDefaultFilters() {
  return {
    branches: [],
    regions: [],
    productLines: [],
    cycles: [],
    result: DEFAULT_TRAINING_FILTERS.result,
    trainingCenters: [],
    trainingTypes: []
  };
}

function buildTopBarOption(seriesData, seriesName) {
  if (!seriesData?.length) return null;
  const sorted = [...seriesData];
  const otherValue = sorted.slice(8).reduce((total, item) => total + Number(item.value || 0), 0);
  const topRows = sorted.slice(0, 8);
  const rows = otherValue > 0 ? [...topRows, { name: '其他', value: otherValue }] : topRows;
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
        return `${current.name}<br/>${seriesName}：${current.value}`;
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
          formatter: ({ value }) => value
        }
      }
    ]
  };
}

function buildTrainingTrendOption(seriesData) {
  if (!seriesData?.length) return null;
  return {
    backgroundColor: 'transparent',
    grid: { left: 42, right: 42, top: 20, bottom: 34, containLabel: true },
    tooltip: { trigger: 'axis' },
    legend: {
      top: 0,
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
        name: '培训记录数',
        type: 'bar',
        data: seriesData.map((item) => item.recordCount),
        barWidth: 18,
        itemStyle: { color: '#00d4ff', borderRadius: [6, 6, 0, 0] }
      },
      {
        name: '培训人次',
        type: 'bar',
        data: seriesData.map((item) => item.traineeCount),
        barWidth: 18,
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
  const record = await loadToolDataset(LOCAL_DATASET_KEYS.TRAINING_COVERAGE_MAP);
  const payload = record?.payload;
  if (!payload?.records?.length) return;
  importedRecords.value = payload.records;
  importWarnings.value = payload.warnings || [];
  Object.assign(draftFilters, createDefaultFilters());
  appliedFilters.value = createDefaultFilters();
  selectedBranch.value = '';
  selectedDetailScope.value = 'branch';
  detailKeyword.value = '';
  detailStatus.value = '全部';
  emit('log', `已加载上次培训覆盖地图数据，共 ${importedRecords.value.length} 条`);
}
</script>
