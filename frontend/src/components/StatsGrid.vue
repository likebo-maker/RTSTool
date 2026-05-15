<template>
  <section v-if="stats" class="stats-grid">
    <article
      v-for="item in metricItems"
      :key="item.key"
      class="metric-card"
      :class="item.tone"
    >
      <component :is="item.icon" :size="21" />
      <span>{{ item.label }}</span>
      <strong>{{ item.value }}</strong>
    </article>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { CheckCircle2, ClipboardList, Filter, Link2 } from 'lucide-vue-next';

const props = defineProps({
  stats: {
    type: Object,
    default: null
  }
});

const metricItems = computed(() => [
  {
    key: 'work_order_total',
    label: '工单总数',
    value: props.stats?.work_order_total ?? 0,
    icon: ClipboardList,
    tone: 'blue'
  },
  {
    key: 'pending_total',
    label: '待筛选',
    value: props.stats?.pending_total ?? 0,
    icon: Filter,
    tone: 'cyan'
  },
  {
    key: 'matched_quality_ticket_total',
    label: '已存在质量上升',
    value: props.stats?.matched_quality_ticket_total ?? 0,
    icon: Link2,
    tone: 'orange'
  },
  {
    key: 'result_total',
    label: '最终导出',
    value: props.stats?.result_total ?? 0,
    icon: CheckCircle2,
    tone: 'green'
  }
]);
</script>
