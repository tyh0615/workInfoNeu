/**
 * 附件分类 → 工作日日期范围工具
 *
 * 每个分类对应"该月内的一段日期":
 *   - week1: 当月 1-7
 *   - week2: 当月 8-14
 *   - week3: 当月 15-21
 *   - week4: 当月 22 至月末
 *   - monthly: 当月 1 至月末
 *
 * 工作日判定复用 holidays.isWorkday（周一至周五且非法定假日，已含周末调休处理）。
 * 显示格式遵循用户约定 "M.DD-M.DD（工作日）"，例如 8.10-8.14（工作日）。
 * 跨月、跨年、2 月平年（28 天）/ 闰年（29 天）、月末溢出等情形均通过 daysInMonth 自然处理。
 */
import type { AttachmentCategory } from '@shared/types'
import { isWorkday } from '../neu/holidays'

export interface WeekRangeInfo {
  /** 分类对应的起止日（含周末，YYYY-MM-DD） */
  startDate: string
  endDate: string
  /** 范围内的工作日列表（YYYY-MM-DD） */
  workdays: string[]
  /** 简短显示文本，例如 "8.10-8.14（工作日）" */
  shortLabel: string
}

function daysInMonth(year: number, month: number): number {
  // new Date(year, month, 0) 取当月第 0 天 = 上月最后一天，自动处理平/闰年
  return new Date(year, month, 0).getDate()
}

function toKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 计算某分类在指定年月的起止日（含周末边界） */
function boundary(category: AttachmentCategory, year: number, month: number): { start: Date; end: Date } {
  if (category === 'monthly') {
    return {
      start: new Date(year, month - 1, 1),
      end: new Date(year, month - 1, daysInMonth(year, month))
    }
  }
  const w = Number(category.slice(4)) // week1 -> 1, week4 -> 4
  const startDay = (w - 1) * 7 + 1
  const endDay = Math.min(w * 7, daysInMonth(year, month))
  return {
    start: new Date(year, month - 1, startDay),
    end: new Date(year, month - 1, endDay)
  }
}

/** "YYYY-MM-DD" → "M.DD"（保留用户示例中的去前导零样式） */
function formatMMDD(dateKey: string): string {
  const [, m, d] = dateKey.split('-')
  return `${Number(m)}.${d}`
}

export function getWeekRange(category: AttachmentCategory, year: number, month: number): WeekRangeInfo {
  const { start, end } = boundary(category, year, month)
  const workdays: string[] = []
  const cur = new Date(start)
  while (cur <= end) {
    const k = toKey(cur)
    if (isWorkday(k)) workdays.push(k)
    cur.setDate(cur.getDate() + 1)
  }
  const startDate = toKey(start)
  const endDate = toKey(end)
  let shortLabel: string
  if (workdays.length === 0) {
    shortLabel = `${formatMMDD(startDate)}-${formatMMDD(endDate)}（无工作日）`
  } else if (workdays.length === 1) {
    shortLabel = `${formatMMDD(workdays[0])}（仅 1 个工作日）`
  } else {
    shortLabel = `${formatMMDD(workdays[0])}-${formatMMDD(workdays[workdays.length - 1])}（工作日）`
  }
  return { startDate, endDate, workdays, shortLabel }
}