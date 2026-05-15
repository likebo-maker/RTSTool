<template>
  <section class="glass-panel preview-panel">
    <div class="panel-title-row">
      <div>
        <p class="section-kicker">Result Preview</p>
        <h2>结果预览</h2>
      </div>
      <span class="preview-count">前 {{ preview?.limit || 10 }} 行</span>
    </div>

    <div v-if="hasRows" class="table-shell">
      <table>
        <thead>
          <tr>
            <th v-for="column in preview.columns" :key="column">{{ column }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIndex) in preview.rows" :key="rowIndex">
            <td v-for="column in preview.columns" :key="column">{{ row[column] }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="empty-preview">
      <TableProperties :size="26" />
      <span>{{ emptyText }}</span>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { TableProperties } from 'lucide-vue-next';

const props = defineProps({
  preview: {
    type: Object,
    default: null
  }
});

const hasRows = computed(() => Boolean(props.preview?.rows?.length));
const emptyText = computed(() => {
  if (props.preview?.columns?.length) return '最终结果为空，暂无可预览数据';
  return '处理完成后展示最终导出数据的前 10 行';
});
</script>
