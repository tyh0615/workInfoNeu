/**
 * 导出服务（前端版）
 *  - Markdown：纯文本生成，filesystem.writeFile 写入
 *  - Excel：使用 resources/vendor/exceljs.min.js 暴露的全局 ExcelJS 生成 xlsx，
 *    filesystem.writeBinaryFile 写入
 * 逻辑与原 Electron 主进程 exportService.ts 一致。
 */
import type { ExportRange, ExportResult } from '@shared/types'
import { getLogsByRange } from './dataStore'
import { getDayType } from './holidays'

const WEEKDAY_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const TYPE_CN: Record<string, string> = {
  workday: '工作日',
  weekend: '休息日',
  holiday: '法定假日',
  'makeup-workday': '补班日'
}

function entriesToLines(entries: Array<{ text: string }>): string[] {
  return entries.map((e, i) => `${i + 1}. ${e.text}`)
}

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() + n)
  return toDateKey(d)
}

function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function weekdayOf(date: string): string {
  return WEEKDAY_CN[new Date(`${date}T00:00:00`).getDay()]
}

function hasContent(doc: { todayWork: unknown[]; tomorrowPlan: unknown[]; problems: unknown[] } | undefined): boolean {
  return !!doc && (doc.todayWork.length > 0 || doc.tomorrowPlan.length > 0 || doc.problems.length > 0)
}

/** 构建 Markdown 内容 */
export async function buildMarkdown(range: ExportRange): Promise<string> {
  const docs = await getLogsByRange(range.start, range.end)
  const byDate = new Map(docs.map((d) => [d.date, d]))
  const lines: string[] = []
  lines.push(`# 工作日志（${range.start} ~ ${range.end}）`)
  lines.push('')

  let date = range.start
  let guard = 0
  while (date <= range.end && guard < 10000) {
    const doc = byDate.get(date)
    const dayType = getDayType(date)

    lines.push(`## ${date}（${weekdayOf(date)}）· ${TYPE_CN[dayType]}`)
    lines.push('')

    if (!hasContent(doc)) {
      lines.push('（当日无记录）')
      lines.push('')
      date = addDays(date, 1)
      guard++
      continue
    }

    lines.push('### 今日工作内容')
    lines.push(...(doc!.todayWork.length ? entriesToLines(doc!.todayWork) : ['（无）']))
    lines.push('')
    lines.push('### 明日计划')
    lines.push(...(doc!.tomorrowPlan.length ? entriesToLines(doc!.tomorrowPlan) : ['（无）']))
    lines.push('')
    lines.push('### 存在问题')
    lines.push(...(doc!.problems.length ? entriesToLines(doc!.problems) : ['（无）']))
    lines.push('')
    lines.push('---')
    lines.push('')

    date = addDays(date, 1)
    guard++
  }
  return lines.join('\n')
}

/** 构建 Excel 工作簿（按天一行，单元格换行），返回 ArrayBuffer */
export async function buildXlsxBuffer(range: ExportRange): Promise<ArrayBuffer> {
  const ExcelJS = (window as unknown as { ExcelJS: ExcelJSNamespace }).ExcelJS
  if (!ExcelJS) throw new Error('ExcelJS 未加载')

  const docs = await getLogsByRange(range.start, range.end)
  const byDate = new Map(docs.map((d) => [d.date, d]))

  const wb = new ExcelJS.Workbook()
  wb.creator = '工作日志'
  const ws = wb.addWorksheet('工作日志')

  ws.columns = [
    { header: '日期', key: 'date', width: 14 },
    { header: '星期', key: 'weekday', width: 8 },
    { header: '类型', key: 'type', width: 10 },
    { header: '今日工作内容', key: 'todayWork', width: 50 },
    { header: '明日计划', key: 'tomorrowPlan', width: 50 },
    { header: '存在问题', key: 'problems', width: 40 }
  ]

  const headerRow = ws.getRow(1)
  headerRow.font = { bold: true }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } }
  headerRow.height = 22

  let date = range.start
  let guard = 0
  while (date <= range.end && guard < 10000) {
    const doc = byDate.get(date)
    const dayType = getDayType(date)

    const cell = (entries: Array<{ text: string }> | undefined): string =>
      entries && entries.length ? entriesToLines(entries).join('\n') : ''

    const row = ws.addRow({
      date,
      weekday: weekdayOf(date),
      type: TYPE_CN[dayType],
      todayWork: cell(doc?.todayWork),
      tomorrowPlan: cell(doc?.tomorrowPlan),
      problems: cell(doc?.problems)
    })

    row.eachCell((c: unknown) => {
      if (c && typeof c === 'object') {
        ;(c as { alignment: Record<string, unknown> }).alignment = { wrapText: true, vertical: 'top' }
      }
    })
    row.height = Math.max(20, Math.min(160, (String(row.getCell('todayWork').text ?? '').split('\n').length || 1) * 18))

    date = addDays(date, 1)
    guard++
  }

  ws.views = [{ state: 'frozen', ySplit: 1 }]
  const buffer = await wb.xlsx.writeBuffer()
  return buffer as ArrayBuffer
}

/** ExcelJS 全局命名空间最小声明（vendor 脚本） */
interface ExcelJSWorksheet {
  addRow: (data: Record<string, unknown>) => {
    eachCell: (fn: (c: unknown) => void) => void
    height: number
    getCell: (key: string) => { text: unknown }
  }
  columns: Array<{ header: string; key: string; width: number }>
  getRow: (n: number) => { font: Record<string, unknown>; fill: Record<string, unknown>; height: number }
  addWorksheet: (name: string) => ExcelJSWorksheet
  views: Array<{ state: string; ySplit: number }>
}
interface ExcelJSWorkbook {
  creator: string
  addWorksheet: (name: string) => ExcelJSWorksheet
  xlsx: { writeBuffer: () => Promise<ArrayBuffer | unknown> }
}
interface ExcelJSNamespace {
  Workbook: new () => ExcelJSWorkbook
}

/** 弹出保存对话框并写入文件 */
export async function exportToFile(range: ExportRange, ext: 'md' | 'xlsx'): Promise<ExportResult> {
  const title = ext === 'md' ? '导出工作日志（Markdown）' : '导出工作日志（Excel）'
  const defaultPath = `工作日志_${range.start}_${range.end}.${ext}`
  const filters =
    ext === 'md'
      ? [{ name: 'Markdown 文档', extensions: ['md'] }]
      : [{ name: 'Excel 工作簿', extensions: ['xlsx'] }]

  const filePath = await Neutralino.os.showSaveDialog(title, { defaultPath, filters })
  if (!filePath) return { canceled: true }

  if (ext === 'md') {
    await Neutralino.filesystem.writeFile(filePath, await buildMarkdown(range))
  } else {
    const buffer = await buildXlsxBuffer(range)
    await Neutralino.filesystem.writeBinaryFile(filePath, buffer)
  }
  return { canceled: false, filePath }
}
