<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import { useCalendarStore } from '../../stores/calendarStore'
import { useLogStore } from '../../stores/logStore'
import CalendarCell from './CalendarCell.vue'

const WEEK_HEADERS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const calendarStore = useCalendarStore()
const logStore = useLogStore()

interface GridDay {
  date: string | null
  isCurrentMonth: boolean
}

const gridDays = computed<GridDay[]>(() => {
  const first = dayjs(`${calendarStore.currentYear}-${calendarStore.currentMonth}-01`)
  const daysInMonth = first.daysInMonth()
  const offset = (first.day() + 6) % 7 // 周一开头
  const cells = Math.ceil((offset + daysInMonth) / 7) * 7
  const result: GridDay[] = []
  for (let i = 0; i < cells; i++) {
    const dayNum = i - offset + 1
    if (dayNum < 1 || dayNum > daysInMonth) {
      result.push({ date: null, isCurrentMonth: false })
    } else {
      result.push({
        date: first.date(dayNum).format('YYYY-MM-DD'),
        isCurrentMonth: true
      })
    }
  }
  return result
})

function onSelect(date: string): void {
  void logStore.selectDate(date)
}
</script>

<template>
  <div class="calendar">
    <div class="wl-grid week-header">
      <div v-for="w in WEEK_HEADERS" :key="w" class="week-header-item">{{ w }}</div>
    </div>
    <div class="wl-grid">
      <CalendarCell
        v-for="(day, i) in gridDays"
        :key="day.date ?? `pad-${i}`"
        :date="day.date"
        :is-current-month="day.isCurrentMonth"
        :day-type="day.date ? calendarStore.dayTypes.get(day.date) : undefined"
        :log="day.date ? calendarStore.logs.get(day.date) : undefined"
        :selected="day.date === logStore.selectedDate"
        @select="onSelect"
      />
    </div>
  </div>
</template>

<style scoped>
.calendar {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  background: var(--wl-surface);
  border-radius: 8px;
  border: 1px solid var(--wl-border);
}

.week-header-item {
  text-align: center;
  font-size: 12px;
  color: var(--wl-text-secondary);
  padding: 4px 0;
}
</style>
