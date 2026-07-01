<template>
  <div class="tool-page home-page">
    <section class="home-hero">
      <div class="home-hero-copy">
        <div class="home-brand-row">
          <img class="home-brand-logo" :src="brandConfig.logoMark" :alt="brandConfig.appShortName" />
          <div>
            <p class="section-kicker">{{ brandConfig.appNameEn.toUpperCase() }}</p>
            <h1>{{ brandConfig.appNameCn }}</h1>
          </div>
        </div>
        <p>{{ brandConfig.tagline }}</p>
        <p>{{ brandConfig.platformIntro }}</p>
      </div>
      <button
        class="primary-button home-primary-action"
        :class="{ locked: !timeoutAuthorized }"
        type="button"
        @click="openTimeoutTool"
      >
        <LockKeyhole v-if="!timeoutAuthorized" :size="18" />
        <TimerReset v-else :size="18" />
        <span>{{ timeoutAuthorized ? '快速进入超时工单筛选' : '超时工单筛选未授权' }}</span>
      </button>
    </section>

    <section class="home-section">
      <div class="home-section-title">
        <p class="section-kicker">Available Tools</p>
        <h2>当前已上线工具</h2>
      </div>

      <article
        v-for="tool in availableTools"
        :key="tool.key"
        class="featured-tool-card"
        :class="{ locked: !tool.authorized }"
        @click="openTool(tool.key)"
      >
        <LockKeyhole v-if="!tool.authorized" class="featured-tool-lock" :size="17" />
        <div class="featured-tool-icon">
          <component :is="tool.icon" :size="30" />
        </div>
        <div class="featured-tool-copy">
          <div class="tool-title-row">
            <h3>{{ tool.name }}</h3>
            <span class="tool-status" :class="tool.authorized ? 'online' : 'locked'">
              {{ toolStatusText(tool) }}
            </span>
          </div>
          <p>{{ tool.description }}</p>
        </div>
        <button class="primary-button compact" type="button" @click.stop="openTool(tool.key)">
          <LockKeyhole v-if="!tool.authorized" :size="17" />
          <ArrowRight v-else :size="17" />
          <span>{{ tool.authorized ? '立即使用' : '申请开通' }}</span>
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
        <strong>本地服务正常</strong>
      </div>
      <div class="system-status-item">
        <ShieldCheck :size="18" />
        <span>授权状态：</span>
        <strong>{{ licenseStatusText }}</strong>
      </div>
      <div class="system-status-item">
        <BadgeInfo :size="18" />
        <span>当前版本：</span>
        <strong>{{ brandConfig.version }}</strong>
      </div>
      <div class="system-status-item">
        <BadgeInfo :size="18" />
        <strong>{{ brandConfig.poweredBy }}</strong>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import {
  ArrowRight,
  BadgeInfo,
  Calculator,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  LockKeyhole,
  MapPinned,
  Presentation,
  ShieldCheck,
  TimerReset,
  Wrench
} from 'lucide-vue-next';
import { brandConfig } from '../config/brandConfig';
import { hasToolAccess, isLicenseExpired } from '../utils/licenseFeatures';

const emit = defineEmits(['select-tool', 'status-change']);

const props = defineProps({
  licenseInfo: {
    type: Object,
    default: () => ({})
  }
});

const baseTools = [
  {
    key: 'timeout-ticket-filter',
    name: '超时工单筛选',
    description: '上传工单报表与质量上升报表，自动筛选超时工单。',
    icon: TimerReset
  },
  {
    key: 'online-business-calculation',
    name: '在线服务项目目标',
    description: '上传 MCC热线、视频工单、MSP工单、IVD客户群数据，自动生成在线服务项目目标结果。',
    icon: Calculator
  },
  {
    key: 'online-service-assessment',
    name: '在线服务考核指标',
    description: '上传 MSP、MCC通话、视频服务、MCC热线等数据，自动生成在线服务考核指标计算结果。',
    icon: ClipboardCheck
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
  },
  {
    key: 'eclass-data',
    name: 'E课堂数据处理',
    description: '处理 E课堂学习数据，生成培训学习统计结果。',
    icon: GraduationCap
  }
];

const plannedTools = [
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

const availableTools = computed(() => baseTools.map((tool) => ({
  ...tool,
  authorized: hasToolAccess(props.licenseInfo, tool.key)
})));

const timeoutAuthorized = computed(() => hasToolAccess(props.licenseInfo, 'timeout-ticket-filter'));
const expired = computed(() => isLicenseExpired(props.licenseInfo));
const licenseStatusText = computed(() => {
  if (props.licenseInfo?.enabled === false) return '已授权';
  if (props.licenseInfo?.status === 'active') return '已授权';
  if (props.licenseInfo?.status === 'expired') return '授权已过期';
  return '未激活';
});

function openTool(toolKey) {
  emit('select-tool', toolKey);
}

function openTimeoutTool() {
  openTool('timeout-ticket-filter');
}

function toolStatusText(tool) {
  if (expired.value) return '授权已过期';
  return tool.authorized ? '已上线' : '未授权';
}

onMounted(() => {
  emit('status-change', '平台首页就绪');
});
</script>
