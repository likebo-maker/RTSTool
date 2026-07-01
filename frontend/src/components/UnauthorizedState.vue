<template>
  <section class="tool-page unauthorized-page">
    <div class="unauthorized-state glass-panel">
      <div class="disclaimer-mark">
        <LockKeyhole :size="28" />
      </div>
      <p class="section-kicker">{{ expired ? 'License Expired' : 'Feature Locked' }}</p>
      <h1>{{ expired ? '授权已过期' : '当前功能未授权' }}</h1>
      <p>
        {{ expired ? '授权已过期，请联系管理员更新密钥。' : '您当前的授权密钥未开放该功能，请联系管理员获取权限。' }}
      </p>
      <div class="unauthorized-feature-line">
        <span>功能名称</span>
        <strong>{{ featureName || '-' }}</strong>
      </div>
      <div class="unauthorized-machine-code">{{ machineCode || '机器码读取中...' }}</div>
      <div class="unauthorized-actions">
        <button class="ghost-button" type="button" @click="copyMachineCode">
          <Copy :size="17" />
          <span>{{ copied ? '已复制机器码' : '复制机器码' }}</span>
        </button>
        <button class="ghost-button" type="button" @click="$emit('open-license-center')">
          <ShieldCheck :size="17" />
          <span>查看授权中心</span>
        </button>
        <button class="primary-button" type="button" @click="$emit('back-home')">
          <Home :size="17" />
          <span>返回首页</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { Copy, Home, LockKeyhole, ShieldCheck } from 'lucide-vue-next';

const props = defineProps({
  featureName: {
    type: String,
    default: ''
  },
  machineCode: {
    type: String,
    default: ''
  },
  expired: {
    type: Boolean,
    default: false
  }
});

defineEmits(['back-home', 'open-license-center']);

const copied = ref(false);

async function copyMachineCode() {
  if (!props.machineCode) return;
  await navigator.clipboard.writeText(props.machineCode);
  copied.value = true;
  window.setTimeout(() => {
    copied.value = false;
  }, 1400);
}
</script>
