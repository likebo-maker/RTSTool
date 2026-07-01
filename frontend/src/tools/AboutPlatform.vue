<template>
  <div class="tool-page about-platform-page">
    <section class="tool-header about-platform-header">
      <img class="about-platform-logo" :src="brandConfig.logoFull" :alt="brandConfig.appNameCn" />
      <div>
        <p class="section-kicker">{{ brandConfig.appNameEn }}</p>
        <h1>{{ brandConfig.appNameCn }}</h1>
        <p>{{ brandConfig.platformIntro }}</p>
      </div>
    </section>

    <section class="glass-panel about-platform-panel">
      <div>
        <p class="section-kicker">Platform Overview</p>
        <h2>平台说明</h2>
      </div>
      <p>
        技术支持效率平台面向技术支持团队，集工单处理、业务数据分析、服务资质管理、培训发展管理和智能辅助能力于一体，帮助团队提升数据处理效率、管理可视化能力和服务运营质量。
      </p>
    </section>

    <section class="glass-panel about-platform-panel">
      <div>
        <p class="section-kicker">Core Capabilities</p>
        <h2>核心能力</h2>
      </div>
      <div class="about-capability-grid">
        <article v-for="item in capabilities" :key="item.label" class="about-capability-card">
          <component :is="item.icon" :size="20" />
          <span>{{ item.label }}</span>
        </article>
      </div>
    </section>

    <section class="system-status-panel">
      <div class="system-status-item">
        <BadgeInfo :size="18" />
        <span>版本：</span>
        <strong>{{ brandConfig.version }}</strong>
      </div>
      <div class="system-status-item">
        <ShieldCheck :size="18" />
        <span>开发团队：</span>
        <strong>{{ brandConfig.poweredBy }}</strong>
      </div>
    </section>
  </div>
</template>

<script setup>
import {
  BadgeInfo,
  BarChart3,
  Bot,
  ClipboardList,
  GraduationCap,
  KeyRound,
  MapPinned,
  ShieldCheck
} from 'lucide-vue-next';
import { brandConfig } from '../config/brandConfig';

const capabilities = [
  { label: '工单处理', icon: ClipboardList },
  { label: '数据分析', icon: BarChart3 },
  { label: '服务资质地图', icon: MapPinned },
  { label: '培训覆盖地图', icon: GraduationCap },
  { label: 'E课堂数据处理', icon: GraduationCap },
  { label: '授权管理', icon: KeyRound },
  { label: '智能辅助', icon: Bot }
];
</script>
