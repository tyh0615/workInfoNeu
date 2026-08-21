/**
 * Neutralino 后端适配层
 * 负责：
 *  1. 初始化 Neutralino 客户端（确保原生 API 就绪）
 *  2. 注入与 Electron preload 形状完全一致的 window.api
 *  3. 启动 18:00 工作日提醒调度
 *
 * 前端业务代码零改动，仅依赖 window.api。
 */
import type { AppSettings, LogDoc, ExportRange, DayType } from '@shared/types'
import type { WindowApi } from '@shared/ipc'
import type { NeutralinoNs } from './globals'
import * as store from './dataStore'
import * as holidays from './holidays'
import * as attachments from './attachments'
import { exportToFile } from './exportService'

let initPromise: Promise<void> | null = null
let version = ''

/** 等待 Neutralino 原生环境就绪（只初始化一次） */
export function ensureNeuReady(): Promise<void> {
  if (initPromise) return initPromise
  initPromise = new Promise((resolve, reject) => {
    const N = (window as unknown as { Neutralino: NeutralinoNs }).Neutralino
    if (!N) {
      reject(new Error('Neutralino 客户端库未加载'))
      return
    }
    let settled = false
    N.events.on('ready', () => {
      if (!settled) {
        settled = true
        resolve()
      }
    })
    try {
      N.init()
    } catch (e) {
      reject(e)
      return
    }
    // 兜底：3 秒内未收到 ready 也继续（避免极端情况下卡住启动）
    setTimeout(() => {
      if (!settled) {
        settled = true
        resolve()
      }
    }, 3000)
  })
  return initPromise
}

/** 初始化后端：数据目录、节假日、版本号、window.api、提醒调度 */
export async function initNeuBackend(): Promise<void> {
  await ensureNeuReady()
  await store.initDataStore()
  await holidays.initHolidays()
  await attachments.initAttachments()
  try {
    version = await Neutralino.app.getVersion()
  } catch {
    version = '1.0.0'
  }
  injectApi()
  startReminderScheduler()
}

function injectApi(): void {
  const api: WindowApi = {
    log: {
      getByDate: (date: string) => store.getLogByDate(date),
      getByRange: (start: string, end: string) => store.getLogsByRange(start, end),
      upsert: (doc: LogDoc) => store.upsertLog(doc)
    },
    holiday: {
      isWorkday: (date: string) => Promise.resolve(holidays.isWorkday(date)),
      getRange: (start: string, end: string): Promise<Array<{ date: string; type: DayType }>> =>
        Promise.resolve(holidays.getDayTypesInRange(start, end))
    },
    export: {
      markdown: (range: ExportRange) => exportToFile(range, 'md'),
      excel: (range: ExportRange) => exportToFile(range, 'xlsx')
    },
    reminder: {
      getToday: () => store.getTodayReminder(newDateKey())
    },
    settings: {
      get: (): Promise<AppSettings> => store.getSettings(),
      set: (settings: AppSettings) => store.setSettings(settings)
    },
    app: {
      getVersion: () => Promise.resolve(version),
      getDataPath: () => Promise.resolve(store.getDataPath())
    },
    attachment: {
      getMonth: (monthKey: string) => attachments.getMonth(monthKey),
      upload: (monthKey, category, files) => attachments.upload(monthKey, category, files),
      delete: (monthKey, category, id) => attachments.remove(monthKey, category, id),
      download: (monthKey, category, id) => attachments.downloadFile(monthKey, category, id)
    }
  }
  ;(window as unknown as { api: WindowApi }).api = api
}

function newDateKey(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/* ---------------- 18:00 工作日提醒 ---------------- */

let reminderTimer: number | null = null

function hasAnyContent(doc: LogDoc | null): boolean {
  return !!doc && (doc.todayWork.length > 0 || doc.tomorrowPlan.length > 0 || doc.problems.length > 0)
}

async function reminderTick(): Promise<void> {
  const now = new Date()
  if (now.getHours() < 18) return

  const dateKey = newDateKey()
  if (await store.hasNotified(dateKey)) return
  if (!holidays.isWorkday(dateKey)) return

  const settings = await store.getSettings()
  if (!settings.reminderEnabled) return
  if (settings.skipIfFilled && hasAnyContent(await store.getLogByDate(dateKey))) return

  await store.markNotified(dateKey)
  try {
    await Neutralino.os.showNotification(
      '该写工作日志啦',
      '今天的工作日志还没有填写，点击打开日历快速填写。',
      'INFO'
    )
  } catch {
    // 通知失败不影响主流程
  }
}

export function startReminderScheduler(): void {
  if (reminderTimer != null) return
  void reminderTick()
  reminderTimer = window.setInterval(() => void reminderTick(), 60_000)
}
