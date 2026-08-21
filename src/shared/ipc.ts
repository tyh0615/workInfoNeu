import type { AppSettings, ExportRange, ExportResult, LogDoc, DayType } from './types'

/** IPC channel 常量（domain:action 命名） */
export const Ipc = {
  logGetByDate: 'log:getByDate',
  logGetByRange: 'log:getByRange',
  logUpsert: 'log:upsert',
  holidayIsWorkday: 'holiday:isWorkday',
  holidayGetRange: 'holiday:getRange',
  exportMarkdown: 'export:markdown',
  exportExcel: 'export:excel',
  reminderGetToday: 'reminder:getToday',
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  appVersion: 'app:getVersion',
  appDataPath: 'app:getDataPath'
} as const

/** preload 通过 contextBridge 暴露给渲染进程的 API 形状 */
export interface WindowApi {
  log: {
    getByDate: (date: string) => Promise<LogDoc | null>
    getByRange: (start: string, end: string) => Promise<LogDoc[]>
    upsert: (doc: LogDoc) => Promise<void>
  }
  holiday: {
    isWorkday: (date: string) => Promise<boolean>
    getRange: (start: string, end: string) => Promise<Array<{ date: string; type: DayType }>>
  }
  export: {
    markdown: (range: ExportRange) => Promise<ExportResult>
    excel: (range: ExportRange) => Promise<ExportResult>
  }
  reminder: {
    getToday: () => Promise<{ date: string; notified: boolean } | null>
  }
  settings: {
    get: () => Promise<AppSettings>
    set: (settings: AppSettings) => Promise<void>
  }
  app: {
    getVersion: () => Promise<string>
    getDataPath: () => Promise<string>
  }
}
