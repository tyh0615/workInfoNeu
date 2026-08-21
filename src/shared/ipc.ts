import type {
  AppSettings,
  Attachment,
  AttachmentCategory,
  ExportRange,
  ExportResult,
  LogDoc,
  DayType,
  MonthAttachmentBucket
} from './types'

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
  appDataPath: 'app:getDataPath',
  attachmentGetMonth: 'attachment:getMonth',
  attachmentUpload: 'attachment:upload',
  attachmentDelete: 'attachment:delete'
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
  attachment: {
    /** 读取某月 5 个分类的所有附件元数据 */
    getMonth: (monthKey: string) => Promise<MonthAttachmentBucket>
    /** 上传若干文件到某月某分类；写入磁盘并更新 attachments.json */
    upload: (
      monthKey: string,
      category: AttachmentCategory,
      files: Array<{ name: string; size: number; type: string; data: ArrayBuffer }>
    ) => Promise<Attachment[]>
    /** 删除某月某分类下的某条附件（同时删除磁盘文件） */
    delete: (monthKey: string, category: AttachmentCategory, id: string) => Promise<void>
    /** 读取已上传文件的二进制内容，供前端触发浏览器下载 */
    download: (
      monthKey: string,
      category: AttachmentCategory,
      id: string
    ) => Promise<{ name: string; type: string; data: ArrayBuffer }>
  }
}
