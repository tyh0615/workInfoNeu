import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import dayjs from 'dayjs'
import type { LogDoc, DayType } from '@shared/types'

export const useCalendarStore = defineStore('calendar', () => {
  const currentYear = ref(dayjs().year())
  const currentMonth = ref(dayjs().month() + 1) // 1-12
  const logs = shallowRef<Map<string, LogDoc>>(new Map())
  const dayTypes = shallowRef<Map<string, DayType>>(new Map())

  /** 加载某月所有日志与工作日类型 */
  async function loadMonth(year: number, month: number): Promise<void> {
    const start = dayjs(`${year}-${month}-01`)
    const startStr = start.format('YYYY-MM-DD')
    const endStr = start.endOf('month').format('YYYY-MM-DD')
    const [logDocs, types] = await Promise.all([
      window.api.log.getByRange(startStr, endStr),
      window.api.holiday.getRange(startStr, endStr)
    ])
    logs.value = new Map(logDocs.map((d) => [d.date, d]))
    dayTypes.value = new Map(types.map((t) => [t.date, t.type]))
  }

  function setMonth(year: number, month: number): void {
    currentYear.value = year
    currentMonth.value = month
    void loadMonth(year, month)
  }

  function prevMonth(): void {
    const m = dayjs(`${currentYear.value}-${currentMonth.value}-01`).subtract(1, 'month')
    setMonth(m.year(), m.month() + 1)
  }

  function nextMonth(): void {
    const m = dayjs(`${currentYear.value}-${currentMonth.value}-01`).add(1, 'month')
    setMonth(m.year(), m.month() + 1)
  }

  /** 保存成功后刷新某天的日志（更新小圆点） */
  function refreshLog(doc: LogDoc): void {
    const next = new Map(logs.value)
    next.set(doc.date, doc)
    logs.value = next
  }

  return {
    currentYear,
    currentMonth,
    logs,
    dayTypes,
    loadMonth,
    setMonth,
    prevMonth,
    nextMonth,
    refreshLog
  }
})
