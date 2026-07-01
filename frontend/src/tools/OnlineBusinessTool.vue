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
        <span class="format-chip">.xlsx</span>
      </div>

      <div class="upload-grid online-upload-grid">
        <FileUploadCard
          :file="mccFile"
          :icon="Headphones"
          title="上传 MCC热线原始数据.xlsx"
          description="用于热线进线量、解决率和客户覆盖率分子计算"
          accept=".xlsx"
          format-text="支持格式：xlsx"
          :disabled="isProcessing"
          @change="setFile('mcc', $event)"
        />
        <FileUploadCard
          :file="videoFile"
          :icon="Video"
          title="上传 视频工单原始数据.xlsx"
          description="用于统计视频转技术支持工单数量"
          accept=".xlsx"
          format-text="支持格式：xlsx"
          :disabled="isProcessing"
          @change="setFile('video', $event)"
        />
        <FileUploadCard
          :file="mspFile"
          :icon="FileSpreadsheet"
          title="上传 MSP工单原始数据.xlsx"
          description="用于统计 MSP 远程申告和 CS申告工单数量"
          accept=".xlsx"
          format-text="支持格式：xlsx"
          :disabled="isProcessing"
          @change="setFile('msp', $event)"
        />
        <FileUploadCard
          :file="ivdCustomerFile"
          :icon="UsersRound"
          title="上传 IVD客户群表.xlsx"
          description="用于客户层级匹配、整体客户总量和 JC+社办分母"
          accept=".xlsx"
          format-text="支持格式：xlsx"
          :disabled="isProcessing"
          @change="setFile('ivd', $event)"
        />
      </div>
    </section>

    <ActionPanel
      :can-process="canProcess"
      :can-download="Boolean(downloadUrl)"
      :is-processing="isProcessing"
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
    />

    <PreviewTable
      :preview="preview"
      empty-text="处理完成后展示在线业务指标结果。"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watchEffect } from 'vue';
import { Calculator, FileSpreadsheet, Headphones, UsersRound, Video } from 'lucide-vue-next';
import ActionPanel from '../components/ActionPanel.vue';
import FileUploadCard from '../components/FileUploadCard.vue';
import PreviewTable from '../components/PreviewTable.vue';
import ToolHeader from '../components/ToolHeader.vue';
import { LOCAL_DATASET_KEYS, loadToolDataset, saveToolDataset } from '../services/localDataStore';
import { downloadResult, processOnlineBusiness } from '../services/ticketToolService';

defineProps({
  canExportExcel: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['status-change', 'log', 'feature-blocked']);

const mccFile = ref(null);
const videoFile = ref(null);
const mspFile = ref(null);
const ivdCustomerFile = ref(null);
const isProcessing = ref(false);
const progress = ref(0);
const resultState = ref('idle');
const resultMessage = ref('等待上传 4 个文件');
const downloadUrl = ref('');
const preview = ref(null);
const targetYear = ref('');

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
  progress.value = 0;
  resultState.value = 'idle';
  resultMessage.value = missingFileCount.value
    ? `等待上传 ${missingFileCount.value} 个文件`
    : '等待开始计算';
  downloadUrl.value = '';
  preview.value = null;
  targetYear.value = '';
}

async function processFiles() {
  if (!canProcess.value) return;

  isProcessing.value = true;
  progress.value = 8;
  resultState.value = 'processing';
  resultMessage.value = '文件校验中';
  downloadUrl.value = '';
  preview.value = null;
  emit('log', '开始校验并计算在线业务指标');

  try {
    const payload = await processOnlineBusiness({
      mccFile: mccFile.value,
      videoFile: videoFile.value,
      mspFile: mspFile.value,
      ivdCustomerFile: ivdCustomerFile.value,
      onUploadProgress: (uploadProgress) => {
        progress.value = Math.max(8, uploadProgress);
      },
      onHeadersReceived: () => {
        progress.value = Math.max(progress.value, 68);
        resultMessage.value = '正在计算指标';
      }
    });

    progress.value = 92;
    resultMessage.value = '正在生成结果表';
    progress.value = 100;
    resultState.value = 'success';
    targetYear.value = payload.target_year || '';
    resultMessage.value = `计算完成，可下载结果表${targetYear.value ? `（${targetYear.value}）` : ''}`;
    downloadUrl.value = payload.download_url || '';
    preview.value = payload.preview || null;
    await saveToolDataset(LOCAL_DATASET_KEYS.ONLINE_SERVICE_TARGET, {
      resultState: resultState.value,
      resultMessage: resultMessage.value,
      downloadUrl: downloadUrl.value,
      preview: preview.value,
      targetYear: targetYear.value
    });
    emit('log', `在线业务计算完成，输出 ${payload.preview?.rows?.length ?? 0} 条预览指标`);
  } catch (error) {
    progress.value = 0;
    resultState.value = 'error';
    resultMessage.value = error.message || '计算失败，请查看异常提示';
    emit('log', resultMessage.value);
  } finally {
    isProcessing.value = false;
  }
}

function download() {
  downloadResult(downloadUrl.value);
  emit('log', '已触发在线服务项目目标计算表下载');
}

async function loadLastDataset() {
  const record = await loadToolDataset(LOCAL_DATASET_KEYS.ONLINE_SERVICE_TARGET);
  const payload = record?.payload;
  if (!payload) return;
  progress.value = 100;
  resultState.value = payload.resultState || 'success';
  resultMessage.value = payload.resultMessage || '已加载上次计算结果';
  downloadUrl.value = payload.downloadUrl || '';
  preview.value = payload.preview || null;
  targetYear.value = payload.targetYear || '';
  emit('log', '已加载上次在线服务项目目标计算结果');
}
</script>
