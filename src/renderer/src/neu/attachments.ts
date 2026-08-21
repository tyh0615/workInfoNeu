/**
 * 附件持久化层（前端版）
 * 磁盘布局：
 *   <dataDir>/attachments/{YYYY-MM}/{week1|week2|week3|week4|monthly}/{uuid}__{原名}
 *   <dataDir>/attachments.json  → Record<monthKey, Record<category, Attachment[]>>
 *
 * 写策略沿用 dataStore：临时文件 + move 原子替换，串行化写链防并发写坏。
 * 落盘目录按需逐级创建。
 */
import type { Attachment, AttachmentCategory, MonthAttachmentBucket } from '@shared/types'
import { ATTACHMENT_CATEGORIES } from '@shared/types'
import { getDataPath } from './dataStore'

type AttachmentsMap = Record<string, MonthAttachmentBucket>

let cache: AttachmentsMap = {}
let writeChain: Promise<void> = Promise.resolve()

const META_FILE = 'attachments.json'

function metaPath(): string {
  return `${baseDir()}/${META_FILE}`
}

/** 数据根目录统一为正斜杠分隔（Windows 下 getPath 返回反斜杠，混用会导致路径拼接出错） */
function baseDir(): string {
  return getDataPath().replace(/\\/g, '/')
}

function dirFor(monthKey: string, category: AttachmentCategory): string {
  const meta = ATTACHMENT_CATEGORIES.find((c) => c.key === category)
  return `${baseDir()}/attachments/${monthKey}/${meta?.dir ?? category}`
}

function filePathFor(monthKey: string, category: AttachmentCategory, storedName: string): string {
  return `${dirFor(monthKey, category)}/${storedName}`
}

async function ensureDir(absPath: string): Promise<void> {
  // 统一分隔符后逐级创建（Neutralino createDirectory 不保证递归建父目录）
  const norm = absPath.replace(/\\/g, '/')
  const parts = norm.split('/').filter(Boolean)
  let cur = ''
  for (const part of parts) {
    cur = cur ? `${cur}/${part}` : part
    // Windows 盘符开头（如 C:）不加前导斜杠，其余按 POSIX 绝对路径补斜杠
    const target = /^[A-Za-z]:/.test(cur) ? cur : `/${cur}`
    try {
      await Neutralino.filesystem.createDirectory(target)
    } catch {
      // 已存在则忽略
    }
  }
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const raw = await Neutralino.filesystem.readFile(path)
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

async function doWrite(path: string, data: unknown): Promise<void> {
  const tmp = `${path}.tmp`
  await Neutralino.filesystem.writeFile(tmp, JSON.stringify(data, null, 2))
  try {
    await Neutralino.filesystem.remove(path)
  } catch {
    // 目标不存在
  }
  await Neutralino.filesystem.move(tmp, path)
}

function writeMeta(data: AttachmentsMap): Promise<void> {
  writeChain = writeChain.then(() => doWrite(metaPath(), data))
  return writeChain
}

/** 初始化：读入元数据、确保 attachments 根目录存在 */
export async function initAttachments(): Promise<void> {
  cache = await readJson<AttachmentsMap>(metaPath(), {})
  await ensureDir(`${baseDir()}/attachments`)
}

/** 读取某月全部 5 个分类的附件 */
export async function getMonth(monthKey: string): Promise<MonthAttachmentBucket> {
  return cache[monthKey] ?? {}
}

/** 文件名净化：去路径分隔符与 Windows 非法字符，截断到合理长度 */
function sanitize(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').slice(0, 200)
}

function genId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }
}

export interface UploadFile {
  name: string
  size: number
  type: string
  data: ArrayBuffer
}

/** 上传若干文件到某月某分类；中途失败则回滚已写入的文件 */
export async function upload(
  monthKey: string,
  category: AttachmentCategory,
  files: UploadFile[]
): Promise<Attachment[]> {
  if (files.length === 0) return []
  const dir = dirFor(monthKey, category)
  await ensureDir(dir)

  const newItems: Attachment[] = []
  const written: string[] = []
  try {
    for (const f of files) {
      const safe = sanitize(f.name) || 'unnamed'
      const id = genId()
      const storedName = `${id}__${safe}`
      const full = filePathFor(monthKey, category, storedName)
      await Neutralino.filesystem.writeBinaryFile(full, f.data)
      written.push(full)
      newItems.push({
        id,
        name: f.name,
        size: f.size,
        type: f.type,
        storedName,
        uploadedAt: new Date().toISOString()
      })
    }
  } catch (err) {
    // 回滚已落盘的文件，避免产生无元数据的孤儿文件
    await Promise.allSettled(written.map((p) => Neutralino.filesystem.remove(p)))
    throw err
  }

  const month: MonthAttachmentBucket = { ...(cache[monthKey] ?? {}) }
  month[category] = [...(month[category] ?? []), ...newItems]
  cache = { ...cache, [monthKey]: month }
  await writeMeta(cache)
  return newItems
}

/** 删除某月某分类下的一条附件（同时删除磁盘文件） */
export async function remove(
  monthKey: string,
  category: AttachmentCategory,
  id: string
): Promise<void> {
  const month = cache[monthKey]
  if (!month) return
  const items = month[category] ?? []
  const target = items.find((i) => i.id === id)
  if (target) {
    try {
      await Neutralino.filesystem.remove(filePathFor(monthKey, category, target.storedName))
    } catch {
      // 文件已不在也允许清理元数据
    }
  }
  const nextItems = items.filter((i) => i.id !== id)
  const nextMonth: MonthAttachmentBucket = { ...month, [category]: nextItems }
  cache = { ...cache, [monthKey]: nextMonth }
  await writeMeta(cache)
}

/** 读取某月某分类下某条附件的二进制内容，供前端触发浏览器下载 */
export async function downloadFile(
  monthKey: string,
  category: AttachmentCategory,
  id: string
): Promise<{ name: string; type: string; data: ArrayBuffer }> {
  const month = cache[monthKey]
  if (!month) throw new Error('该月份暂无附件记录')
  const items = month[category] ?? []
  const target = items.find((i) => i.id === id)
  if (!target) throw new Error('附件不存在')
  const path = filePathFor(monthKey, category, target.storedName)
  const data = await Neutralino.filesystem.readBinaryFile(path)
  return { name: target.name, type: target.type, data }
}