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
      :progress="progress"
      :result-state="resultState"
      :message="resultMessage"
      :status-text="statusText"
      @process="processFiles"
      @download="download"
    />

    <StatsGrid :stats="stats" />
    <PreviewTable :preview="preview" />
  </div>
</template>

<script setup>
import { computed, ref, watchEffect } from 'vue';
import { FileCheck2, FileSpreadsheet, TimerReset } from 'lucide-vue-next';
import ActionPanel from '../components/ActionPanel.vue';
import FileUploadCard from '../components/FileUploadCard.vue';
import PreviewTable from '../components/PreviewTable.vue';
import StatsGrid from '../components/StatsGrid.vue';
import ToolHeader from '../components/ToolHeader.vue';
import { downloadResult, processTimeoutTickets } from '../services/ticketToolService';

const emit = defineEmits(['status-change', 'log']);

const workOrderFile = ref(null);
const qualityFile = ref(null);
const isProcessing = ref(false);
const progress = ref(0);
const resultState = ref('idle');
const resultMessage = ref('等待上传两个文件');
const downloadUrl = ref('');
const stats = ref(null);
const preview = ref(null);

const canProcess = computed(() => Boolean(workOrderFile.value && qualityFile.value && !isProcessing.value));

const statusText = computed(() => {
  if (isProcessing.value) return '后端正在清洗、筛选与对比数据';
  if (downloadUrl.value) return '结果已生成，可下载';
  return '待处理';
});

watchEffect(() => {
  emit('status-change', statusText.value);
});

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
  progress.value = 0;
  resultState.value = 'idle';
  resultMessage.value = '等待执行处理';
  downloadUrl.value = '';
  stats.value = null;
  preview.value = null;
}

async function processFiles() {
  if (!canProcess.value) return;

  isProcessing.value = true;
  progress.value = 8;
  resultState.value = 'processing';
  resultMessage.value = '正在上传文件';
  downloadUrl.value = '';
  stats.value = null;
  preview.value = null;
  emit('log', '开始上传并处理工单数据');

  try {
    const payload = await processTimeoutTickets({
      workOrderFile: workOrderFile.value,
      qualityFile: qualityFile.value,
      onUploadProgress: (uploadProgress) => {
        progress.value = Math.max(8, uploadProgress);
      },
      onHeadersReceived: () => {
        progress.value = Math.max(progress.value, 64);
        resultMessage.value = '后端正在筛选 IVD 工单并对比质量上升报表';
      }
    });

    progress.value = 100;
    resultState.value = 'success';
    resultMessage.value = '导出成功，最终表格已生成';
    downloadUrl.value = payload.download_url || '';
    stats.value = payload.stats || null;
    preview.value = payload.preview || null;
    emit('log', `处理完成，最终导出 ${payload.stats?.result_total ?? 0} 条`);
  } catch (error) {
    progress.value = 0;
    resultState.value = 'error';
    resultMessage.value = error.message || '导出失败，请检查 Excel 表头与文件内容';
    emit('log', resultMessage.value);
  } finally {
    isProcessing.value = false;
  }
}

function download() {
  downloadResult(downloadUrl.value);
  emit('log', '已触发最终表格下载');
}
</script>
