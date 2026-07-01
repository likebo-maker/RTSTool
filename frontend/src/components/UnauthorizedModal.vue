<template>
  <Transition name="disclaimer-fade">
    <div v-if="visible" class="disclaimer-backdrop" @click.self="$emit('close')">
      <section class="unauthorized-modal" role="dialog" aria-modal="true" aria-labelledby="unauthorized-title">
        <div class="disclaimer-header">
          <div class="disclaimer-mark">
            <LockKeyhole :size="24" />
          </div>
          <div>
            <h2 id="unauthorized-title">当前功能未授权</h2>
            <p>您当前的授权密钥未开放该功能，请联系管理员获取权限。</p>
          </div>
        </div>

        <div class="unauthorized-content">
          <span>功能名称</span>
          <strong>{{ featureName || '-' }}</strong>
          <small>机器码：{{ machineCode || '读取中...' }}</small>
        </div>

        <div class="disclaimer-actions">
          <button class="ghost-button disclaimer-button" type="button" @click="copyMachineCode">
            <Copy :size="17" />
            <span>{{ copied ? '已复制机器码' : '复制机器码' }}</span>
          </button>
          <button class="ghost-button disclaimer-button" type="button" @click="$emit('open-license-center')">
            <ShieldCheck :size="17" />
            <span>查看授权中心</span>
          </button>
          <button class="primary-button disclaimer-button" type="button" @click="$emit('close')">
            <X :size="17" />
            <span>关闭</span>
          </button>
        </div>
      </section>
    </div>
  </Transition>
</template>

<script setup>
import { ref } from 'vue';
import { Copy, LockKeyhole, ShieldCheck, X } from 'lucide-vue-next';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  featureName: {
    type: String,
    default: ''
  },
  machineCode: {
    type: String,
    default: ''
  }
});

defineEmits(['close', 'open-license-center']);

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
