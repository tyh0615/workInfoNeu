<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useCalendarStore } from '../stores/calendarStore'
import { useLogStore } from '../stores/logStore'
import CalendarToolbar from '../components/calendar/CalendarToolbar.vue'
import CalendarGrid from '../components/calendar/CalendarGrid.vue'
import LogEditor from '../components/editor/LogEditor.vue'
import AttachmentUploader from '../components/editor/AttachmentUploader.vue'
import { ATTACHMENT_CATEGORIES } from '@shared/types'

const calendarStore = useCalendarStore()
const logStore = useLogStore()

const monthKey = computed(
  () => `${calendarStore.currentYear}-${String(calendarStore.currentMonth).padStart(2, '0')}`
)

const monthTitle = computed(
  () => `${calendarStore.currentYear}年${calendarStore.currentMonth}月 · 附件`
)

onMounted(() => {
  void calendarStore.loadMonth(calendarStore.currentYear, calendarStore.currentMonth)
  void logStore.selectDate(logStore.selectedDate, true)
})

onUnmounted(() => {
  void logStore.flush()
})
</script>

<template>
  <div class="calendar-view">
    <CalendarToolbar class="calendar-view-toolbar" />
    <div class="calendar-view-body">
      <CalendarGrid class="calendar-view-grid" />
      <div class="calendar-view-right">
        <LogEditor class="right-editor" />
        <div class="right-attachments">
          <div class="right-attachments-title">{{ monthTitle }}</div>
          <AttachmentUploader
            v-for="c in ATTACHMENT_CATEGORIES"
            :key="c.key"
            :month-key="monthKey"
            :category="c.key"
            :label="c.label"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}

.calendar-view-toolbar {
  flex: none;
}

.calendar-view-body {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(360px, 2fr);
  gap: 12px;
  min-height: 0;
}

.calendar-view-grid {
  overflow: hidden;
}

.calendar-view-right {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  overflow: hidden;
}

.right-editor {
  flex: 1 1 0;
  min-height: 0;
  overflow: auto;
}

.right-attachments {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  background: var(--wl-surface);
  border-radius: 8px;
  border: 1px solid var(--wl-border);
  max-height: 50%;
  overflow: auto;
}

.right-attachments-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--wl-text-secondary);
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}
</style>