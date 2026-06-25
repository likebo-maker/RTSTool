<template>
  <header class="top-bar">
    <div class="top-title">
      <div class="logo-orbit">
        <Activity :size="20" />
      </div>
      <div>
        <strong>RTS工程师效率工具箱</strong>
        <span>RTS Technical Support Platform</span>
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
import { Activity, Moon, ShieldCheck } from 'lucide-vue-next';

defineEmits(['show-disclaimer']);

const props = defineProps({
  licenseInfo: {
    type: Object,
    default: () => ({})
  }
});

const licenseSummaryText = computed(() => {
  if (!props.licenseInfo) return '';
  if (props.licenseInfo.enabled === false) return 'macOS 免授权';
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
  if (props.licenseInfo.status !== 'active') return '';
  return `授权人：${props.licenseInfo.license_user || '-'}\n部门：${props.licenseInfo.department || '-'}\n版本：${props.licenseInfo.version || '-'}\n到期日：${props.licenseInfo.expire_date || '-'}\n剩余天数：${props.licenseInfo.remaining_days ?? '-'} 天`;
});
</script>
