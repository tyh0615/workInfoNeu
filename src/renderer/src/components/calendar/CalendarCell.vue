<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import type { DayType, LogDoc } from '@shared/types'

const props = defineProps<{
  date: string | null
  isCurrentMonth: boolean
  dayType?: DayType
  log?: LogDoc
  selected: boolean
}>()

const emit = defineEmits<{ select: [date: string] }>()

const isToday = computed(() => props.date === dayjs().format('YYYY-MM-DD'))

const typeClass = computed(() => {
  switch (props.dayType) {
    case 'holiday':
      return 'cell--holiday'
    case 'makeup-workday':
      return 'cell--makeup'
    case 'weekend':
      return 'cell--weekend'
    default:
      return 'cell--workday'
  }
})

const total = computed(
  () =>
    (props.log?.todayWork.length ?? 0) +
    (props.log?.tomorrowPlan.length ?? 0) +
    (props.log?.problems.length ?? 0)
)

/** 取前两条内容作为摘要 */
const summary = computed<string[]>(() => {
  if (!props.log || total.value === 0) return []
  const all = [
    ...props.log.todayWork,
    ...props.log.tomorrowPlan,
    ...props.log.problems
  ].map((e) => e.text)
  return all.slice(0, 2).map((t) => (t.length > 12 ? `${t.slice(0, 12)}…` : t))
})
</script>

<template>
  <div
    v-if="date"
    class="cell"
    :class="[typeClass, { 'cell--current-month': isCurrentMonth, 'cell--selected': selected, 'cell--today': isToday }]"
    @click="emit('select', date)"
  >
    <div class="cell-top">
      <span class="cell-day">{{ dayjs(date).date() }}</span>
      <span v-if="total > 0" class="cell-badge">{{ total }}</span>
    </div>
    <div v-if="summary.length" class="cell-summary">
      <div v-for="(s, i) in summary" :key="i" class="cell-summary-line">{{ s }}</div>
    </div>
  </div>
  <div v-else class="cell cell--empty" />
</template>

<style scoped>
.cell {
  position: relative;
  height: 92px;
  border-radius: 6px;
  border: 1px solid transparent;
  padding: 7px 8px;
  cursor: pointer;
  user-select: none;
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow: hidden;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.cell:hover {
  border-color: var(--wl-primary);
}

.cell--empty {
  cursor: default;
  background: transparent;
}

.cell-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cell-day {
  font-size: 15px;
  font-weight: 500;
  line-height: 1.2;
}

.cell--workday {
  color: var(--wl-text);
}

.cell--holiday {
  color: var(--wl-holiday);
}

.cell--makeup {
  color: var(--wl-makeup);
}

.cell--weekend {
  color: var(--wl-weekend);
}

.cell--current-month {
  background: #fafcff;
}

.cell--selected {
  border-color: var(--wl-primary);
  background: #ecf5ff;
}

.cell--today .cell-day {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--wl-primary);
  color: #fff;
}

.cell-badge {
  flex: none;
  min-width: 20px;
  height: 18px;
  padding: 0 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: var(--wl-primary);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
}

.cell-summary {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 2px;
}

.cell-summary-line {
  font-size: 11.5px;
  line-height: 1.35;
  color: var(--wl-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cell--selected .cell-summary-line {
  color: #5a83c8;
}
</style>
