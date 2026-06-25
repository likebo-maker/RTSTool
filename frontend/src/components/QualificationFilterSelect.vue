<template>
  <div ref="rootRef" class="qualification-filter-select">
    <span class="qualification-filter-label">{{ label }}</span>
    <button class="qualification-filter-trigger" type="button" @click="toggleOpen">
      <span class="qualification-filter-value">{{ displayText }}</span>
      <ChevronDown :size="16" />
    </button>

    <div v-if="isOpen" class="qualification-filter-dropdown">
      <div class="qualification-filter-dropdown-head">
        <button class="ghost-button mini" type="button" @click="close">收起</button>
      </div>

      <input
        v-if="searchable"
        v-model.trim="keyword"
        class="qualification-filter-search"
        type="text"
        :placeholder="searchPlaceholder"
      />

      <div class="qualification-filter-option-list">
        <label class="qualification-filter-option qualification-filter-option-all">
          <input
            ref="allCheckboxRef"
            :checked="isAllSelected"
            type="checkbox"
            @change="selectAll"
          />
          <span>全部</span>
        </label>

        <label
          v-for="option in filteredOptions"
          :key="option"
          class="qualification-filter-option"
        >
          <input :checked="modelValue.includes(option)" type="checkbox" @change="toggleOption(option)" />
          <span>{{ option }}</span>
        </label>

        <div v-if="!filteredOptions.length" class="qualification-filter-empty">
          暂无可选项
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ChevronDown } from 'lucide-vue-next';

const props = defineProps({
  label: {
    type: String,
    required: true
  },
  modelValue: {
    type: Array,
    default: () => []
  },
  options: {
    type: Array,
    default: () => []
  },
  searchable: {
    type: Boolean,
    default: false
  },
  searchPlaceholder: {
    type: String,
    default: '输入关键字搜索'
  }
});

const emit = defineEmits(['update:modelValue']);

const isOpen = ref(false);
const keyword = ref('');
const rootRef = ref(null);
const allCheckboxRef = ref(null);

const filteredOptions = computed(() => {
  if (!props.searchable || !keyword.value) return props.options;
  const lowerKeyword = keyword.value.toLowerCase();
  return props.options.filter((option) => option.toLowerCase().includes(lowerKeyword));
});

const isAllSelected = computed(() => !props.modelValue.length || props.modelValue.length === props.options.length);
const isPartiallySelected = computed(() => props.modelValue.length > 0 && props.modelValue.length < props.options.length);

const displayText = computed(() => {
  if (!props.modelValue.length) return '全部';
  if (props.modelValue.length === 1) return props.modelValue[0];
  return `已选 ${props.modelValue.length} 项`;
});

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  syncAllCheckboxState();
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});

watch([() => props.modelValue, () => props.options], async () => {
  await nextTick();
  syncAllCheckboxState();
}, { deep: true });

function toggleOpen() {
  isOpen.value = !isOpen.value;
}

function close() {
  isOpen.value = false;
}

function clearSelection() {
  emit('update:modelValue', []);
}

function selectAll() {
  clearSelection();
}

function toggleOption(option) {
  const current = new Set(props.modelValue);
  if (current.has(option)) current.delete(option);
  else current.add(option);
  emit('update:modelValue', [...current]);
}

function handleClickOutside(event) {
  if (!rootRef.value?.contains(event.target)) {
    close();
  }
}

function syncAllCheckboxState() {
  if (!allCheckboxRef.value) return;
  allCheckboxRef.value.indeterminate = isPartiallySelected.value;
}
</script>
