<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload, Delete, Download } from '@element-plus/icons-vue'
import type { Attachment, AttachmentCategory } from '@shared/types'
import { useAttachmentStore } from '../../stores/attachmentStore'
import { getWeekRange } from '../../utils/attachmentWeek'

const props = defineProps<{
  monthKey: string // 'YYYY-MM'
  category: AttachmentCategory
  label: string
}>()

const store = useAttachmentStore()
const fileInput = ref<HTMLInputElement | null>(null)

const items = computed<Attachment[]>(() => store.itemsOf(props.monthKey, props.category))
const uploading = computed(() => store.uploadingOf(props.monthKey, props.category))

// 月份变化时按需拉取
watch(
  () => props.monthKey,
  (m) => {
    void store.loadMonth(m)
  },
  { immediate: true }
)

// 当前分类对应的工作日区间（始终展示，含完成/未完成状态）
const weekInfo = computed(() => {
  const [yStr, mStr] = props.monthKey.split('-')
  return getWeekRange(props.category, Number(yStr), Number(mStr))
})

const completed = computed(() => items.value.length > 0)
const statusText = computed(() =>
  completed.value ? `已完成 ${weekInfo.value.shortLabel}` : '未上传'
)
const statusType = computed<'success' | 'info'>(() => (completed.value ? 'success' : 'info'))

function triggerPick(): void {
  fileInput.value?.click()
}

async function onFileChange(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  const arr: Array<{ name: string; size: number; type: string; data: ArrayBuffer }> = []
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    const data = await f.arrayBuffer()
    arr.push({ name: f.name, size: f.size, type: f.type || '', data })
  }
  input.value = ''

  try {
    const added = await store.upload(props.monthKey, props.category, arr)
    ElMessage.success(`${props.label}已上传 ${added.length} 个附件`)
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    ElMessage.error(`上传失败：${detail}`)
  }
}

async function onDownload(a: Attachment): Promise<void> {
  try {
    const { name, type, data } = await window.api.attachment.download(
      props.monthKey,
      props.category,
      a.id
    )
    const blob = new Blob([data], { type: type || 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    ElMessage.success(`已开始下载 ${name}`)
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    ElMessage.error(`下载失败：${detail}`)
  }
}

async function onDelete(a: Attachment): Promise<void> {
  try {
    await store.remove(props.monthKey, props.category, a.id)
    ElMessage.success(`已删除 ${a.name}`)
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    ElMessage.error(`删除失败：${detail}`)
  }
}

function formatSize(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}
</script>

<template>
  <div class="att" :class="{ 'att--done': completed }">
    <div class="att-header">
      <span class="att-title">{{ label }}</span>
      <el-tag size="small" :type="statusType" round>{{ statusText }}</el-tag>
    </div>
    <div class="att-actions">
      <input ref="fileInput" type="file" multiple class="att-hidden" @change="onFileChange" />
      <el-button :icon="Upload" :loading="uploading" size="small" @click="triggerPick">
        上传附件
      </el-button>
      <span class="att-hint">支持多文件，无大小/类型限制</span>
    </div>
    <ul v-if="items.length" class="att-list">
      <li v-for="a in items" :key="a.id" class="att-item">
        <span class="att-name" :title="a.name">{{ a.name }}</span>
        <span class="att-size">{{ formatSize(a.size) }}</span>
        <el-button size="small" text type="primary" :icon="Download" title="下载" @click="onDownload(a)" />
        <el-button size="small" text type="danger" :icon="Delete" title="删除" @click="onDelete(a)" />
      </li>
    </ul>
    <div v-else class="att-empty">暂无附件</div>
  </div>
</template>

<style scoped>
.att {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid transparent;
  transition: border-color 0.15s, background 0.15s;
}

.att--done {
  border-color: #d1e9d8;
  background: #f5fbf6;
}

.att-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.att-title {
  font-size: 14px;
  font-weight: 500;
}

.att-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.att-hidden {
  display: none;
}

.att-hint {
  font-size: 12px;
  color: var(--wl-text-secondary);
}

.att-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.att-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  background: #ffffff;
  border: 1px solid var(--wl-border);
  border-radius: 4px;
  font-size: 12px;
}

.att-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.att-size {
  color: var(--wl-text-secondary);
  flex: none;
}

.att-empty {
  font-size: 12px;
  color: var(--wl-text-secondary);
  padding: 2px 0;
}
</style>