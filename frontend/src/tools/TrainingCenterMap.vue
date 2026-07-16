<template>
  <div class="tool-page qualification-page training-center-map-page" :class="{ 'fullscreen-workspace': fullscreenActive }">
    <section v-if="!fullscreenActive" class="glass-panel training-center-tab-panel">
      <div>
        <p class="section-kicker">Training Center Map</p>
        <h2>中国区培训中心建设/交付地图</h2>
      </div>
      <div class="training-center-tab-switch">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="training-center-tab-button"
          :class="{ active: activeTab === tab.key }"
          type="button"
          @click="activeTab = tab.key"
        >
          <component :is="tab.icon" :size="16" />
          <span>{{ tab.label }}</span>
        </button>
      </div>
    </section>

    <TrainingConstructionMap
      v-show="activeTab === 'construction'"
      :active="active && activeTab === 'construction'"
      :can-export-excel="canExportExcel"
      :fullscreen-active="fullscreenActive && activeTab === 'construction'"
      @enter-fullscreen="$emit('enter-fullscreen')"
      @exit-fullscreen="$emit('exit-fullscreen')"
      @feature-blocked="$emit('feature-blocked', $event)"
      @status-change="forwardStatus('construction', $event)"
      @log="forwardLog('construction', $event)"
    />

    <TrainingCoverageMap
      v-show="activeTab === 'delivery'"
      :active="active && activeTab === 'delivery'"
      :can-export-excel="canExportExcel"
      :fullscreen-active="fullscreenActive && activeTab === 'delivery'"
      @enter-fullscreen="$emit('enter-fullscreen')"
      @exit-fullscreen="$emit('exit-fullscreen')"
      @feature-blocked="$emit('feature-blocked', $event)"
      @status-change="forwardStatus('delivery', $event)"
      @log="forwardLog('delivery', $event)"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { MapPinned, Presentation } from 'lucide-vue-next';
import TrainingConstructionMap from './TrainingConstructionMap.vue';
import TrainingCoverageMap from './TrainingCoverageMap.vue';

defineProps({
  canExportExcel: {
    type: Boolean,
    default: true
  },
  fullscreenActive: {
    type: Boolean,
    default: false
  },
  active: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['status-change', 'log', 'feature-blocked', 'enter-fullscreen', 'exit-fullscreen']);

const activeTab = ref('construction');
const tabs = [
  { key: 'construction', label: '中国区培训中心建设地图', icon: MapPinned },
  { key: 'delivery', label: '中国区培训中心交付地图', icon: Presentation }
];

function forwardStatus(tabKey, message) {
  if (activeTab.value !== tabKey) return;
  emit('status-change', message);
}

function forwardLog(tabKey, message) {
  if (activeTab.value !== tabKey) return;
  emit('log', message);
}
</script>
