<template>
  <div class="tool-page qualification-page">
    <section class="tool-header qualification-tool-header">
      <div class="qualification-tool-heading">
        <div class="tool-icon">
          <Map :size="24" />
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
        <button class="ghost-button" type="button" :disabled="interactionDisabled || !dashboard.filteredRecords.length" @click="exportCurrentResult">
          <Download :size="18" />
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

      <div class="qualification-filter-grid">
        <QualificationFilterSelect
          v-model="draftFilters.regions"
          label="大区"
          :options="filterOptions.regions"
          searchable
          search-placeholder="搜索大区"
        />
        <QualificationFilterSelect
          v-model="draftFilters.branches"
          label="分公司"
          :options="branchFilterOptions"
          searchable
          search-placeholder="搜索分公司"
        />
        <QualificationFilterSelect
          v-model="draftFilters.productLines"
          label="产品线"
          :options="filterOptions.productLines"
          searchable
          search-placeholder="搜索产品线"
        />
        <QualificationFilterSelect
          v-model="draftFilters.machineModels"
          label="机器型号"
          :options="filterOptions.machineModels"
          searchable
          search-placeholder="输入型号关键字"
        />
        <QualificationFilterSelect
          v-model="draftFilters.qualificationTypes"
          label="服务资质类型"
          :options="filterOptions.qualificationTypes"
          searchable
          search-placeholder="搜索资质类型"
        />

        <label class="qualification-status-select">
          <span class="qualification-filter-label">资质状态</span>
          <select v-model="draftFilters.status">
            <option v-for="status in filterOptions.statusOptions" :key="status" :value="status">{{ status }}</option>
          </select>
        </label>

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
      <QualificationAmap
        :points="dashboard.mapPoints"
        :loading="loading"
        :selected-branch="selectedBranch"
        :selected-regions="appliedFilters.regions"
        :empty-text="emptyStateText"
        @select-branch="openBranchDetail"
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
                <span>分公司有效资质 TOP10</span>
                <strong>{{ dashboard.topValidBranches.length }}</strong>
              </div>
              <div v-if="dashboard.topValidBranches.length" class="qualification-rank-list scrollable">
                <button
                  v-for="(item, index) in dashboard.topValidBranches"
                  :key="item.branch"
                  class="qualification-rank-row"
                  type="button"
                  @click="openBranchDetail(item.branch)"
                >
                  <span class="rank-index">{{ index + 1 }}</span>
                  <span class="rank-branch">{{ item.branch }}</span>
                  <strong>{{ item.validQualifications }}</strong>
                </button>
              </div>
              <div v-else class="chart-empty-state compact in-tab">
                <ListOrdered :size="20" />
                <span>{{ emptyStateText }}</span>
              </div>
            </div>

            <div v-else-if="activeSideTab === 'risk'" class="qualification-tab-panel">
              <div class="qualification-tab-caption">
                <span>资质风险 TOP10</span>
                <strong>{{ dashboard.topRiskBranches.length }}</strong>
              </div>
              <div v-if="dashboard.topRiskBranches.length" class="qualification-rank-list scrollable">
                <button
                  v-for="(item, index) in dashboard.topRiskBranches"
                  :key="`${item.branch}-risk`"
                  class="qualification-risk-row"
                  type="button"
                  @click="openBranchDetail(item.branch)"
                >
                  <span class="rank-index">{{ index + 1 }}</span>
                  <div class="rank-branch-copy">
                    <strong>{{ item.branch }}</strong>
                    <span>30天内到期 {{ item.expiring30 }} / 已过期 {{ item.expiredQualifications }}</span>
                  </div>
                </button>
              </div>
              <div v-else class="chart-empty-state compact in-tab">
                <ShieldAlert :size="20" />
                <span>{{ emptyStateText }}</span>
              </div>
            </div>

            <div v-else class="qualification-tab-panel analysis">
              <EChartPanel
                title="产品线资质分布"
                kicker="Product Line"
                :option="productLineBarOption"
                :loading="loading"
                height="248px"
                :empty-text="emptyStateText"
                panelless
              />
              <div class="qualification-tab-analysis-grid">
                <EChartPanel
                  title="资质类型分布"
                  kicker="Qualification Type"
                  :option="qualificationTypeBarOption"
                  :loading="loading"
                  height="212px"
                  :empty-text="'暂无资质类型分布数据'"
                  panelless
                />
                <EChartPanel
                  title="到期趋势分析"
                  kicker="Expiry Analysis"
                  :option="expiryTrendOption"
                  :loading="loading"
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

    <section class="glass-panel qualification-table-panel" :class="{ collapsed: !detailTableExpanded }">
      <div class="panel-title-row">
        <div>
          <p class="section-kicker">Filtered Detail</p>
          <h2>资质明细表</h2>
        </div>
        <div class="qualification-table-actions">
          <span class="preview-count">共 {{ dashboard.filteredRecords.length }} 条</span>
          <button class="ghost-button compact" type="button" @click="detailTableExpanded = !detailTableExpanded">
            <span>{{ detailTableExpanded ? '收起明细表' : '展开明细表' }}</span>
          </button>
        </div>
      </div>

      <div v-if="!detailTableExpanded" class="qualification-collapsed-summary">
        <span>资质明细表默认折叠，避免占用首屏空间。</span>
        <strong>{{ dashboard.filteredRecords.length }} 条记录</strong>
      </div>
      <div v-else-if="dashboard.filteredRecords.length" class="table-shell qualification-table-shell">
        <table>
          <thead>
            <tr>
              <th>姓名</th>
              <th>分公司</th>
              <th>产品线</th>
              <th>机器型号</th>
              <th>服务资质类型</th>
              <th>资质有效期</th>
              <th>资质状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in dashboard.previewRows" :key="row.id">
              <td>{{ row.personName }}</td>
              <td>{{ row.branch }}</td>
              <td>{{ row.productLine }}</td>
              <td>{{ row.machineModel }}</td>
              <td>{{ row.qualificationType }}</td>
              <td>{{ row.expiryDate }}</td>
              <td>
                <span class="qualification-status-badge" :class="statusClass(row.qualificationStatus)">
                  {{ row.qualificationStatus }}
                </span>
              </td>
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
              <p class="section-kicker">Branch Detail</p>
              <h2>{{ branchDetail.branchStat.branch }}资质详情</h2>
            </div>
            <button class="icon-button" type="button" @click="closeBranchDetail">
              <X :size="18" />
            </button>
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
              height="220px"
              :empty-text="'暂无产品线分布数据'"
            />
            <EChartPanel
              title="资质类型分布"
              kicker="Branch Type Mix"
              :option="branchTypeOption"
              height="220px"
              :empty-text="'暂无资质类型分布数据'"
            />
            <EChartPanel
              title="到期风险分布"
              kicker="Branch Risk"
              :option="branchRiskOption"
              height="220px"
              :empty-text="'暂无风险分布数据'"
            />
          </div>

          <section class="glass-panel qualification-drawer-filter">
            <div class="panel-title-row">
              <div>
                <p class="section-kicker">Detail Filter</p>
                <h2>人员资质明细</h2>
              </div>
              <button class="ghost-button" type="button" @click="exportBranchDetail">
                <Download :size="17" />
                <span>导出当前分公司明细</span>
              </button>
            </div>

            <div class="qualification-drawer-filter-row">
              <input v-model.trim="detailKeyword" class="qualification-filter-search" type="text" placeholder="搜索姓名" />
              <select v-model="detailStatus">
                <option v-for="status in filterOptions.statusOptions" :key="`detail-${status}`" :value="status">{{ status }}</option>
              </select>
            </div>

            <div v-if="filteredBranchRows.length" class="table-shell qualification-table-shell">
              <table>
                <thead>
                  <tr>
                    <th>姓名</th>
                    <th>分公司</th>
                    <th>产品线</th>
                    <th>机器型号</th>
                    <th>服务资质类型</th>
                    <th>资质有效期</th>
                    <th>资质状态</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in filteredBranchRows" :key="row.id">
                    <td>{{ row.personName }}</td>
                    <td>{{ row.branch }}</td>
                    <td>{{ row.productLine }}</td>
                    <td>{{ row.machineModel }}</td>
                    <td>{{ row.qualificationType }}</td>
                    <td>{{ row.expiryDate }}</td>
                    <td>
                      <span class="qualification-status-badge" :class="statusClass(row.qualificationStatus)">
                        {{ row.qualificationStatus }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="empty-preview">
              <TableProperties :size="24" />
              <span>暂无符合条件的分公司资质明细</span>
            </div>
          </section>
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
  </div>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watchEffect } from 'vue';
import {
  AlertTriangle,
  CalendarClock,
  CircleX,
  Download,
  Eraser,
  ListOrdered,
  Map,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  TableProperties,
  Upload,
  Users,
  WalletCards,
  X
} from 'lucide-vue-next';
import EChartPanel from '../components/EChartPanel.vue';
import QualificationAmap from '../components/QualificationAmap.vue';
import QualificationFilterSelect from '../components/QualificationFilterSelect.vue';
import QualificationImportOverlay from '../components/QualificationImportOverlay.vue';
import {
  buildBranchDetail,
  buildQualificationDashboard,
  collectQualificationOptions,
  DEFAULT_QUALIFICATION_FILTERS
} from '../utils/qualificationAggregator';
import { exportBranchQualificationRecords, exportQualificationRecords } from '../utils/qualificationExport';
import { parseQualificationFiles } from '../utils/qualificationParser';

const emit = defineEmits(['status-change', 'log']);

const fileInputRef = ref(null);
const loading = ref(false);
const importedRecords = ref([]);
const importWarnings = ref([]);
const selectedBranch = ref('');
const detailKeyword = ref('');
const detailStatus = ref('全部');
const activeSideTab = ref('branch');
const detailTableExpanded = ref(false);
const importOverlay = reactive(createImportOverlayState());

const draftFilters = reactive(createDefaultFilters());
const appliedFilters = ref(createDefaultFilters());

const filterOptions = computed(() => {
  const options = collectQualificationOptions(importedRecords.value);
  return {
    ...options,
    statusOptions: options.statusOptions || ['全部', '有效', '30天内到期', '60天内到期', '90天内到期', '已过期']
  };
});
const branchFilterOptions = computed(() => {
  if (!draftFilters.regions.length) return filterOptions.value.branches;
  const selectedRegionSet = new Set(draftFilters.regions);
  return filterOptions.value.branches.filter((branch) => {
    const matchedRecord = importedRecords.value.find((record) => record.branch === branch);
    return selectedRegionSet.has(matchedRecord?.mappedRegion || '');
  });
});

const dashboard = computed(() => buildQualificationDashboard(importedRecords.value, appliedFilters.value));
const hasData = computed(() => Boolean(importedRecords.value.length));
const emptyStateText = computed(() => (hasData.value ? '暂无符合条件的资质数据，请调整筛选条件。' : '请导入资质表'));
const interactionDisabled = computed(() => loading.value || importOverlay.visible);
const dataStatusText = computed(() => {
  if (!hasData.value) return '待导入资质数据';
  return `已导入 ${importedRecords.value.length.toLocaleString()} 条资质记录`;
});
const sideTabs = [
  { key: 'branch', label: '分公司TOP10' },
  { key: 'risk', label: '风险TOP10' },
  { key: 'analysis', label: '产品线分布' }
];

const metricCards = computed(() => [
  { key: 'totalPeople', label: '总持证人数', value: dashboard.value.summary.totalPeople, icon: Users, tone: 'blue' },
  { key: 'validQualifications', label: '有效资质总数', value: dashboard.value.summary.validQualifications, icon: ShieldCheck, tone: 'cyan' },
  { key: 'expiringSoon', label: '即将到期资质', value: dashboard.value.summary.expiringSoon, icon: CalendarClock, tone: 'orange' },
  { key: 'expiredQualifications', label: '已过期资质', value: dashboard.value.summary.expiredQualifications, icon: CircleX, tone: 'red' },
  { key: 'coveredBranches', label: '覆盖分公司数', value: dashboard.value.summary.coveredBranches, icon: WalletCards, tone: 'green' }
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

const productLineBarOption = computed(() => buildBarOption(dashboard.value.productLineDistribution, '有效资质数量'));
const qualificationTypeBarOption = computed(() => buildTopTypeBarOption(dashboard.value.qualificationTypeDistribution));
const expiryTrendOption = computed(() => buildTrendOption(dashboard.value.expiryTrend));
const branchProductLineOption = computed(() => buildBarOption(branchDetail.value.productLineDistribution || [], '有效资质'));
const branchTypeOption = computed(() => buildDonutOption(branchDetail.value.qualificationTypeDistribution || []));
const branchRiskOption = computed(() => buildTrendOption(branchDetail.value.expiryDistribution || []));

watchEffect(() => {
  if (loading.value) {
    emit('status-change', '资质地图数据处理中');
    return;
  }
  emit('status-change', hasData.value ? `资质地图就绪，当前 ${dashboard.value.filteredRecords.length} 条` : '中国区人员服务资质地图待导入数据');
});

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
  prepareImportOverlay();

  try {
    emit('log', `开始导入资质表，共 ${files.length} 个文件`);
    const payload = await parseQualificationFiles(files, {
      onProgress: handleImportProgress
    });
    updateImportOverlayStep('generate', 'processing', 90, '正在生成分公司地图点位...');
    importedRecords.value = payload.records;
    importWarnings.value = payload.warnings || [];
    Object.assign(draftFilters, createDefaultFilters());
    appliedFilters.value = createDefaultFilters();
    await nextTick();
    updateImportOverlayStep('generate', 'completed', 100, '导入完成');
    importOverlay.mode = 'success';
    emit('log', `资质数据导入完成，共识别 ${payload.records.length} 条记录`);
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
  appliedFilters.value = {
    regions: [...draftFilters.regions],
    branches: [...draftFilters.branches],
    productLines: [...draftFilters.productLines],
    machineModels: [...draftFilters.machineModels],
    qualificationTypes: [...draftFilters.qualificationTypes],
    status: draftFilters.status
  };
  selectedBranch.value = '';
  detailKeyword.value = '';
  detailStatus.value = '全部';
  emit('log', `刷新资质地图，当前结果 ${dashboard.value.filteredRecords.length} 条`);
}

function resetFilters() {
  Object.assign(draftFilters, createDefaultFilters());
  appliedFilters.value = createDefaultFilters();
  selectedBranch.value = '';
  detailKeyword.value = '';
  detailStatus.value = '全部';
  emit('log', '已重置资质地图筛选条件');
}

function exportCurrentResult() {
  exportQualificationRecords(dashboard.value.filteredRecords);
  emit('log', `已导出当前资质结果，共 ${dashboard.value.filteredRecords.length} 条`);
}

function openBranchDetail(branch) {
  selectedBranch.value = branch;
  detailKeyword.value = '';
  detailStatus.value = '全部';
}

function closeBranchDetail() {
  selectedBranch.value = '';
}

function exportBranchDetail() {
  if (!branchDetail.value.branchStat) return;
  exportBranchQualificationRecords(branchDetail.value.branchStat.branch, filteredBranchRows.value);
  emit('log', `已导出 ${branchDetail.value.branchStat.branch} 分公司资质明细`);
}

function statusClass(status) {
  if (status === '已过期') return 'critical';
  if (status === '有效') return 'good';
  return 'warning';
}

function createDefaultFilters() {
  return {
    regions: [],
    branches: [],
    productLines: [],
    machineModels: [],
    qualificationTypes: [],
    status: DEFAULT_QUALIFICATION_FILTERS.status
  };
}

function buildBarOption(seriesData, seriesName) {
  if (!seriesData?.length) return null;
  const sorted = [...seriesData].slice(0, 10).reverse();
  return {
    backgroundColor: 'transparent',
    grid: { left: 88, right: 20, top: 16, bottom: 16, containLabel: true },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: 'rgba(150, 190, 220, 0.3)' } },
      splitLine: { lineStyle: { color: 'rgba(120, 170, 210, 0.08)' } },
      axisLabel: { color: '#8fb5d8' }
    },
    yAxis: {
      type: 'category',
      data: sorted.map((item) => item.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#d4e6f8', width: 120, overflow: 'truncate' }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    series: [
      {
        name: seriesName,
        type: 'bar',
        data: sorted.map((item) => item.value),
        barWidth: 14,
        itemStyle: {
          borderRadius: [0, 8, 8, 0],
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
          color: '#e4f4ff'
        }
      }
    ]
  };
}

function buildDonutOption(seriesData) {
  if (!seriesData?.length) return null;
  return {
    backgroundColor: 'transparent',
    color: ['#00d4ff', '#00ff88', '#7dd3fc', '#38bdf8', '#5eead4', '#fbbf24'],
    tooltip: {
      trigger: 'item'
    },
    legend: {
      bottom: 0,
      textStyle: { color: '#9eb9d6' }
    },
    series: [
      {
        type: 'pie',
        radius: ['48%', '72%'],
        center: ['50%', '44%'],
        itemStyle: {
          borderColor: '#091427',
          borderWidth: 2
        },
        label: {
          color: '#dcecff',
          formatter: '{b}'
        },
        data: seriesData.map((item) => ({
          name: item.name,
          value: item.value
        }))
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

function buildTopTypeBarOption(seriesData) {
  if (!seriesData?.length) return null;

  const sorted = [...seriesData].sort((left, right) => right.value - left.value || left.name.localeCompare(right.name, 'zh-CN'));
  const topItems = sorted.slice(0, 8);
  const otherValue = sorted.slice(8).reduce((total, item) => total + Number(item.value || 0), 0);
  const rows = otherValue > 0 ? [...topItems, { name: '其他', value: otherValue }] : topItems;
  const displayRows = [...rows].reverse();

  return {
    backgroundColor: 'transparent',
    grid: { left: 10, right: 14, top: 8, bottom: 8, containLabel: true },
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
      axisLabel: { show: false }
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
          color: '#eef8ff',
          fontWeight: 700,
          formatter: ({ value }) => value
        }
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
  window.setTimeout(() => {
    openImporter();
  }, 60);
}

function closeImportOverlay() {
  resetImportOverlay();
}
</script>
