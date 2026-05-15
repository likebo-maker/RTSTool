<template>
  <label class="upload-card" :class="{ ready: file, disabled }">
    <input
      type="file"
      accept=".xlsx,.xls,.xlsm,.csv"
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
    <span class="upload-filename">{{ file?.name || '支持 .xlsx / .xls / .csv' }}</span>
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
  }
});

const emit = defineEmits(['change']);

function handleChange(event) {
  emit('change', event.target.files?.[0] || null);
}
</script>
