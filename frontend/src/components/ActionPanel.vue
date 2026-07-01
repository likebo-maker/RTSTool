<template>
  <section class="glass-panel action-panel">
    <div class="panel-title-row">
      <div>
        <p class="section-kicker">Process Control</p>
        <h2>操作控制</h2>
      </div>
      <div class="panel-actions">
        <slot name="header-actions"></slot>
        <div class="status-pill" :class="resultState">
          <span class="status-dot" :class="{ active: isProcessing }"></span>
          <span>{{ statusText }}</span>
        </div>
      </div>
    </div>

    <div class="action-row">
      <button class="primary-button" :disabled="!canProcess" type="button" @click="$emit('process')">
        <LoaderCircle v-if="isProcessing" class="spin" :size="18" />
        <Play v-else :size="18" />
        <span>{{ isProcessing ? processingLabel : processLabel }}</span>
      </button>
      <button
        class="ghost-button"
        :class="{ locked: downloadLocked }"
        :disabled="!downloadLocked && (!canDownload || isProcessing || isDownloadBusy)"
        :title="downloadLocked ? lockedTitle : ''"
        type="button"
        @click="handleDownloadClick"
      >
        <LoaderCircle v-if="isDownloadBusy" class="spin" :size="18" />
        <Download v-else :size="18" />
        <span>{{ downloadLabel }}</span>
      </button>
    </div>

    <div class="progress-wrap" aria-live="polite">
      <div class="progress-track">
        <div
          class="progress-bar"
          :class="{ complete: progress === 100 }"
          :style="{ width: `${progress}%` }"
        ></div>
      </div>
      <span class="progress-value">{{ progress }}%</span>
    </div>

    <div class="result-band" :class="resultState">
      <CheckCircle v-if="resultState === 'success'" :size="21" />
      <AlertCircle v-else-if="resultState === 'error'" :size="21" />
      <Clock3 v-else :size="21" />
      <span>{{ message }}</span>
    </div>
  </section>
</template>

<script setup>
import { AlertCircle, CheckCircle, Clock3, Download, LoaderCircle, Play } from 'lucide-vue-next';

const props = defineProps({
  canProcess: {
    type: Boolean,
    required: true
  },
  canDownload: {
    type: Boolean,
    required: true
  },
  isProcessing: {
    type: Boolean,
    required: true
  },
  progress: {
    type: Number,
    required: true
  },
  resultState: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  statusText: {
    type: String,
    required: true
  },
  processLabel: {
    type: String,
    default: '执行处理'
  },
  processingLabel: {
    type: String,
    default: '处理中'
  },
  downloadLabel: {
    type: String,
    default: '下载最终表格'
  },
  downloadLocked: {
    type: Boolean,
    default: false
  },
  isDownloadBusy: {
    type: Boolean,
    default: false
  },
  lockedTitle: {
    type: String,
    default: '当前授权未开放该功能'
  }
});

const emit = defineEmits(['process', 'download', 'locked-download']);

function handleDownloadClick() {
  if (props.isDownloadBusy) return;
  if (props.downloadLocked) {
    emit('locked-download');
    return;
  }
  emit('download');
}
</script>
