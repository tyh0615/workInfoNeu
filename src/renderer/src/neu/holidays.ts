/**
 * 工作日判定（前端版）
 * 节假日数据从 resources/data/holidays/*.json 加载（随应用资源打包）。
 * 逻辑与原 Electron 主进程 holidayService.ts 一致。
 */
import type { DayType, HolidayYearData } from '@shared/types'

let holidaysSet = new Set<string>()
let workdaysSet = new Set<string>()
const YEAR_DATA: HolidayYearData[] = []

/** 加载并汇总节假日数据（应用启动时调用一次） */
export async function initHolidays(): Promise<void> {
  const years = [2026, 2027]
  for (const year of years) {
    const res = await fetch(`data/holidays/${year}.json`)
    if (!res.ok) continue
    const data = (await res.json()) as HolidayYearData
    YEAR_DATA.push(data)
    for (const d of data.holidays) holidaysSet.add(d)
    for (const d of data.workdays) workdaysSet.add(d)
  }
}

export function getHolidayMeta(year: number): { status: HolidayYearData['status']; source: string } | null {
  const item = YEAR_DATA.find((y) => y.year === year)
  return item ? { status: item.status, source: item.source } : null
}

/** 某天是否为法定工作日（周一至周五且非节假日，或周末补班） */
export function isWorkday(date: string): boolean {
  const d = new Date(`${date}T00:00:00`)
  const weekday = d.getDay()
  const isWeekday = weekday >= 1 && weekday <= 5
  if (isWeekday && !holidaysSet.has(date)) return true
  if ((weekday === 0 || weekday === 6) && workdaysSet.has(date)) return true
  return false
}

/** 某天的工作日类型 */
export function getDayType(date: string): DayType {
  const d = new Date(`${date}T00:00:00`)
  const weekday = d.getDay()
  if (holidaysSet.has(date)) return 'holiday'
  if (workdaysSet.has(date)) return 'makeup-workday'
  if (weekday === 0 || weekday === 6) return 'weekend'
  return 'workday'
}

/** 闭区间 [start, end] 内每一天的类型 */
export function getDayTypesInRange(start: string, end: string): Array<{ date: string; type: DayType }> {
  const result: Array<{ date: string; type: DayType }> = []
  let cursor = new Date(`${start}T00:00:00`)
  const endDate = new Date(`${end}T00:00:00`)
  let guard = 0
  while (cursor <= endDate && guard < 10000) {
    const date = toDateKey(cursor)
    result.push({ date, type: getDayType(date) })
    cursor.setDate(cursor.getDate() + 1)
    guard++
  }
  return result
}

function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
