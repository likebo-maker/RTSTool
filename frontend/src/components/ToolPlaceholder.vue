<template>
  <section class="placeholder-panel">
    <div class="placeholder-icon">
      <Construction :size="30" />
    </div>
    <h1>{{ title }}</h1>
    <p>该工具入口已预留，后续可按相同模块规范接入独立工具组件与数据处理服务。</p>
  </section>
</template>

<script setup>
import { computed, watchEffect } from 'vue';
import { Construction } from 'lucide-vue-next';

const props = defineProps({
  toolKey: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['status-change']);

const title = computed(() => {
  if (props.toolKey === 'home') return '平台首页';
  if (props.toolKey === 'eclass-data') return 'E课堂数据处理';
  return '预留工具模块';
});

watchEffect(() => {
  emit('status-change', `${title.value}待接入`);
});
</script>
