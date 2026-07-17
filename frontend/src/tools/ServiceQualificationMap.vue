<template>
  <div class="tool-page qualification-page engineer-qualification-map-page" :class="{ 'fullscreen-workspace': fullscreenActive }">
    <section v-if="!fullscreenActive" class="glass-panel training-center-tab-panel">
      <div>
        <p class="section-kicker">Engineer Qualification Map</p>
        <h2>工程师服务资质地图</h2>
      </div>
      <div class="training-center-tab-switch engineer-qualification-tab-switch">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="training-center-tab-button"
          :class="{ active: activeTab === tab.key }"
          type="button"
          @click="switchTab(tab.key)"
        >
          <component :is="tab.icon" :size="16" />
          <span>{{ tab.label }}</span>
        </button>
      </div>
    </section>

    <section v-show="activeTab === 'global'" class="glass-panel engineer-global-placeholder">
      <div class="tool-icon">
        <Globe2 :size="24" />
      </div>
      <div>
        <p class="section-kicker">GLOBAL SERVICE QUALIFICATION MAP</p>
        <h2>全球人员服务资质地图</h2>
        <p>该页签待开发。当前请使用“中国区人员服务资质地图”或“International Service Qualification Map”。</p>
      </div>
    </section>

    <ChinaServiceQualificationMap
      v-show="activeTab === 'china'"
      embedded
      :active="active && activeTab === 'china'"
      :can-export-excel="canExportExcel"
      :fullscreen-active="fullscreenActive && activeTab === 'china'"
      @enter-fullscreen="$emit('enter-fullscreen')"
      @exit-fullscreen="$emit('exit-fullscreen')"
      @feature-blocked="$emit('feature-blocked', $event)"
      @status-change="forwardStatus('china', $event)"
      @log="forwardLog('china', $event)"
    />

    <InternationalServiceQualificationMap
      v-show="activeTab === 'international'"
      embedded
      :active="active && activeTab === 'international'"
      :can-export-excel="canExportExcel"
      :fullscreen-active="fullscreenActive && activeTab === 'international'"
      @enter-fullscreen="$emit('enter-fullscreen')"
      @exit-fullscreen="$emit('exit-fullscreen')"
      @feature-blocked="$emit('feature-blocked', $event)"
      @status-change="forwardStatus('international', $event)"
      @log="forwardLog('international', $event)"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { Globe2, MapPinned, UsersRound } from 'lucide-vue-next';
import ChinaServiceQualificationMap from './ChinaServiceQualificationMap.vue';
import InternationalServiceQualificationMap from './InternationalServiceQualificationMap.vue';

const props = defineProps({
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

const activeTab = ref('china');
const tabs = [
  { key: 'global', label: '全球人员服务资质地图', icon: Globe2 },
  { key: 'china', label: '中国区人员服务资质地图', icon: MapPinned },
  { key: 'international', label: 'International Service Qualification Map', icon: UsersRound }
];

watch(
  () => props.active,
  (isActive) => {
    if (isActive && activeTab.value === 'global') {
      emit('status-change', '全球人员服务资质地图待开发');
    }
  },
  { immediate: true }
);

function switchTab(tabKey) {
  activeTab.value = tabKey;
  if (tabKey === 'global') {
    emit('status-change', '全球人员服务资质地图待开发');
  }
}

function forwardStatus(tabKey, message) {
  if (activeTab.value !== tabKey) return;
  emit('status-change', message);
}

function forwardLog(tabKey, message) {
  if (activeTab.value !== tabKey) return;
  emit('log', message);
}
</script>
