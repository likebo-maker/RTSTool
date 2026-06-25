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

      <article
        v-for="tool in availableTools"
        :key="tool.key"
        class="featured-tool-card"
        @click="openTool(tool.key)"
      >
        <div class="featured-tool-icon">
          <component :is="tool.icon" :size="30" />
        </div>
        <div class="featured-tool-copy">
          <div class="tool-title-row">
            <h3>{{ tool.name }}</h3>
            <span class="tool-status online">已上线</span>
          </div>
          <p>{{ tool.description }}</p>
        </div>
        <button class="primary-button compact" type="button" @click.stop="openTool(tool.key)">
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
  Calculator,
  ClipboardList,
  GraduationCap,
  MapPinned,
  Presentation,
  ShieldCheck,
  TimerReset,
  Wrench
} from 'lucide-vue-next';

const emit = defineEmits(['select-tool', 'status-change']);

const availableTools = [
  {
    key: 'timeout-ticket-filter',
    name: '超时工单筛选',
    description: '上传工单报表与质量上升报表，自动筛选 IVD 线未录入质量上升单的超时工单。',
    icon: TimerReset
  },
  {
    key: 'online-business-calculation',
    name: '在线业务计算',
    description: '上传 MCC热线、视频工单、MSP工单、IVD客户群 4 个原始表格，自动生成在线业务指标结果表。',
    icon: Calculator
  },
  {
    key: 'service-qualification-map',
    name: '中国区人员服务资质地图',
    description: '查看全国分公司服务资质覆盖情况、资质到期预警及产品线能力分布。',
    icon: MapPinned
  },
  {
    key: 'training-coverage-map',
    name: '中国区培训覆盖地图',
    description: '查看全国分公司培训覆盖、培训场次、合格率及培训类型分布情况。',
    icon: Presentation
  }
];

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

function openTool(toolKey) {
  emit('select-tool', toolKey);
}

function openTimeoutTool() {
  openTool('timeout-ticket-filter');
}

onMounted(() => {
  emit('status-change', '工具箱首页就绪');
});
</script>
