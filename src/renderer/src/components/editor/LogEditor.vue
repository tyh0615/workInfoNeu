<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import type { DayType, LogEntry } from '@shared/types'
import { useLogStore, type LogModule } from '../../stores/logStore'
import { useCalendarStore } from '../../stores/calendarStore'
import OrderedListEditor from './OrderedListEditor.vue'

const logStore = useLogStore()
const calendarStore = useCalendarStore()

const WEEKDAY_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const TYPE_CN: Record<DayType, string> = {
  workday: '工作日',
  weekend: '休息日',
  holiday: '法定假日',
  'makeup-workday': '补班日'
}

const dayType = computed<DayType | undefined>(() =>
  calendarStore.dayTypes.get(logStore.selectedDate)
)

const dateLabel = computed(() => {
  const d = dayjs(logStore.selectedDate)
  const typeLabel = dayType.value ? TYPE_CN[dayType.value] : ''
  return `${logStore.selectedDate}（${WEEKDAY_CN[d.day()]}）${typeLabel ? ` · ${typeLabel}` : ''}`
})

const totalCount = computed(
  () =>
    logStore.draft.todayWork.length +
    logStore.draft.tomorrowPlan.length +
    logStore.draft.problems.length
)

function onUpdate(module: LogModule, entries: LogEntry[]): void {
  logStore.setEntries(module, entries)
}

const statusText = computed(() => {
  if (logStore.saving) return '保存中…'
  if (logStore.dirty) return '有未保存修改'
  return totalCount.value > 0 ? '已保存' : '未填写'
})

const statusType = computed(() => {
  if (logStore.saving || logStore.dirty) return 'warning'
  return totalCount.value > 0 ? 'success' : 'info'
})
</script>

<template>
  <div class="editor">
    <div class="editor-header">
      <div class="editor-date">{{ dateLabel }}</div>
      <div class="editor-meta">
        <el-tag size="small" :type="statusType" round>{{ statusText }}</el-tag>
      </div>
    </div>

    <OrderedListEditor
      title="今日工作内容"
      :entries="logStore.draft.todayWork"
      placeholder="回车添加今日工作内容"
      @update="onUpdate('todayWork', $event)"
    />
    <el-divider />
    <OrderedListEditor
      title="明日计划"
      :entries="logStore.draft.tomorrowPlan"
      placeholder="回车添加明日计划"
      @update="onUpdate('tomorrowPlan', $event)"
    />
    <el-divider />
    <OrderedListEditor
      title="存在问题"
      :entries="logStore.draft.problems"
      placeholder="回车添加存在问题"
      @update="onUpdate('problems', $event)"
    />
  </div>
</template>

<style scoped>
.editor {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background: var(--wl-surface);
  border-radius: 8px;
  border: 1px solid var(--wl-border);
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.editor-date {
  font-size: 16px;
  font-weight: 600;
}

.editor-meta {
  display: flex;
  gap: 8px;
}
</style>
