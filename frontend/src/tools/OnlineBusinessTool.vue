<template>
  <div class="tool-page">
    <ToolHeader
      :icon="Calculator"
      kicker="ONLINE SERVICE PROJECT TARGET"
      title="在线服务项目目标"
      description="上传 MCC热线、视频工单、MSP工单、IVD客户群 4 个原始表格，自动计算在线服务项目目标并生成结果表。"
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
          :file="mccFile"
          :icon="Headphones"
          title="上传 MCC热线原始数据"
          description="用于热线进线量、解决率和客户覆盖率分子计算"
          accept=".xlsx,.xls,.csv"
          format-text="支持格式：xlsx / csv"
          :disabled="isProcessing"
          @change="setFile('mcc', $event)"
        />
        <FileUploadCard
          :file="videoFile"
          :icon="Video"
          title="上传 视频工单原始数据"
          description="用于统计视频转技术支持工单数量"
          accept=".xlsx,.xls,.csv"
          format-text="支持格式：xlsx / csv"
          :disabled="isProcessing"
          @change="setFile('video', $event)"
        />
        <FileUploadCard
          :file="mspFile"
          :icon="FileSpreadsheet"
          title="上传 MSP工单原始数据"
          description="用于统计 MSP 远程申告和 CS申告工单数量"
          accept=".xlsx,.xls,.csv"
          format-text="支持格式：xlsx / csv"
          :disabled="isProcessing"
          @change="setFile('msp', $event)"
        />
        <FileUploadCard
          :file="ivdCustomerFile"
          :icon="UsersRound"
          title="上传 IVD客户群表"
          description="用于客户层级匹配、整体客户总量和 JC+社办分母"
          accept=".xlsx,.xls,.csv"
          format-text="支持格式：xlsx / csv"
          :disabled="isProcessing"
          @change="setFile('ivd', $event)"
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
      download-label="下载结果表"
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
      empty-text="处理完成后展示在线业务指标结果。"
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
import { Calculator, FileSpreadsheet, Headphones, UsersRound, Video } from 'lucide-vue-next';
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
import { downloadResult, processOnlineBusiness } from '../services/ticketToolService';
import { runWithMinimumVisibleTime } from '../utils/blockingOperation';

defineProps({
  canExportExcel: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['status-change', 'log', 'feature-blocked']);
const taskKey = PROCESS_TASK_KEYS.ONLINE_SERVICE_TARGET;
const processTask = getProcessTask(taskKey);

const mccFile = ref(null);
const videoFile = ref(null);
const mspFile = ref(null);
const ivdCustomerFile = ref(null);
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
const resultMessage = computed(() => processTask.message || '等待上传 4 个文件');
const downloadUrl = computed(() => processTask.downloadUrl || '');
const preview = computed(() => processTask.preview || null);
const targetYear = computed(() => processTask.targetYear || '');
const canProcess = computed(() => Boolean(
  mccFile.value &&
  videoFile.value &&
  mspFile.value &&
  ivdCustomerFile.value &&
  !isProcessing.value
));

const statusText = computed(() => {
  if (isProcessing.value) return '正在计算指标';
  if (downloadUrl.value) return '计算完成，可下载结果表';
  return `待上传 ${missingFileCount.value} 个文件`;
});

const missingFileCount = computed(() => {
  return [mccFile.value, videoFile.value, mspFile.value, ivdCustomerFile.value].filter((file) => !file).length;
});

watchEffect(() => {
  emit('status-change', statusText.value);
});

onMounted(loadLastDataset);

function setFile(type, file) {
  const fileMap = {
    mcc: mccFile,
    video: videoFile,
    msp: mspFile,
    ivd: ivdCustomerFile
  };
  fileMap[type].value = file;
  resetResult();
  if (file) {
    emit('log', `已选择在线业务计算文件：${file.name}`);
  }
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
      mccFile: mccFile.value,
      videoFile: videoFile.value,
      mspFile: mspFile.value,
      ivdCustomerFile: ivdCustomerFile.value,
      includeSourceSheets: includeSourceSheets.value
    }
  });
  emit('log', '开始校验并计算在线业务指标');

  try {
    const payload = await processOnlineBusiness({
      mccFile: mccFile.value,
      videoFile: videoFile.value,
      mspFile: mspFile.value,
      ivdCustomerFile: ivdCustomerFile.value,
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

    updateProcessTask(taskKey, {
      progress: 92,
      message: '正在生成结果表'
    });
    const nextTargetYear = payload.target_year || '';
    completeProcessTask(taskKey, {
      message: `计算完成，可下载结果表${nextTargetYear ? `（${nextTargetYear}）` : ''}`,
      downloadUrl: payload.download_url || '',
      preview: payload.preview || null,
      targetYear: nextTargetYear,
      meta: {
        includeSourceSheets: includeSourceSheets.value
      }
    });
    await saveToolDataset(LOCAL_DATASET_KEYS.ONLINE_SERVICE_TARGET, {
      resultState: processTask.resultState,
      resultMessage: processTask.message,
      downloadUrl: processTask.downloadUrl,
      preview: processTask.preview,
      targetYear: processTask.targetYear,
      includeSourceSheets: includeSourceSheets.value
    });
    const exportModeText = includeSourceSheets.value ? '完整导出，已包含源表' : '快速导出，未包含源表';
    emit('log', `在线业务计算完成（${exportModeText}），输出 ${payload.preview?.rows?.length ?? 0} 条预览指标`);
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
  downloadFeedback.title = '正在下载结果表';
  downloadFeedback.message = '系统正在准备在线服务项目目标计算表，请不要重复点击下载按钮。';
  try {
    await runWithMinimumVisibleTime(async () => {
      await downloadResult(downloadUrl.value);
      emit('log', '已触发在线服务项目目标计算表下载');
    });
  } catch (error) {
    emit('log', error.message || '在线服务项目目标计算表下载失败');
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
    emit('log', processTask.status === 'processing' ? '已接续正在计算的在线服务项目目标任务' : '已恢复本次在线服务项目目标计算结果');
    return;
  }

  const record = await loadToolDataset(LOCAL_DATASET_KEYS.ONLINE_SERVICE_TARGET);
  const payload = record?.payload;
  if (!payload) return;
  completeProcessTask(taskKey, {
    resultState: payload.resultState || 'success',
    message: payload.resultMessage || '已加载上次计算结果',
    downloadUrl: payload.downloadUrl || '',
    preview: payload.preview || null,
    targetYear: payload.targetYear || '',
    meta: {
      includeSourceSheets: Boolean(payload.includeSourceSheets)
    }
  });
  includeSourceSheets.value = Boolean(payload.includeSourceSheets);
  emit('log', '已加载上次在线服务项目目标计算结果');
}

function restoreInputsFromTask() {
  if (!processTask.inputs) return;
  mccFile.value = processTask.inputs.mccFile || mccFile.value;
  videoFile.value = processTask.inputs.videoFile || videoFile.value;
  mspFile.value = processTask.inputs.mspFile || mspFile.value;
  ivdCustomerFile.value = processTask.inputs.ivdCustomerFile || ivdCustomerFile.value;
}
</script>
