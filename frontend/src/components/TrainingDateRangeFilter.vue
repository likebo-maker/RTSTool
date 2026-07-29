<template>
  <div class="training-date-range-filter">
    <span class="training-date-range-label">{{ label }}</span>
    <div class="training-date-range-controls">
      <input
        :value="startDate"
        type="date"
        :min="minimum"
        :max="endDate || maximum"
        :aria-label="startLabel"
        @input="$emit('update:startDate', $event.target.value)"
      />
      <span>to</span>
      <input
        :value="endDate"
        type="date"
        :min="startDate || minimum"
        :max="maximum"
        :aria-label="endLabel"
        @input="$emit('update:endDate', $event.target.value)"
      />
    </div>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, default: 'Settlement Date' },
  startLabel: { type: String, default: 'Settlement date from' },
  endLabel: { type: String, default: 'Settlement date to' },
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' },
  minimum: { type: String, default: '' },
  maximum: { type: String, default: '' }
});

defineEmits(['update:startDate', 'update:endDate']);
</script>
