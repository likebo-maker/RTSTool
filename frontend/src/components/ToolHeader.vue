<template>
  <section class="tool-header">
    <div class="tool-icon">
      <component :is="icon" :size="24" />
    </div>
    <div>
      <p class="section-kicker">{{ kicker }}</p>
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
    </div>
  </section>
</template>

<script setup>
defineProps({
  icon: {
    type: Object,
    required: true
  },
  kicker: {
    type: String,
    default: 'Tool Module'
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  }
});
</script>
