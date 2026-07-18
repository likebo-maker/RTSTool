<template>
  <div ref="rootRef" class="qualification-filter-select">
    <span class="qualification-filter-label">{{ label }}</span>
    <button class="qualification-filter-trigger" type="button" @click="toggleOpen">
      <span class="qualification-filter-value">{{ displayText }}</span>
      <ChevronDown :size="16" />
    </button>

    <div v-if="isOpen" class="qualification-filter-dropdown">
      <div class="qualification-filter-dropdown-head">
        <button class="ghost-button mini" type="button" @click="close">{{ collapseLabel }}</button>
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
          <span>{{ allLabel }}</span>
          <strong>{{ normalizedAllOptions.length }}</strong>
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
          {{ emptyText }}
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
  allOptions: {
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
  },
  preserveExternalValues: {
    type: Boolean,
    default: false
  },
  collapseLabel: {
    type: String,
    default: '收起'
  },
  allLabel: {
    type: String,
    default: '全部'
  },
  emptyText: {
    type: String,
    default: '暂无可选项'
  },
  allSelectedText: {
    type: String,
    default: '全部'
  },
  unselectedText: {
    type: String,
    default: '未选择'
  },
  multiSeparator: {
    type: String,
    default: '、'
  }
});

const emit = defineEmits(['update:modelValue']);

const isOpen = ref(false);
const keyword = ref('');
const rootRef = ref(null);
const allCheckboxRef = ref(null);

const normalizedOptions = computed(() => [...new Set(props.options.filter(Boolean))]);
const normalizedAllOptions = computed(() => {
  const source = props.allOptions.length ? props.allOptions : props.options;
  return [...new Set(source.filter(Boolean))];
});
const selectedValues = computed(() => {
  return props.modelValue.filter((value) => normalizedOptions.value.includes(value));
});
const stableSelectedValues = computed(() => {
  return props.modelValue.filter((value) => normalizedAllOptions.value.includes(value));
});
const selectedSet = computed(() => new Set(stableSelectedValues.value));

const filteredOptions = computed(() => {
  if (!props.searchable || !keyword.value) return normalizedOptions.value;
  const lowerKeyword = keyword.value.toLowerCase();
  return normalizedOptions.value.filter((option) => option.toLowerCase().includes(lowerKeyword));
});

const isAllSelected = computed(() => {
  return normalizedAllOptions.value.length > 0
    && stableSelectedValues.value.length === normalizedAllOptions.value.length;
});
const isPartiallySelected = computed(() => {
  return stableSelectedValues.value.length > 0 && !isAllSelected.value;
});

const displayText = computed(() => {
  const values = stableSelectedValues.value;
  if (isAllSelected.value) return props.allSelectedText;
  if (!values.length) return props.unselectedText;
  if (values.length === 1) return values[0];
  if (values.length === 2) return values.join(props.multiSeparator);
  return `${values[0]}${props.multiSeparator}${values[1]} +${values.length - 2}`;
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
  const nextValues = event?.target?.checked ? [...normalizedAllOptions.value] : [];
  emit('update:modelValue', nextValues);
  nextTick(syncAllCheckboxState);
}

function toggleOption(option) {
  const current = new Set(stableSelectedValues.value);
  if (current.has(option)) current.delete(option);
  else current.add(option);
  emit('update:modelValue', normalizedAllOptions.value.filter((item) => current.has(item)));
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
  if (props.preserveExternalValues) return;
  if (!props.modelValue.length) return;
  if (selectedValues.value.length === props.modelValue.length) return;
  emit('update:modelValue', selectedValues.value);
}
</script>
