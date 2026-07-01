<template>
  <Transition name="disclaimer-fade">
    <div v-if="visible" class="operation-backdrop" aria-live="assertive">
      <section class="operation-modal" role="status" aria-modal="true">
        <div class="operation-icon">
          <LoaderCircle class="spin" :size="30" />
        </div>
        <div>
          <p class="section-kicker">{{ kicker }}</p>
          <h2>{{ title }}</h2>
          <p>{{ message }}</p>
        </div>
      </section>
    </div>
  </Transition>
</template>

<script setup>
import { LoaderCircle } from 'lucide-vue-next';

defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  kicker: {
    type: String,
    default: 'Please Wait'
  },
  title: {
    type: String,
    default: '正在处理'
  },
  message: {
    type: String,
    default: '请稍候，当前操作完成前不要重复点击。'
  }
});
</script>
