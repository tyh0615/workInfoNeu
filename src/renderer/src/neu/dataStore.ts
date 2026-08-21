/**
 * Neutralino 数据持久化层
 * 数据目录：<平台数据目录>/workInfoNeu/data/
 *   - logs.json      所有日志文档（key: date）
 *   - settings.json  应用设置
 *   - reminders.json 提醒去重记录（key: date）
 *
 * 写入采用「临时文件 + move」原子替换，并串行化写操作，避免并发写坏文件。
 */
import type { AppSettings, LogDoc } from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/types'

export interface ReminderDoc {
  date: string
  notifiedAt: string
}

type LogsMap = Record<string, LogDoc>
type RemindersMap = Record<string, ReminderDoc>

let dataDir = ''
let logsCache: LogsMap = {}
let remindersCache: RemindersMap = {}
let writeChain: Promise<void> = Promise.resolve()

function file(name: string): string {
  return `${dataDir}/${name}`
}

async function readJson<T>(name: string, fallback: T): Promise<T> {
  try {
    const raw = await Neutralino.filesystem.readFile(file(name))
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

async function doWrite(name: string, data: unknown): Promise<void> {
  const tmp = file(`.${name}.tmp`)
  await Neutralino.filesystem.writeFile(tmp, JSON.stringify(data, null, 2))
  try {
    await Neutralino.filesystem.remove(file(name))
  } catch {
    // 目标不存在则跳过
  }
  await Neutralino.filesystem.move(tmp, file(name))
}

/** 串行化写文件：所有写入排队执行 */
function writeJson(name: string, data: unknown): Promise<void> {
  writeChain = writeChain.then(() => doWrite(name, data))
  return writeChain
}

/** 初始化数据目录与内存缓存 */
export async function initDataStore(): Promise<void> {
  const base = await Neutralino.os.getPath('data')
  dataDir = `${base}/workInfoNeu/data`
  try {
    await Neutralino.filesystem.createDirectory(dataDir)
  } catch {
    // 已存在则跳过
  }
  logsCache = await readJson<LogsMap>('logs.json', {})
  remindersCache = await readJson<RemindersMap>('reminders.json', {})
}

export function getDataPath(): string {
  return dataDir
}

/* ---------------- 日志 ---------------- */

export async function getLogByDate(date: string): Promise<LogDoc | null> {
  return logsCache[date] ?? null
}

export async function getLogsByRange(start: string, end: string): Promise<LogDoc[]> {
  return Object.values(logsCache)
    .filter((d) => d.date >= start && d.date <= end)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
}

export async function upsertLog(doc: LogDoc): Promise<void> {
  logsCache = { ...logsCache, [doc.date]: { ...doc } }
  await writeJson('logs.json', logsCache)
}

/* ---------------- 设置 ---------------- */

export async function getSettings(): Promise<AppSettings> {
  const saved = await readJson<Partial<AppSettings>>('settings.json', {})
  return { ...DEFAULT_SETTINGS, ...saved }
}

export async function setSettings(settings: AppSettings): Promise<void> {
  await writeJson('settings.json', settings)
}

/* ---------------- 提醒 ---------------- */

export async function hasNotified(date: string): Promise<boolean> {
  return remindersCache[date] != null
}

export async function markNotified(date: string): Promise<void> {
  remindersCache = { ...remindersCache, [date]: { date, notifiedAt: new Date().toISOString() } }
  await writeJson('reminders.json', remindersCache)
}

export async function getTodayReminder(date: string): Promise<{ date: string; notified: boolean } | null> {
  return { date, notified: remindersCache[date] != null }
}
