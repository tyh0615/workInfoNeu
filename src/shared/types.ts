/** 日志条目（三个模块的元素） */
export interface LogEntry {
  id: string // crypto.randomUUID()
  text: string
  createdAt: string // ISO 时间
}

/** 日志文档，一条 = 一天，按 date 唯一 */
export interface LogDoc {
  date: string // 'YYYY-MM-DD'（本地时区）
  todayWork: LogEntry[] // 今日工作内容
  tomorrowPlan: LogEntry[] // 明日计划
  problems: LogEntry[] // 存在问题
  updatedAt: string // ISO 时间
}

/** 提醒去重记录 */
export interface ReminderDoc {
  date: string // 'YYYY-MM-DD'，唯一索引
  notifiedAt: string // ISO 时间
}

/** 某一天的工作日状态（供日历着色 + 提醒判定） */
export type DayType = 'workday' | 'weekend' | 'holiday' | 'makeup-workday'

/** 导出范围 */
export interface ExportRange {
  start: string // 'YYYY-MM-DD'
  end: string // 'YYYY-MM-DD'
}

/** 导出结果 */
export interface ExportResult {
  canceled: boolean
  filePath?: string
}

/** 附件分类（按月划分，每月 5 个固定类别） */
export type AttachmentCategory = 'week1' | 'week2' | 'week3' | 'week4' | 'monthly'

/** 附件条目（每条对应磁盘上一个文件） */
export interface Attachment {
  id: string // crypto.randomUUID()
  name: string // 原始文件名
  size: number // 字节
  type: string // MIME
  storedName: string // 落盘名：id + __ + sanitize(原名)
  uploadedAt: string // ISO 时间
}

/** 某月所有附件，按 5 个分类组织 */
export type MonthAttachmentBucket = Partial<Record<AttachmentCategory, Attachment[]>>

/** 附件分类元数据（前后端共享，前端用于渲染、后端用于落盘目录名） */
export const ATTACHMENT_CATEGORIES: ReadonlyArray<{ key: AttachmentCategory; label: string; dir: string }> = [
  { key: 'week1', label: '第一周', dir: 'week1' },
  { key: 'week2', label: '第二周', dir: 'week2' },
  { key: 'week3', label: '第三周', dir: 'week3' },
  { key: 'week4', label: '第四周', dir: 'week4' },
  { key: 'monthly', label: '当月月报', dir: 'monthly' }
] as const

/** 应用设置（主进程读写 userData/settings.json，供提醒调度器直接读取） */
export interface AppSettings {
  reminderEnabled: boolean // 提醒总开关
  skipIfFilled: boolean // 当日已填日志则不提醒
}

/** 节假日数据文件结构（src/main/data/holidays/*.json） */
export interface HolidayYearData {
  year: number
  status: 'official' | 'provisional'
  source: string
  published?: string | null
  holidays: string[] // 放假日期（YYYY-MM-DD）
  workdays: string[] // 调休补班日期（YYYY-MM-DD）
}

/** 空日志文档工厂 */
export function emptyLogDoc(date: string): LogDoc {
  return {
    date,
    todayWork: [],
    tomorrowPlan: [],
    problems: [],
    updatedAt: new Date().toISOString()
  }
}

/** 默认设置 */
export const DEFAULT_SETTINGS: AppSettings = {
  reminderEnabled: true,
  skipIfFilled: true
}
