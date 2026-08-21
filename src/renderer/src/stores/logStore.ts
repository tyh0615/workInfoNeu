import { defineStore } from 'pinia'
import { ref } from 'vue'
import dayjs from 'dayjs'
import { emptyLogDoc, type LogDoc, type LogEntry } from '@shared/types'
import { useCalendarStore } from './calendarStore'

export type LogModule = 'todayWork' | 'tomorrowPlan' | 'problems'

/** 生成条目 id（优先 crypto.randomUUID，兜底自造） */
function genId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }
}

export const useLogStore = defineStore('log', () => {
  const calendarStore = useCalendarStore()
  const selectedDate = ref(dayjs().format('YYYY-MM-DD'))
  const draft = ref<LogDoc>(emptyLogDoc(selectedDate.value))
  const saving = ref(false)
  /** 是否有未落盘的修改 */
  const dirty = ref(false)

  let saveTimer: number | undefined
  /** 保存串行链，避免并发写库 */
  let saveChain: Promise<void> = Promise.resolve()
  /** 日期加载请求序号：仅最后一次切换生效，防快速连续切换时旧请求覆盖新日期 */
  let loadSeq = 0

  async function doSave(): Promise<void> {
    saving.value = true
    try {
      // draft 是 Vue reactive 代理，浅拷贝后嵌套数组仍是 Proxy，
      // IPC 结构化克隆会抛 "An object could not be cloned"，必须深拷贝为 plain object
      const doc: LogDoc = JSON.parse(JSON.stringify(draft.value)) as LogDoc
      doc.updatedAt = new Date().toISOString()
      await window.api.log.upsert(doc)
      draft.value.updatedAt = doc.updatedAt
      calendarStore.refreshLog(doc)
      dirty.value = false
    } finally {
      saving.value = false
    }
  }

  /** 将一次保存追加到串行链尾部 */
  function queueSave(): Promise<void> {
    const p = saveChain.then(() => doSave())
    saveChain = p.catch(() => {})
    return p
  }

  function scheduleSave(): void {
    dirty.value = true
    window.clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => {
      saveTimer = undefined
      void queueSave()
    }, 500)
  }

  /** 立即落盘所有未保存改动并等待完成 */
  async function flush(): Promise<void> {
    if (saveTimer !== undefined) {
      window.clearTimeout(saveTimer)
      saveTimer = undefined
    }
    if (dirty.value) {
      await queueSave()
    } else {
      await saveChain
    }
  }

  /** 切换日期：先确保当前日期落盘，再加载目标日期 */
  async function selectDate(date: string, force = false): Promise<void> {
    if (!force && date === selectedDate.value) return
    const seq = ++loadSeq
    try {
      await flush()
    } catch {
      // 保存失败不阻塞切换，dirty 保持 true，下次编辑/保存会重试
    }
    if (seq !== loadSeq) return
    selectedDate.value = date
    const doc = await window.api.log.getByDate(date)
    if (seq !== loadSeq) return
    draft.value = doc ? { ...doc } : emptyLogDoc(date)
    dirty.value = false
  }

  function setEntries(module: LogModule, entries: LogEntry[]): void {
    draft.value[module] = entries
    scheduleSave()
  }

  /** 保存按钮：立即落盘全部未保存修改 */
  async function save(): Promise<void> {
    await flush()
  }

  return { selectedDate, draft, saving, dirty, selectDate, setEntries, flush, save, genId }
})
