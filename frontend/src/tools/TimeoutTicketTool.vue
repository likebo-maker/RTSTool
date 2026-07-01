<template>
  <div class="tool-page">
    <ToolHeader
      :icon="TimerReset"
      kicker="Work Order Filter"
      title="超时工单筛选工具"
      description="导入工单报表与质量上升报表，自动筛选未录入质量上升单的超时工单"
    />

    <section class="glass-panel upload-section">
      <div class="panel-title-row">
        <div>
          <p class="section-kicker">File Intake</p>
          <h2>文件上传</h2>
        </div>
        <span class="format-chip">.xlsx / .xls / .csv</span>
      </div>
      <div class="upload-grid">
        <FileUploadCard
          :file="workOrderFile"
          :icon="FileSpreadsheet"
          title="导入工单报表"
          description="包含大产线、工单状态、工单号等字段"
          :disabled="isProcessing"
          @change="setWorkOrderFile"
        />
        <FileUploadCard
          :file="qualityFile"
          :icon="FileCheck2"
          title="导入质量上升报表"
          description="用于对比前续工单字段"
          :disabled="isProcessing"
          @change="setQualityFile"
        />
      </div>
    </section>

    <ActionPanel
      :can-process="canProcess"
      :can-download="Boolean(downloadUrl)"
      :is-processing="isProcessing"
      :is-download-busy="isDownloadBusy"
      :progress="progress"
      :result-state="resultState"
      :message="resultMessage"
      :status-text="statusText"
      :download-locked="!canExportExcel"
      @process="processFiles"
      @download="download"
      @locked-download="emit('feature-blocked', 'Excel导出')"
    />

    <StatsGrid :stats="stats" />
    <PreviewTable :preview="preview" />
    <BlockingOperationModal
      :visible="downloadFeedback.visible"
      :title="downloadFeedback.title"
      :message="downloadFeedback.message"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watchEffect } from 'vue';
import { FileCheck2, FileSpreadsheet, TimerReset } from 'lucide-vue-next';
import ActionPanel from '../components/ActionPanel.vue';
import BlockingOperationModal from '../components/BlockingOperationModal.vue';
import FileUploadCard from '../components/FileUploadCard.vue';
import PreviewTable from '../components/PreviewTable.vue';
import StatsGrid from '../components/StatsGrid.vue';
import ToolHeader from '../components/ToolHeader.vue';
import { LOCAL_DATASET_KEYS, loadToolDataset, saveToolDataset } from '../services/localDataStore';
import {
  completeProcessTask,
  failProcessTask,
  getProcessTask,
  PROCESS_TASK_KEYS,
  resetProcessTask,
  startProcessTask,
  updateProcessTask
} from '../services/processTaskStore';
import { downloadResult, processTimeoutTickets } from '../services/ticketToolService';
import { runWithMinimumVisibleTime } from '../utils/blockingOperation';

defineProps({
  canExportExcel: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['status-change', 'log', 'feature-blocked']);
const taskKey = PROCESS_TASK_KEYS.TIMEOUT_TICKETS;
const processTask = getProcessTask(taskKey);

const workOrderFile = ref(null);
const qualityFile = ref(null);
const isDownloadBusy = ref(false);
const downloadFeedback = reactive({
  visible: false,
  title: '',
  message: ''
});

const isProcessing = computed(() => processTask.status === 'processing');
const progress = computed(() => processTask.progress || 0);
const resultState = computed(() => processTask.resultState || 'idle');
const resultMessage = computed(() => processTask.message || '等待上传两个文件');
const downloadUrl = computed(() => processTask.downloadUrl || '');
const stats = computed(() => processTask.stats || null);
const preview = computed(() => processTask.preview || null);
const canProcess = computed(() => Boolean(workOrderFile.value && qualityFile.value && !isProcessing.value));

const statusText = computed(() => {
  if (isProcessing.value) return '后端正在清洗、筛选与对比数据';
  if (downloadUrl.value) return '结果已生成，可下载';
  return '待处理';
});

watchEffect(() => {
  emit('status-change', statusText.value);
});

onMounted(loadLastDataset);

function setWorkOrderFile(file) {
  workOrderFile.value = file;
  resetResult();
  if (file) emit('log', `已选择工单报表：${file.name}`);
}

function setQualityFile(file) {
  qualityFile.value = file;
  resetResult();
  if (file) emit('log', `已选择质量上升报表：${file.name}`);
}

function resetResult() {
  resetProcessTask(taskKey, {
    message: '等待执行处理'
  });
}

async function processFiles() {
  if (!canProcess.value) return;

  startProcessTask(taskKey, {
    progress: 8,
    message: '正在上传文件',
    inputs: {
      workOrderFile: workOrderFile.value,
      qualityFile: qualityFile.value
    }
  });
  emit('log', '开始上传并处理工单数据');

  try {
    const payload = await processTimeoutTickets({
      workOrderFile: workOrderFile.value,
      qualityFile: qualityFile.value,
      onUploadProgress: (uploadProgress) => {
        updateProcessTask(taskKey, { progress: Math.max(8, uploadProgress) });
      },
      onHeadersReceived: () => {
        updateProcessTask(taskKey, {
          progress: Math.max(processTask.progress, 64),
          message: '后端正在筛选 IVD 工单并对比质量上升报表'
        });
      }
    });

    completeProcessTask(taskKey, {
      message: '导出成功，最终表格已生成',
      downloadUrl: payload.download_url || '',
      stats: payload.stats || null,
      preview: payload.preview || null
    });
    await saveToolDataset(LOCAL_DATASET_KEYS.TIMEOUT_TICKETS, {
      resultState: processTask.resultState,
      resultMessage: processTask.message,
      downloadUrl: processTask.downloadUrl,
      stats: processTask.stats,
      preview: processTask.preview
    });
    emit('log', `处理完成，最终导出 ${payload.stats?.result_total ?? 0} 条`);
  } catch (error) {
    const message = error.message || '导出失败，请检查 Excel 表头与文件内容';
    failProcessTask(taskKey, message);
    emit('log', message);
  }
}

async function download() {
  if (!downloadUrl.value || isDownloadBusy.value) return;
  isDownloadBusy.value = true;
  downloadFeedback.visible = true;
  downloadFeedback.title = '正在下载最终表格';
  downloadFeedback.message = '系统正在准备筛选结果文件，请不要重复点击下载按钮。';
  try {
    await runWithMinimumVisibleTime(async () => {
      await downloadResult(downloadUrl.value);
      emit('log', '已触发最终表格下载');
    });
  } catch (error) {
    emit('log', error.message || '最终表格下载失败');
  } finally {
    downloadFeedback.visible = false;
    isDownloadBusy.value = false;
  }
}

async function loadLastDataset() {
  if (processTask.inputs?.workOrderFile) {
    workOrderFile.value = processTask.inputs.workOrderFile;
  }
  if (processTask.inputs?.qualityFile) {
    qualityFile.value = processTask.inputs.qualityFile;
  }
  if (processTask.status !== 'idle') {
    emit('log', processTask.status === 'processing' ? '已接续正在处理的超时工单筛选任务' : '已恢复本次超时工单筛选结果');
    return;
  }

  const record = await loadToolDataset(LOCAL_DATASET_KEYS.TIMEOUT_TICKETS);
  const payload = record?.payload;
  if (!payload) return;
  completeProcessTask(taskKey, {
    resultState: payload.resultState || 'success',
    message: payload.resultMessage || '已加载上次处理结果',
    downloadUrl: payload.downloadUrl || '',
    stats: payload.stats || null,
    preview: payload.preview || null
  });
  emit('log', '已加载上次超时工单筛选结果');
}
</script>
