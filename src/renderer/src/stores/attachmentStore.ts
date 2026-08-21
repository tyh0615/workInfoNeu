import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Attachment, AttachmentCategory } from '@shared/types'

export interface UploadPayload {
  name: string
  size: number
  type: string
  data: ArrayBuffer
}

const CATS: AttachmentCategory[] = ['week1', 'week2', 'week3', 'week4', 'monthly']

/**
 * 附件状态层
 * - buckets:  缓存结构 { `${monthKey}#${category}`: Attachment[] }
 * - loaded:   某月是否已加载过（避免重复拉取）
 * - uploading:某月某分类是否正在上传（防重复触发）
 */
export const useAttachmentStore = defineStore('attachment', () => {
  const buckets = ref<Record<string, Attachment[]>>({})
  const uploading = ref<Record<string, boolean>>({})
  const loaded = ref<Record<string, boolean>>({})

  function keyOf(monthKey: string, category: AttachmentCategory): string {
    return `${monthKey}#${category}`
  }

  function itemsOf(monthKey: string, category: AttachmentCategory): Attachment[] {
    return buckets.value[keyOf(monthKey, category)] ?? []
  }

  function uploadingOf(monthKey: string, category: AttachmentCategory): boolean {
    return uploading.value[keyOf(monthKey, category)] === true
  }

  async function loadMonth(monthKey: string): Promise<void> {
    if (loaded.value[monthKey]) return
    const data = await window.api.attachment.getMonth(monthKey)
    for (const c of CATS) {
      buckets.value[keyOf(monthKey, c)] = data[c] ?? []
    }
    loaded.value[monthKey] = true
  }

  async function upload(
    monthKey: string,
    category: AttachmentCategory,
    files: UploadPayload[]
  ): Promise<Attachment[]> {
    const k = keyOf(monthKey, category)
    uploading.value[k] = true
    try {
      const added = await window.api.attachment.upload(monthKey, category, files)
      buckets.value[k] = [...itemsOf(monthKey, category), ...added]
      return added
    } finally {
      uploading.value[k] = false
    }
  }

  async function remove(monthKey: string, category: AttachmentCategory, id: string): Promise<void> {
    await window.api.attachment.delete(monthKey, category, id)
    buckets.value[keyOf(monthKey, category)] = itemsOf(monthKey, category).filter((a) => a.id !== id)
  }

  return { itemsOf, uploadingOf, loadMonth, upload, remove }
})