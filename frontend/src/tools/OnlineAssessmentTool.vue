<template>
  <div class="tool-page">
    <ToolHeader
      :icon="ClipboardCheck"
      kicker="ONLINE SERVICE ASSESSMENT"
      title="在线服务考核指标"
      description="上传 MSP工单、MCC通话、视频服务、MCC热线、CRM视频、每日质检 6 个源表，自动生成在线服务考核指标计算表。"
    />

    <section class="glass-panel upload-section">
      <div class="panel-title-row">
        <div>
          <p class="section-kicker">File Intake</p>
          <h2>文件上传</h2>
        </div>
        <span class="format-chip">xlsx / csv</span>
      </div>

      <div class="upload-grid online-upload-grid">
        <FileUploadCard
          :file="mspFile"
          :icon="FileSpreadsheet"
          title="上传 MSP工单总表.xlsx"
          description="用于分公司取消率、预约及时率和线上修复时长"
          accept=".xlsx,.xls,.csv"
          format-text="支持格式：xlsx / csv"
          :disabled="isProcessing"
          @change="setFile('msp', $event)"
        />
        <FileUploadCard
          :file="mccCallFile"
          :icon="Headphones"
          title="上传 MCC通话记录.csv"
          description="用于热线15秒接起率"
          accept=".csv,.xlsx,.xls"
          format-text="支持格式：csv / xlsx"
          :disabled="isProcessing"
          @change="setFile('mccCall', $event)"
        />
        <FileUploadCard
          :file="videoServiceFile"
          :icon="Video"
          title="上传 视频服务记录.xlsx"
          description="用于视频接起率、处理时长、满意度和占线率"
          accept=".xlsx,.xls,.csv"
          format-text="支持格式：xlsx / csv"
          :disabled="isProcessing"
          @change="setFile('videoService', $event)"
        />
        <FileUploadCard
          :file="mccTicketFile"
          :icon="FileText"
          title="上传 MCC热线工单.xlsx"
          description="用于热线处理时长、满意度和解决率"
          accept=".xlsx,.xls,.csv"
          format-text="支持格式：xlsx / csv"
          :disabled="isProcessing"
          @change="setFile('mccTicket', $event)"
        />
        <FileUploadCard
          :file="crmVideoFile"
          :icon="MonitorPlay"
          title="上传 CRM视频工单.csv"
          description="用于视频解决率"
          accept=".csv,.xlsx,.xls"
          format-text="支持格式：csv / xlsx"
          :disabled="isProcessing"
          @change="setFile('crmVideo', $event)"
        />
        <FileUploadCard
          :file="qualityFile"
          :icon="ClipboardCheck"
          title="上传 每日质检记录表.xlsx"
          description="用于质检合格率"
          accept=".xlsx,.xls,.csv"
          format-text="支持格式：xlsx / csv"
          :disabled="isProcessing"
          @change="setFile('quality', $event)"
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
      process-label="开始计算"
      processing-label="计算中"
      download-label="下载计算表"
      :download-locked="!canExportExcel"
      @process="processFiles"
      @download="download"
      @locked-download="emit('feature-blocked', 'Excel导出')"
    >
      <template #header-actions>
        <label class="inline-toggle" title="勾选后会把上传源表也写入结果文件，文件生成会更慢。">
          <input v-model="includeSourceSheets" type="checkbox" :disabled="isProcessing" />
          <span>包含源表</span>
        </label>
        <span class="format-chip">{{ includeSourceSheets ? '完整导出' : '快速导出' }}</span>
      </template>
    </ActionPanel>

    <PreviewTable
      :preview="preview"
      empty-text="处理完成后展示在线服务考核指标预览。"
    />
    <BlockingOperationModal
      :visible="downloadFeedback.visible"
      :title="downloadFeedback.title"
      :message="downloadFeedback.message"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watchEffect } from 'vue';
import { ClipboardCheck, FileSpreadsheet, FileText, Headphones, MonitorPlay, Video } from 'lucide-vue-next';
import ActionPanel from '../components/ActionPanel.vue';
import BlockingOperationModal from '../components/BlockingOperationModal.vue';
import FileUploadCard from '../components/FileUploadCard.vue';
import PreviewTable from '../components/PreviewTable.vue';
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
import { downloadResult, processOnlineAssessment } from '../services/ticketToolService';
import { runWithMinimumVisibleTime } from '../utils/blockingOperation';

defineProps({
  canExportExcel: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['status-change', 'log', 'feature-blocked']);
const taskKey = PROCESS_TASK_KEYS.ONLINE_SERVICE_ASSESSMENT;
const processTask = getProcessTask(taskKey);

const mspFile = ref(null);
const mccCallFile = ref(null);
const videoServiceFile = ref(null);
const mccTicketFile = ref(null);
const crmVideoFile = ref(null);
const qualityFile = ref(null);
const includeSourceSheets = ref(false);
const isDownloadBusy = ref(false);
const downloadFeedback = reactive({
  visible: false,
  title: '',
  message: ''
});

const isProcessing = computed(() => processTask.status === 'processing');
const progress = computed(() => processTask.progress || 0);
const resultState = computed(() => processTask.resultState || 'idle');
const resultMessage = computed(() => processTask.message || '等待上传 6 个文件');
const downloadUrl = computed(() => processTask.downloadUrl || '');
const preview = computed(() => processTask.preview || null);
const fileRefs = computed(() => [
  mspFile.value,
  mccCallFile.value,
  videoServiceFile.value,
  mccTicketFile.value,
  crmVideoFile.value,
  qualityFile.value
]);

const missingFileCount = computed(() => fileRefs.value.filter((file) => !file).length);
const canProcess = computed(() => missingFileCount.value === 0 && !isProcessing.value);

const statusText = computed(() => {
  if (isProcessing.value) return '正在计算考核指标';
  if (downloadUrl.value) return '计算完成，可下载计算表';
  return `待上传 ${missingFileCount.value} 个文件`;
});

watchEffect(() => {
  emit('status-change', statusText.value);
});

onMounted(loadLastDataset);

function setFile(type, file) {
  const fileMap = {
    msp: mspFile,
    mccCall: mccCallFile,
    videoService: videoServiceFile,
    mccTicket: mccTicketFile,
    crmVideo: crmVideoFile,
    quality: qualityFile
  };
  fileMap[type].value = file;
  resetResult();
  if (file) emit('log', `已选择在线服务考核指标文件：${file.name}`);
}

function resetResult() {
  resetProcessTask(taskKey, {
    message: missingFileCount.value
      ? `等待上传 ${missingFileCount.value} 个文件`
      : '等待开始计算'
  });
}

async function processFiles() {
  if (!canProcess.value) return;

  startProcessTask(taskKey, {
    progress: 8,
    message: '文件校验中',
    inputs: {
      mspFile: mspFile.value,
      mccCallFile: mccCallFile.value,
      videoServiceFile: videoServiceFile.value,
      mccTicketFile: mccTicketFile.value,
      crmVideoFile: crmVideoFile.value,
      qualityFile: qualityFile.value,
      includeSourceSheets: includeSourceSheets.value
    }
  });
  emit('log', '开始校验并计算在线服务考核指标');

  try {
    const payload = await processOnlineAssessment({
      mspFile: mspFile.value,
      mccCallFile: mccCallFile.value,
      videoServiceFile: videoServiceFile.value,
      mccTicketFile: mccTicketFile.value,
      crmVideoFile: crmVideoFile.value,
      qualityFile: qualityFile.value,
      includeSourceSheets: includeSourceSheets.value,
      onUploadProgress: (uploadProgress) => {
        updateProcessTask(taskKey, { progress: Math.max(8, uploadProgress) });
      },
      onHeadersReceived: () => {
        updateProcessTask(taskKey, {
          progress: Math.max(processTask.progress, 68),
          message: '正在计算指标'
        });
      }
    });

    completeProcessTask(taskKey, {
      message: '计算完成，可下载在线服务考核指标计算表',
      downloadUrl: payload.download_url || '',
      preview: payload.preview || null,
      meta: {
        includeSourceSheets: includeSourceSheets.value
      }
    });
    await saveToolDataset(LOCAL_DATASET_KEYS.ONLINE_SERVICE_ASSESSMENT, {
      resultState: processTask.resultState,
      resultMessage: processTask.message,
      downloadUrl: processTask.downloadUrl,
      preview: processTask.preview,
      includeSourceSheets: includeSourceSheets.value
    });
    const exportModeText = includeSourceSheets.value ? '完整导出，已包含源表' : '快速导出，未包含源表';
    emit('log', `在线服务考核指标计算完成（${exportModeText}），输出 ${payload.preview?.rows?.length ?? 0} 条预览指标`);
  } catch (error) {
    const message = error.message || '计算失败，请查看异常提示';
    failProcessTask(taskKey, message);
    emit('log', message);
  }
}

async function download() {
  if (!downloadUrl.value || isDownloadBusy.value) return;
  isDownloadBusy.value = true;
  downloadFeedback.visible = true;
  downloadFeedback.title = '正在下载计算表';
  downloadFeedback.message = '系统正在准备在线服务考核指标计算表，请不要重复点击下载按钮。';
  try {
    await runWithMinimumVisibleTime(async () => {
      await downloadResult(downloadUrl.value);
      emit('log', '已触发在线服务考核指标计算表下载');
    });
  } catch (error) {
    emit('log', error.message || '在线服务考核指标计算表下载失败');
  } finally {
    downloadFeedback.visible = false;
    isDownloadBusy.value = false;
  }
}

async function loadLastDataset() {
  restoreInputsFromTask();
  if (processTask.status !== 'idle') {
    includeSourceSheets.value = Boolean(
      processTask.inputs?.includeSourceSheets ?? processTask.meta?.includeSourceSheets
    );
    emit('log', processTask.status === 'processing' ? '已接续正在计算的在线服务考核指标任务' : '已恢复本次在线服务考核指标计算结果');
    return;
  }

  const record = await loadToolDataset(LOCAL_DATASET_KEYS.ONLINE_SERVICE_ASSESSMENT);
  const payload = record?.payload;
  if (!payload) return;
  completeProcessTask(taskKey, {
    resultState: payload.resultState || 'success',
    message: payload.resultMessage || '已加载上次计算结果',
    downloadUrl: payload.downloadUrl || '',
    preview: payload.preview || null,
    meta: {
      includeSourceSheets: Boolean(payload.includeSourceSheets)
    }
  });
  includeSourceSheets.value = Boolean(payload.includeSourceSheets);
  emit('log', '已加载上次在线服务考核指标计算结果');
}

function restoreInputsFromTask() {
  if (!processTask.inputs) return;
  mspFile.value = processTask.inputs.mspFile || mspFile.value;
  mccCallFile.value = processTask.inputs.mccCallFile || mccCallFile.value;
  videoServiceFile.value = processTask.inputs.videoServiceFile || videoServiceFile.value;
  mccTicketFile.value = processTask.inputs.mccTicketFile || mccTicketFile.value;
  crmVideoFile.value = processTask.inputs.crmVideoFile || crmVideoFile.value;
  qualityFile.value = processTask.inputs.qualityFile || qualityFile.value;
}
</script>
