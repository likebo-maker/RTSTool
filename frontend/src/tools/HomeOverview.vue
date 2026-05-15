<template>
  <div class="tool-page home-page">
    <section class="home-hero">
      <div class="home-hero-copy">
        <p class="section-kicker">RTS Engineer Workspace</p>
        <h1>RTS工程师效率工具箱</h1>
        <p>面向 RTS 技术支持工程师的一站式效率处理平台</p>
      </div>
      <button
        class="primary-button home-primary-action"
        type="button"
        @click="openTimeoutTool"
      >
        <TimerReset :size="18" />
        <span>快速进入超时工单筛选</span>
      </button>
    </section>

    <section class="home-section">
      <div class="home-section-title">
        <p class="section-kicker">Available Tool</p>
        <h2>当前已上线工具</h2>
      </div>

      <article class="featured-tool-card" @click="openTimeoutTool">
        <div class="featured-tool-icon">
          <TimerReset :size="30" />
        </div>
        <div class="featured-tool-copy">
          <div class="tool-title-row">
            <h3>超时工单筛选</h3>
            <span class="tool-status online">已上线</span>
          </div>
          <p>
            上传工单报表与质量上升报表，自动筛选 IVD 线未录入质量上升单的超时工单。
          </p>
        </div>
        <button class="primary-button compact" type="button" @click.stop="openTimeoutTool">
          <ArrowRight :size="17" />
          <span>立即使用</span>
        </button>
      </article>
    </section>

    <section class="glass-panel planning-panel">
      <div class="home-section-title">
        <p class="section-kicker">Roadmap</p>
        <h2>后续工具规划</h2>
      </div>
      <div class="planning-grid">
        <article
          v-for="tool in plannedTools"
          :key="tool.name"
          class="planned-tool-card"
          title="敬请期待"
        >
          <component :is="tool.icon" :size="22" />
          <div>
            <h3>{{ tool.name }}</h3>
            <span>{{ tool.status }}</span>
          </div>
        </article>
      </div>
    </section>

    <section class="system-status-panel">
      <div class="system-status-item">
        <ShieldCheck :size="18" />
        <span>服务状态：</span>
        <strong>工单筛选服务 正常</strong>
      </div>
      <div class="system-status-item">
        <BadgeInfo :size="18" />
        <span>工具更新：</span>
        <strong>当前版本 v1.0</strong>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import {
  ArrowRight,
  BadgeInfo,
  ClipboardList,
  GraduationCap,
  ShieldCheck,
  TimerReset,
  Wrench
} from 'lucide-vue-next';

const emit = defineEmits(['select-tool', 'status-change']);

const plannedTools = [
  {
    name: 'E课堂数据处理',
    status: '规划中',
    icon: GraduationCap
  },
  {
    name: '工单数据清洗',
    status: '预留',
    icon: ClipboardList
  },
  {
    name: '设备校准周期计算',
    status: '预留',
    icon: Wrench
  }
];

function openTimeoutTool() {
  emit('select-tool', 'timeout-ticket-filter');
}

onMounted(() => {
  emit('status-change', '工具箱首页就绪');
});
</script>
