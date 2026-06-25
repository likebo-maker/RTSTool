<template>
  <label class="upload-card" :class="{ ready: file, disabled }">
    <input
      type="file"
      :accept="accept"
      :disabled="disabled"
      @change="handleChange"
    />
    <span class="upload-check" aria-hidden="true">
      <CheckCircle2 v-if="file" :size="20" />
      <UploadCloud v-else :size="20" />
    </span>
    <component :is="icon" class="upload-main-icon" :size="36" />
    <strong>{{ title }}</strong>
    <span class="upload-desc">{{ description }}</span>
    <span class="upload-filename">{{ file?.name || formatText }}</span>
  </label>
</template>

<script setup>
import { CheckCircle2, UploadCloud } from 'lucide-vue-next';

defineProps({
  file: {
    type: File,
    default: null
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: Object,
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  },
  accept: {
    type: String,
    default: '.xlsx,.xls,.xlsm,.csv'
  },
  formatText: {
    type: String,
    default: '支持 .xlsx / .xls / .csv'
  }
});

const emit = defineEmits(['change']);

function handleChange(event) {
  emit('change', event.target.files?.[0] || null);
}
</script>
