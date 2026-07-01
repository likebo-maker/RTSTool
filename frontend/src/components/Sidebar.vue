<template>
  <aside class="sidebar" :class="{ collapsed }">
    <div class="sidebar-head">
      <div class="brand-mark image-logo sidebar-logo">
        <img :src="brandConfig.logoMark" :alt="brandConfig.appShortName" />
      </div>
      <div class="brand-copy">
        <strong>{{ brandConfig.appNameCn }}</strong>
        <span>{{ brandConfig.appShortName }}</span>
      </div>
      <button
        class="icon-button sidebar-toggle"
        type="button"
        :aria-label="collapsed ? '展开侧边栏' : '收起侧边栏'"
        :title="collapsed ? '展开侧边栏' : '收起侧边栏'"
        @click="$emit('toggle')"
      >
        <PanelLeftClose v-if="!collapsed" :size="18" />
        <PanelLeftOpen v-else :size="18" />
      </button>
    </div>

    <nav class="nav-list" aria-label="平台导航">
      <button class="nav-item" :class="{ active: activeTool === 'home' }" type="button" @click="$emit('select', 'home')">
        <Home :size="18" />
        <span>首页</span>
      </button>

      <div class="nav-group">
        <button class="nav-item group-title active-group" :class="{ locked: isWorkOrderGroupLocked }" type="button" @click="$emit('select', 'timeout-ticket-filter')">
          <BriefcaseBusiness :size="18" />
          <span>工单工具</span>
          <LockKeyhole v-if="isWorkOrderGroupLocked" class="nav-lock" :size="14" />
        </button>
        <button class="nav-item sub-item" :class="{ active: activeTool === 'timeout-ticket-filter', locked: isLocked('timeout-ticket-filter') }" type="button" @click="$emit('select', 'timeout-ticket-filter')">
          <TimerReset :size="17" />
          <span>超时工单筛选</span>
          <LockKeyhole v-if="isLocked('timeout-ticket-filter')" class="nav-lock" :size="14" />
        </button>
        <button class="nav-item sub-item" :class="{ active: activeTool === 'online-business-calculation', locked: isLocked('online-business-calculation') }" type="button" @click="$emit('select', 'online-business-calculation')">
          <Target :size="17" />
          <span>在线服务项目目标</span>
          <LockKeyhole v-if="isLocked('online-business-calculation')" class="nav-lock" :size="14" />
        </button>
        <button class="nav-item sub-item" :class="{ active: activeTool === 'online-service-assessment', locked: isLocked('online-service-assessment') }" type="button" @click="$emit('select', 'online-service-assessment')">
          <ClipboardCheck :size="17" />
          <span>在线服务考核指标</span>
          <LockKeyhole v-if="isLocked('online-service-assessment')" class="nav-lock" :size="14" />
        </button>
      </div>

      <div class="nav-group">
        <button class="nav-item group-title active-group" :class="{ locked: isTrainingGroupLocked }" type="button" @click="$emit('select', 'service-qualification-map')">
          <UsersRound :size="18" />
          <span>培训发展管理</span>
          <LockKeyhole v-if="isTrainingGroupLocked" class="nav-lock" :size="14" />
        </button>
        <button class="nav-item sub-item" :class="{ active: activeTool === 'service-qualification-map', locked: isLocked('service-qualification-map') }" type="button" @click="$emit('select', 'service-qualification-map')">
          <MapPinned :size="17" />
          <span>中国区人员服务资质地图</span>
          <LockKeyhole v-if="isLocked('service-qualification-map')" class="nav-lock" :size="14" />
        </button>
        <button class="nav-item sub-item" :class="{ active: activeTool === 'training-coverage-map', locked: isLocked('training-coverage-map') }" type="button" @click="$emit('select', 'training-coverage-map')">
          <Presentation :size="17" />
          <span>中国区培训覆盖地图</span>
          <LockKeyhole v-if="isLocked('training-coverage-map')" class="nav-lock" :size="14" />
        </button>
      </div>

      <button class="nav-item" :class="{ active: activeTool === 'eclass-data', locked: isLocked('eclass-data') }" type="button" @click="$emit('select', 'eclass-data')">
        <GraduationCap :size="18" />
        <span>E课堂数据处理</span>
        <LockKeyhole v-if="isLocked('eclass-data')" class="nav-lock" :size="14" />
      </button>

      <div class="nav-group">
        <button class="nav-item group-title active-group" type="button" @click="$emit('select', 'license-center')">
          <Settings :size="18" />
          <span>系统管理</span>
        </button>
        <button class="nav-item sub-item" :class="{ active: activeTool === 'license-center' }" type="button" @click="$emit('select', 'license-center')">
          <ShieldCheck :size="17" />
          <span>授权中心</span>
        </button>
        <button class="nav-item sub-item" type="button" @click="$emit('show-disclaimer')">
          <ShieldAlert :size="17" />
          <span>信息安全声明</span>
        </button>
        <button class="nav-item sub-item" :class="{ active: activeTool === 'about-platform' }" type="button" @click="$emit('select', 'about-platform')">
          <Info :size="17" />
          <span>关于平台</span>
        </button>
      </div>
    </nav>
  </aside>
</template>

<script setup>
import { computed } from 'vue';
import {
  BriefcaseBusiness,
  ClipboardCheck,
  GraduationCap,
  Home,
  Info,
  LockKeyhole,
  MapPinned,
  PanelLeftClose,
  PanelLeftOpen,
  Presentation,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Target,
  TimerReset,
  UsersRound
} from 'lucide-vue-next';
import { brandConfig } from '../config/brandConfig';
import { hasToolAccess } from '../utils/licenseFeatures';

const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false
  },
  activeTool: {
    type: String,
    required: true
  },
  licenseInfo: {
    type: Object,
    default: () => ({})
  }
});

defineEmits(['toggle', 'select', 'show-disclaimer']);

const isWorkOrderGroupLocked = computed(() => (
  isLocked('timeout-ticket-filter') &&
  isLocked('online-business-calculation') &&
  isLocked('online-service-assessment')
));

const isTrainingGroupLocked = computed(() => (
  isLocked('service-qualification-map') && isLocked('training-coverage-map')
));

function isLocked(toolKey) {
  return !hasToolAccess(props.licenseInfo, toolKey);
}
</script>
