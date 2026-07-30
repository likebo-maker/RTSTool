<template>
  <div ref="rootRef" class="training-date-range-filter">
    <span class="training-date-range-label">{{ label }}</span>
    <div class="training-date-range-controls">
      <div class="training-date-picker" :class="{ open: openField === 'start' }">
        <button
          class="training-date-trigger"
          type="button"
          :aria-label="startLabel"
          :aria-expanded="openField === 'start'"
          @click="openPicker('start')"
        >
          <span :class="{ placeholder: !startDate }">{{ formatDisplayDate(startDate) }}</span>
          <CalendarDays :size="16" />
        </button>
        <CalendarPopover
          v-if="openField === 'start'"
          :calendar-days="calendarDays"
          :weekday-labels="weekdayLabels"
          :year-options="yearOptions"
          :month-options="monthOptions"
          :visible-year="visibleYear"
          :visible-month="visibleMonthIndex"
          :choose-date-label="chooseDateText"
          :year-select-label="yearSelectLabel"
          :month-select-label="monthSelectLabel"
          :can-move-previous="canMovePrevious"
          :can-move-next="canMoveNext"
          :selected-date="startDate"
          @move-month="moveMonth"
          @select-year="selectYear"
          @select-month="selectMonth"
          @select-day="selectDay"
        />
      </div>

      <span>{{ separator }}</span>

      <div class="training-date-picker end" :class="{ open: openField === 'end' }">
        <button
          class="training-date-trigger"
          type="button"
          :aria-label="endLabel"
          :aria-expanded="openField === 'end'"
          @click="openPicker('end')"
        >
          <span :class="{ placeholder: !endDate }">{{ formatDisplayDate(endDate) }}</span>
          <CalendarDays :size="16" />
        </button>
        <CalendarPopover
          v-if="openField === 'end'"
          align-end
          :calendar-days="calendarDays"
          :weekday-labels="weekdayLabels"
          :year-options="yearOptions"
          :month-options="monthOptions"
          :visible-year="visibleYear"
          :visible-month="visibleMonthIndex"
          :choose-date-label="chooseDateText"
          :year-select-label="yearSelectLabel"
          :month-select-label="monthSelectLabel"
          :can-move-previous="canMovePrevious"
          :can-move-next="canMoveNext"
          :selected-date="endDate"
          @move-month="moveMonth"
          @select-year="selectYear"
          @select-month="selectMonth"
          @select-day="selectDay"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref } from 'vue';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-vue-next';

const props = defineProps({
  label: { type: String, default: 'Time' },
  startLabel: { type: String, default: 'Time From' },
  endLabel: { type: String, default: 'Time To' },
  separator: { type: String, default: 'to' },
  locale: { type: String, default: 'en-US' },
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' },
  minimum: { type: String, default: '' },
  maximum: { type: String, default: '' }
});

const emit = defineEmits(['update:startDate', 'update:endDate']);
const rootRef = ref(null);
const openField = ref('');
const visibleMonth = ref(startOfMonth(new Date()));

const activeMinimum = computed(() => (
  openField.value === 'end' ? props.startDate || props.minimum : props.minimum
));
const activeMaximum = computed(() => (
  openField.value === 'start' ? props.endDate || props.maximum : props.maximum
));
const isChinese = computed(() => props.locale.toLowerCase().startsWith('zh'));
const chooseDateText = computed(() => isChinese.value ? '选择日期' : 'Choose date');
const yearSelectLabel = computed(() => isChinese.value ? '选择年份' : 'Select year');
const monthSelectLabel = computed(() => isChinese.value ? '选择月份' : 'Select month');
const weekdayLabels = computed(() => (
  isChinese.value
    ? ['一', '二', '三', '四', '五', '六', '日']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
));
const visibleYear = computed(() => visibleMonth.value.getUTCFullYear());
const visibleMonthIndex = computed(() => visibleMonth.value.getUTCMonth());
const yearOptions = computed(() => {
  const minimum = parseDate(activeMinimum.value);
  const maximum = parseDate(activeMaximum.value);
  const startYear = minimum?.getUTCFullYear() ?? visibleYear.value - 10;
  const endYear = maximum?.getUTCFullYear() ?? visibleYear.value + 10;
  return Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index);
});
const monthOptions = computed(() => {
  const formatter = new Intl.DateTimeFormat(props.locale, {
    month: 'long',
    timeZone: 'UTC'
  });
  const minimum = parseDate(activeMinimum.value);
  const maximum = parseDate(activeMaximum.value);
  return Array.from({ length: 12 }, (_, month) => {
    const candidateKey = visibleYear.value * 12 + month;
    return {
      value: month,
      label: formatter.format(new Date(Date.UTC(2024, month, 1))),
      disabled: Boolean(minimum && candidateKey < monthKey(minimum))
        || Boolean(maximum && candidateKey > monthKey(maximum))
    };
  });
});
const canMovePrevious = computed(() => canMoveToMonth(-1));
const canMoveNext = computed(() => canMoveToMonth(1));
const calendarDays = computed(() => {
  const year = visibleMonth.value.getUTCFullYear();
  const month = visibleMonth.value.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, month, 1));
  const mondayOffset = (firstDay.getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(year, month, 1 - mondayOffset));
  const today = formatDate(new Date());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getTime() + index * 86400000);
    const value = formatDate(date);
    const outside = date.getUTCMonth() !== month;
    return {
      value,
      label: date.getUTCDate(),
      outside,
      today: value === today,
      disabled: outside
        || Boolean(activeMinimum.value && value < activeMinimum.value)
        || Boolean(activeMaximum.value && value > activeMaximum.value)
    };
  });
});

const CalendarPopover = defineComponent({
  name: 'TrainingCalendarPopover',
  props: {
    alignEnd: { type: Boolean, default: false },
    calendarDays: { type: Array, required: true },
    weekdayLabels: { type: Array, required: true },
    yearOptions: { type: Array, required: true },
    monthOptions: { type: Array, required: true },
    visibleYear: { type: Number, required: true },
    visibleMonth: { type: Number, required: true },
    chooseDateLabel: { type: String, required: true },
    yearSelectLabel: { type: String, required: true },
    monthSelectLabel: { type: String, required: true },
    canMovePrevious: { type: Boolean, default: true },
    canMoveNext: { type: Boolean, default: true },
    selectedDate: { type: String, default: '' }
  },
  emits: ['move-month', 'select-year', 'select-month', 'select-day'],
  setup(calendarProps, { emit: calendarEmit }) {
    return () => h('div', {
      class: ['training-calendar-popover', { 'align-end': calendarProps.alignEnd }],
      role: 'dialog',
      'aria-label': calendarProps.chooseDateLabel
    }, [
      h('div', { class: 'training-calendar-head' }, [
        h('button', {
          type: 'button',
          disabled: !calendarProps.canMovePrevious,
          'aria-label': 'Previous month',
          onClick: () => calendarEmit('move-month', -1)
        }, [h(ChevronLeft, { size: 17 })]),
        h('div', { class: 'training-calendar-direct-selects' }, [
          h('select', {
            value: calendarProps.visibleYear,
            'aria-label': calendarProps.yearSelectLabel,
            onChange: (event) => calendarEmit('select-year', Number(event.target.value))
          }, calendarProps.yearOptions.map((year) => h('option', {
            key: year,
            value: year
          }, String(year)))),
          h('select', {
            value: calendarProps.visibleMonth,
            'aria-label': calendarProps.monthSelectLabel,
            onChange: (event) => calendarEmit('select-month', Number(event.target.value))
          }, calendarProps.monthOptions.map((month) => h('option', {
            key: month.value,
            value: month.value,
            disabled: month.disabled
          }, month.label)))
        ]),
        h('button', {
          type: 'button',
          disabled: !calendarProps.canMoveNext,
          'aria-label': 'Next month',
          onClick: () => calendarEmit('move-month', 1)
        }, [h(ChevronRight, { size: 17 })])
      ]),
      h('div', { class: 'training-calendar-weekdays' }, calendarProps.weekdayLabels.map((label) => h('span', label))),
      h('div', { class: 'training-calendar-days' }, calendarProps.calendarDays.map((day) => h('button', {
        key: day.value,
        type: 'button',
        disabled: day.disabled,
        class: {
          outside: day.outside,
          today: day.today,
          selected: day.value === calendarProps.selectedDate
        },
        'aria-label': day.value,
        onClick: () => calendarEmit('select-day', day.value)
      }, String(day.label))))
    ]);
  }
});

function openPicker(field) {
  if (openField.value === field) {
    openField.value = '';
    return;
  }
  openField.value = field;
  const preferredDate = field === 'start'
    ? props.startDate || props.minimum || props.endDate || props.maximum
    : props.endDate || props.maximum || props.startDate || props.minimum;
  visibleMonth.value = startOfMonth(parseDate(preferredDate) || new Date());
}

function selectDay(value) {
  if (openField.value === 'start') emit('update:startDate', value);
  if (openField.value === 'end') emit('update:endDate', value);
  openField.value = '';
}

function moveMonth(offset) {
  if (!canMoveToMonth(offset)) return;
  visibleMonth.value = new Date(Date.UTC(
    visibleMonth.value.getUTCFullYear(),
    visibleMonth.value.getUTCMonth() + offset,
    1
  ));
}

function selectYear(year) {
  setVisibleMonth(year, visibleMonthIndex.value);
}

function selectMonth(month) {
  setVisibleMonth(visibleYear.value, month);
}

function setVisibleMonth(year, month) {
  const minimum = parseDate(activeMinimum.value);
  const maximum = parseDate(activeMaximum.value);
  let targetKey = year * 12 + month;
  if (minimum) targetKey = Math.max(targetKey, monthKey(minimum));
  if (maximum) targetKey = Math.min(targetKey, monthKey(maximum));
  visibleMonth.value = new Date(Date.UTC(
    Math.floor(targetKey / 12),
    targetKey % 12,
    1
  ));
}

function canMoveToMonth(offset) {
  const candidate = new Date(Date.UTC(
    visibleMonth.value.getUTCFullYear(),
    visibleMonth.value.getUTCMonth() + offset,
    1
  ));
  const candidateKey = monthKey(candidate);
  const minimum = parseDate(activeMinimum.value);
  const maximum = parseDate(activeMaximum.value);
  if (minimum && candidateKey < monthKey(minimum)) return false;
  if (maximum && candidateKey > monthKey(maximum)) return false;
  return true;
}

function handleDocumentPointerDown(event) {
  if (rootRef.value?.contains(event.target)) return;
  openField.value = '';
}

function handleDocumentKeyDown(event) {
  if (event.key === 'Escape') openField.value = '';
}

function formatDisplayDate(value) {
  return value ? value.replaceAll('-', '/') : 'YYYY/MM/DD';
}

function parseDate(value) {
  const matched = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!matched) return null;
  return new Date(Date.UTC(Number(matched[1]), Number(matched[2]) - 1, Number(matched[3])));
}

function startOfMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function monthKey(date) {
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
}

function formatDate(date) {
  return [
    String(date.getUTCFullYear()).padStart(4, '0'),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0')
  ].join('-');
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown);
  document.addEventListener('keydown', handleDocumentKeyDown);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown);
  document.removeEventListener('keydown', handleDocumentKeyDown);
});
</script>
