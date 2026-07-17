<template>
  <Transition name="disclaimer-fade">
    <div v-if="visible" class="qualification-import-overlay">
      <section class="qualification-import-card">
        <div class="qualification-import-head">
          <div class="qualification-import-mark" :class="mode">
            <LoaderCircle v-if="mode === 'progress' || mode === 'success'" class="spin" :size="22" />
            <CircleAlert v-else :size="22" />
          </div>
          <div>
            <p class="section-kicker">{{ kicker }}</p>
            <h2>{{ resolvedTitle }}</h2>
            <p>{{ resolvedSubtitle }}</p>
          </div>
        </div>

        <div class="qualification-import-progress">
          <div class="qualification-import-progress-top">
            <span>{{ progressLabel }}</span>
            <strong>{{ normalizedProgress }}%</strong>
          </div>
          <div class="qualification-import-progress-track">
            <div class="qualification-import-progress-fill" :style="{ width: `${normalizedProgress}%` }"></div>
          </div>
        </div>

        <div class="qualification-import-step-list">
          <div v-for="step in steps" :key="step.key" class="qualification-import-step" :class="step.status">
            <span class="qualification-import-step-icon">
              <CheckCircle2 v-if="step.status === 'completed'" :size="16" />
              <LoaderCircle v-else-if="step.status === 'processing'" class="spin" :size="16" />
              <CircleAlert v-else-if="step.status === 'failed'" :size="16" />
              <Circle :size="14" v-else />
            </span>
            <div class="qualification-import-step-copy">
              <strong>{{ step.label }}</strong>
              <span>{{ resolveStatusText(step.status) }}</span>
            </div>
          </div>
        </div>

        <div class="qualification-import-message" :class="mode">
          <span>{{ resolvedMessage }}</span>
        </div>

        <div v-if="mode === 'error'" class="qualification-import-actions">
          <button class="primary-button" type="button" @click="$emit('retry')">
            {{ retryLabel }}
          </button>
          <button class="ghost-button" type="button" @click="$emit('close')">
            {{ closeLabel }}
          </button>
        </div>
      </section>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue';
import { CheckCircle2, Circle, CircleAlert, LoaderCircle } from 'lucide-vue-next';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  mode: {
    type: String,
    default: 'progress'
  },
  progress: {
    type: Number,
    default: 0
  },
  title: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    default: ''
  },
  steps: {
    type: Array,
    default: () => []
  },
  errorTitle: {
    type: String,
    default: ''
  },
  errorMessage: {
    type: String,
    default: ''
  },
  kicker: {
    type: String,
    default: 'Import Progress'
  },
  progressLabel: {
    type: String,
    default: '解析进度'
  },
  defaultTitle: {
    type: String,
    default: '正在导入服务资质数据'
  },
  defaultSubtitle: {
    type: String,
    default: '系统正在解析 Excel、清洗字段并生成地图数据，请稍候...'
  },
  defaultMessage: {
    type: String,
    default: '正在准备导入...'
  },
  successTitle: {
    type: String,
    default: '导入完成'
  },
  successSubtitle: {
    type: String,
    default: '资质数据已完成解析，正在刷新地图与统计结果。'
  },
  successMessage: {
    type: String,
    default: '地图、统计卡片、排行与图表数据已更新。'
  },
  defaultErrorTitle: {
    type: String,
    default: '导入失败'
  },
  defaultErrorSubtitle: {
    type: String,
    default: '请检查 Excel 表头和字段结构后重试。'
  },
  defaultErrorMessage: {
    type: String,
    default: '请检查 Excel 表头是否正确。'
  },
  pendingLabel: {
    type: String,
    default: '等待中'
  },
  processingLabel: {
    type: String,
    default: '处理中'
  },
  completedLabel: {
    type: String,
    default: '已完成'
  },
  failedLabel: {
    type: String,
    default: '失败'
  },
  retryLabel: {
    type: String,
    default: '重新导入'
  },
  closeLabel: {
    type: String,
    default: '关闭'
  }
});

defineEmits(['retry', 'close']);

const normalizedProgress = computed(() => Math.max(0, Math.min(100, Math.round(props.progress || 0))));
const resolvedTitle = computed(() => {
  if (props.mode === 'error') return props.errorTitle || props.defaultErrorTitle;
  if (props.mode === 'success') return props.successTitle;
  return props.title || props.defaultTitle;
});
const resolvedSubtitle = computed(() => {
  if (props.mode === 'error') return props.errorMessage || props.defaultErrorSubtitle;
  if (props.mode === 'success') return props.successSubtitle;
  return props.subtitle || props.defaultSubtitle;
});
const resolvedMessage = computed(() => {
  if (props.mode === 'error') return props.errorMessage || props.defaultErrorMessage;
  if (props.mode === 'success') return props.successMessage;
  return props.message || props.defaultMessage;
});

function resolveStatusText(status) {
  if (status === 'completed') return props.completedLabel;
  if (status === 'processing') return props.processingLabel;
  if (status === 'failed') return props.failedLabel;
  return props.pendingLabel;
}
</script>
