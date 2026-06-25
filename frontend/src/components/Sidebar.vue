<template>
  <aside
    class="sidebar"
    :class="{ collapsed }"
  >
    <div class="sidebar-head">
      <div class="brand-mark">RTS</div>
      <div class="brand-copy">
        <strong>效率工具箱</strong>
        <span>Engineer Tools</span>
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

    <nav class="nav-list" aria-label="工具导航">
      <button
        class="nav-item"
        :class="{ active: activeTool === 'home' }"
        type="button"
        @click="$emit('select', 'home')"
      >
        <Home :size="18" />
        <span>首页</span>
      </button>

      <div class="nav-group">
        <button
          class="nav-item group-title active-group"
          type="button"
          @click="$emit('select', 'timeout-ticket-filter')"
        >
          <BriefcaseBusiness :size="18" />
          <span>工单工具</span>
        </button>
        <button
          class="nav-item sub-item"
          :class="{ active: activeTool === 'timeout-ticket-filter' }"
          type="button"
          @click="$emit('select', 'timeout-ticket-filter')"
        >
          <TimerReset :size="17" />
          <span>超时工单筛选</span>
        </button>
        <button
          class="nav-item sub-item"
          :class="{ active: activeTool === 'online-business-calculation' }"
          type="button"
          @click="$emit('select', 'online-business-calculation')"
        >
          <Calculator :size="17" />
          <span>在线业务计算</span>
        </button>
      </div>

      <div class="nav-group">
        <button
          class="nav-item group-title active-group"
          type="button"
          @click="$emit('select', 'service-qualification-map')"
        >
          <UsersRound :size="18" />
          <span>培训发展管理</span>
        </button>
        <button
          class="nav-item sub-item"
          :class="{ active: activeTool === 'service-qualification-map' }"
          type="button"
          @click="$emit('select', 'service-qualification-map')"
        >
          <MapPinned :size="17" />
          <span>中国区人员服务资质地图</span>
        </button>
        <button
          class="nav-item sub-item"
          :class="{ active: activeTool === 'training-coverage-map' }"
          type="button"
          @click="$emit('select', 'training-coverage-map')"
        >
          <Presentation :size="17" />
          <span>中国区培训覆盖地图</span>
        </button>
      </div>

      <button
        class="nav-item"
        :class="{ active: activeTool === 'eclass-data' }"
        type="button"
        @click="$emit('select', 'eclass-data')"
      >
        <GraduationCap :size="18" />
        <span>E课堂数据处理</span>
      </button>
    </nav>
  </aside>
</template>

<script setup>
import {
  BriefcaseBusiness,
  Calculator,
  GraduationCap,
  Home,
  MapPinned,
  PanelLeftClose,
  PanelLeftOpen,
  Presentation,
  TimerReset,
  UsersRound
} from 'lucide-vue-next';

const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false
  },
  activeTool: {
    type: String,
    required: true
  }
});

defineEmits(['toggle', 'select']);
</script>
