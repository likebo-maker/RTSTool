<template>
  <footer class="status-bar">
    <div class="status-left">
      <span class="status-light"></span>
      <span>{{ status }}</span>
    </div>
    <div class="status-log">
      <TerminalSquare :size="15" />
      <span>{{ latestLog }}</span>
    </div>
    <div class="status-version">{{ version }}</div>
  </footer>
</template>

<script setup>
import { computed } from 'vue';
import { TerminalSquare } from 'lucide-vue-next';

const props = defineProps({
  status: {
    type: String,
    required: true
  },
  logs: {
    type: Array,
    default: () => []
  },
  version: {
    type: String,
    required: true
  }
});

const latestLog = computed(() => props.logs[0] || '暂无运行日志');
</script>
