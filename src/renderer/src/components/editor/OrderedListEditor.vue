<script setup lang="ts">
import { ref } from 'vue'
import { Plus, ArrowUp, ArrowDown, Delete, Edit } from '@element-plus/icons-vue'
import type { LogEntry } from '@shared/types'

const props = defineProps<{
  title: string
  entries: LogEntry[]
  placeholder?: string
}>()

const emit = defineEmits<{ update: [entries: LogEntry[]] }>()

const newText = ref('')
const editingId = ref<string | null>(null)
const editingText = ref('')

function addEntry(): void {
  const text = newText.value.trim()
  if (!text) return
  const entry: LogEntry = {
    id: genId(),
    text,
    createdAt: new Date().toISOString()
  }
  emit('update', [...props.entries, entry])
  newText.value = ''
}

function removeEntry(id: string): void {
  emit('update', props.entries.filter((e) => e.id !== id))
}

function moveEntry(id: string, dir: -1 | 1): void {
  const idx = props.entries.findIndex((e) => e.id === id)
  const target = idx + dir
  if (idx < 0 || target < 0 || target >= props.entries.length) return
  const next = [...props.entries]
  ;[next[idx], next[target]] = [next[target], next[idx]]
  emit('update', next)
}

function startEdit(entry: LogEntry): void {
  editingId.value = entry.id
  editingText.value = entry.text
}

function commitEdit(): void {
  const id = editingId.value
  if (id == null) return
  const text = editingText.value.trim()
  emit(
    'update',
    text
      ? props.entries.map((e) => (e.id === id ? { ...e, text } : e))
      : props.entries.filter((e) => e.id !== id) // 清空则删除该条
  )
  editingId.value = null
}

function genId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }
}
</script>

<template>
  <div class="module">
    <div class="module-header">
      <span class="module-title">{{ title }}</span>
      <el-tag size="small" type="info" round>{{ entries.length }} 条</el-tag>
    </div>

    <div class="module-input">
      <el-input
        v-model="newText"
        :placeholder="placeholder ?? '回车添加一条记录'"
        size="default"
        clearable
        @keyup.enter="addEntry"
      >
        <template #append>
          <el-button :icon="Plus" @click="addEntry" />
        </template>
      </el-input>
    </div>

    <ol v-if="entries.length" class="module-list">
      <li v-for="(entry, idx) in entries" :key="entry.id" class="module-item">
        <span class="module-index">{{ idx + 1 }}</span>

        <template v-if="editingId === entry.id">
          <el-input
            v-model="editingText"
            size="small"
            class="module-edit"
            autofocus
            @keyup.enter="commitEdit"
            @blur="commitEdit"
          />
        </template>
        <template v-else>
          <span class="module-text" @dblclick="startEdit(entry)">{{ entry.text }}</span>
        </template>

        <span class="module-actions">
          <el-button
            size="small"
            text
            :icon="Edit"
            :disabled="editingId === entry.id"
            @click="startEdit(entry)"
          />
          <el-button
            size="small"
            text
            :icon="ArrowUp"
            :disabled="idx === 0"
            @click="moveEntry(entry.id, -1)"
          />
          <el-button
            size="small"
            text
            :icon="ArrowDown"
            :disabled="idx === entries.length - 1"
            @click="moveEntry(entry.id, 1)"
          />
          <el-button size="small" text type="danger" :icon="Delete" @click="removeEntry(entry.id)" />
        </span>
      </li>
    </ol>
    <div v-else class="module-empty">暂无记录，请输入后回车添加</div>
  </div>
</template>

<style scoped>
.module {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.module-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.module-title {
  font-size: 15px;
  font-weight: 600;
}

.module-input {
  display: flex;
}

.module-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.module-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  background: #fafbfc;
  border: 1px solid var(--wl-border);
  border-radius: 6px;
}

.module-index {
  flex: none;
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #ecf5ff;
  color: var(--wl-primary);
  font-size: 12px;
  font-weight: 600;
}

.module-text {
  flex: 1;
  line-height: 1.5;
  word-break: break-all;
  cursor: text;
}

.module-edit {
  flex: 1;
}

.module-actions {
  flex: none;
  display: inline-flex;
  gap: 0;
}

.module-empty {
  color: var(--wl-text-secondary);
  font-size: 13px;
  padding: 10px 0;
}
</style>
