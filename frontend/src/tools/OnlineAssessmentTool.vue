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
    />

    <PreviewTable
      :preview="preview"
      empty-text="处理完成后展示在线服务考核指标预览。"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watchEffect } from 'vue';
import { ClipboardCheck, FileSpreadsheet, FileText, Headphones, MonitorPlay, Video } from 'lucide-vue-next';
import ActionPanel from '../components/ActionPanel.vue';
import FileUploadCard from '../components/FileUploadCard.vue';
import PreviewTable from '../components/PreviewTable.vue';
import ToolHeader from '../components/ToolHeader.vue';
import { LOCAL_DATASET_KEYS, loadToolDataset, saveToolDataset } from '../services/localDataStore';
import { downloadResult, processOnlineAssessment } from '../services/ticketToolService';

defineProps({
  canExportExcel: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['status-change', 'log', 'feature-blocked']);

const mspFile = ref(null);
const mccCallFile = ref(null);
const videoServiceFile = ref(null);
const mccTicketFile = ref(null);
const crmVideoFile = ref(null);
const qualityFile = ref(null);
const isProcessing = ref(false);
const progress = ref(0);
const resultState = ref('idle');
const resultMessage = ref('等待上传 6 个文件');
const downloadUrl = ref('');
const preview = ref(null);

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
  progress.value = 0;
  resultState.value = 'idle';
  resultMessage.value = missingFileCount.value
    ? `等待上传 ${missingFileCount.value} 个文件`
    : '等待开始计算';
  downloadUrl.value = '';
  preview.value = null;
}

async function processFiles() {
  if (!canProcess.value) return;

  isProcessing.value = true;
  progress.value = 8;
  resultState.value = 'processing';
  resultMessage.value = '文件校验中';
  downloadUrl.value = '';
  preview.value = null;
  emit('log', '开始校验并计算在线服务考核指标');

  try {
    const payload = await processOnlineAssessment({
      mspFile: mspFile.value,
      mccCallFile: mccCallFile.value,
      videoServiceFile: videoServiceFile.value,
      mccTicketFile: mccTicketFile.value,
      crmVideoFile: crmVideoFile.value,
      qualityFile: qualityFile.value,
      onUploadProgress: (uploadProgress) => {
        progress.value = Math.max(8, uploadProgress);
      },
      onHeadersReceived: () => {
        progress.value = Math.max(progress.value, 68);
        resultMessage.value = '正在计算指标';
      }
    });

    progress.value = 100;
    resultState.value = 'success';
    resultMessage.value = '计算完成，可下载在线服务考核指标计算表';
    downloadUrl.value = payload.download_url || '';
    preview.value = payload.preview || null;
    await saveToolDataset(LOCAL_DATASET_KEYS.ONLINE_SERVICE_ASSESSMENT, {
      resultState: resultState.value,
      resultMessage: resultMessage.value,
      downloadUrl: downloadUrl.value,
      preview: preview.value
    });
    emit('log', `在线服务考核指标计算完成，输出 ${payload.preview?.rows?.length ?? 0} 条预览指标`);
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
  emit('log', '已触发在线服务考核指标计算表下载');
}

async function loadLastDataset() {
  const record = await loadToolDataset(LOCAL_DATASET_KEYS.ONLINE_SERVICE_ASSESSMENT);
  const payload = record?.payload;
  if (!payload) return;
  progress.value = 100;
  resultState.value = payload.resultState || 'success';
  resultMessage.value = payload.resultMessage || '已加载上次计算结果';
  downloadUrl.value = payload.downloadUrl || '';
  preview.value = payload.preview || null;
  emit('log', '已加载上次在线服务考核指标计算结果');
}
</script>
