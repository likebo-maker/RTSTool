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
            @change="toggleAll"
          />
          <span>全部</span>
          <strong>{{ normalizedOptions.length }}</strong>
        </label>

        <label
          v-for="option in filteredOptions"
          :key="option"
          class="qualification-filter-option"
        >
          <input :checked="selectedSet.has(option)" type="checkbox" @change="toggleOption(option)" />
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

const normalizedOptions = computed(() => [...new Set(props.options.filter(Boolean))]);
const selectedValues = computed(() => props.modelValue.filter((value) => normalizedOptions.value.includes(value)));
const selectedSet = computed(() => new Set(selectedValues.value));

const filteredOptions = computed(() => {
  if (!props.searchable || !keyword.value) return normalizedOptions.value;
  const lowerKeyword = keyword.value.toLowerCase();
  return normalizedOptions.value.filter((option) => option.toLowerCase().includes(lowerKeyword));
});

const isAllSelected = computed(() => normalizedOptions.value.length > 0 && selectedValues.value.length === normalizedOptions.value.length);
const isPartiallySelected = computed(() => selectedValues.value.length > 0 && selectedValues.value.length < normalizedOptions.value.length);

const displayText = computed(() => {
  const values = selectedValues.value;
  if (isAllSelected.value) return '全部';
  if (!values.length) return '未选择';
  if (values.length === 1) return values[0];
  if (values.length === 2) return values.join('、');
  return `${values[0]}、${values[1]} +${values.length - 2}`;
});

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  syncAllCheckboxState();
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});

watch([() => props.modelValue, normalizedOptions], async () => {
  await nextTick();
  pruneInvalidValues();
  syncAllCheckboxState();
}, { deep: true });

function toggleOpen() {
  isOpen.value = !isOpen.value;
}

function close() {
  isOpen.value = false;
}

function toggleAll(event) {
  emit('update:modelValue', event.target.checked ? [...normalizedOptions.value] : []);
}

function toggleOption(option) {
  const current = new Set(selectedValues.value);
  if (current.has(option)) current.delete(option);
  else current.add(option);
  emit('update:modelValue', normalizedOptions.value.filter((item) => current.has(item)));
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

function pruneInvalidValues() {
  if (selectedValues.value.length === props.modelValue.length) return;
  emit('update:modelValue', selectedValues.value);
}
</script>
