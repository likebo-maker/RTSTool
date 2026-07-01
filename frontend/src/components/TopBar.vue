<template>
  <header class="top-bar">
    <div class="top-title">
      <div class="logo-orbit image-logo top-logo">
        <img :src="brandConfig.logoMark" :alt="brandConfig.appShortName" />
      </div>
      <div>
        <strong>{{ brandConfig.appNameCn }}</strong>
        <span>{{ brandConfig.appNameEn }}</span>
      </div>
    </div>

    <div class="top-actions">
      <div v-if="licenseSummaryText" class="license-summary-chip" :title="licenseDetailText">
        <ShieldCheck :size="15" />
        <span>{{ licenseSummaryText }}</span>
      </div>
      <button
        class="security-entry-button"
        type="button"
        @click="$emit('show-license-center')"
      >
        授权中心
      </button>
      <button
        class="security-entry-button"
        type="button"
        @click="$emit('show-disclaimer')"
      >
        信息安全声明
      </button>
      <div class="theme-chip" aria-label="当前为深色模式">
        <Moon :size="16" />
        <span>深色模式</span>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import { Moon, ShieldCheck } from 'lucide-vue-next';
import { brandConfig } from '../config/brandConfig';

defineEmits(['show-disclaimer', 'show-license-center']);

const props = defineProps({
  licenseInfo: {
    type: Object,
    default: () => ({})
  }
});

const licenseSummaryText = computed(() => {
  if (!props.licenseInfo) return '';
  if (props.licenseInfo.enabled === false) return 'macOS 免授权';
  if (props.licenseInfo.status === 'expired') return '授权已过期';
  if (props.licenseInfo.status !== 'active') return '';
  const user = props.licenseInfo.license_user || '已授权';
  const version = props.licenseInfo.version || '-';
  return `${user}｜${version}`;
});

const licenseDetailText = computed(() => {
  if (!props.licenseInfo) return '';
  if (props.licenseInfo.enabled === false) {
    return '当前设备为 macOS，未启用注册码校验';
  }
  if (props.licenseInfo.status === 'expired') {
    return `授权已过期\n机器码：${props.licenseInfo.machine_code || '-'}`;
  }
  if (props.licenseInfo.status !== 'active') return '';
  return `授权人：${props.licenseInfo.license_user || '-'}\n部门：${props.licenseInfo.department || '-'}\n版本：${props.licenseInfo.version || '-'}\n到期日：${props.licenseInfo.expire_date || '-'}\n剩余天数：${props.licenseInfo.remaining_days ?? '-'} 天`;
});
</script>
