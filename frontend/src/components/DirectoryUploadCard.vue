<template>
  <label class="upload-card eclass-directory-card" :class="{ ready: files.length, disabled }">
    <input
      type="file"
      :accept="accept"
      :disabled="disabled"
      webkitdirectory
      directory
      multiple
      @change="handleChange"
    />
    <span class="upload-check" aria-hidden="true">
      <CheckCircle2 v-if="files.length" :size="20" />
      <UploadCloud v-else :size="20" />
    </span>
    <FolderOpen class="upload-main-icon" :size="38" />
    <strong>{{ title }}<em v-if="required">*</em></strong>
    <span class="upload-desc">{{ description }}</span>

    <div v-if="files.length" class="directory-summary">
      <span class="directory-folder-name">{{ folderName }}</span>
      <div class="directory-metrics">
        <span>文件总数：{{ totalCount }}</span>
        <span>Excel：{{ excelCount }}</span>
        <span>{{ hasSubdirs ? '包含子目录' : '当前层级文件' }}</span>
      </div>
      <div class="directory-preview-list">
        <span v-for="name in previewNames" :key="name">{{ name }}</span>
      </div>
    </div>
    <span v-else class="upload-filename">选择文件夹，支持 {{ accept }}</span>

    <button
      v-if="files.length"
      class="eclass-clear-button"
      type="button"
      :disabled="disabled"
      @click.prevent.stop="emit('clear')"
    >
      清除
    </button>
  </label>
</template>

<script setup>
import { computed } from 'vue';
import { CheckCircle2, FolderOpen, UploadCloud } from 'lucide-vue-next';

const props = defineProps({
  files: {
    type: Array,
    default: () => []
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  accept: {
    type: String,
    default: '.xlsx,.xls,.xlsm'
  },
  required: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['change', 'clear']);

const excelSuffixes = new Set(['.xlsx', '.xls', '.xlsm']);

const totalCount = computed(() => props.files.length);

const folderName = computed(() => {
  const firstPath = relativePath(props.files[0]);
  const firstSegment = firstPath.split(/[\\/]/).filter(Boolean)[0];
  return firstSegment || '已选择文件夹';
});

const excelCount = computed(() => props.files.filter((file) => excelSuffixes.has(fileSuffix(file.name))).length);

const hasSubdirs = computed(() => props.files.some((file) => {
  const parts = relativePath(file).split(/[\\/]/).filter(Boolean);
  return parts.length > 2;
}));

const previewNames = computed(() => props.files.slice(0, 5).map((file) => relativePath(file) || file.name));

function relativePath(file) {
  return file?.webkitRelativePath || file?.name || '';
}

function fileSuffix(filename) {
  const match = String(filename || '').toLowerCase().match(/\.[^.]+$/);
  return match ? match[0] : '';
}

function handleChange(event) {
  emit('change', Array.from(event.target.files || []));
}
</script>
