<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useCalendarStore } from '../stores/calendarStore'
import { useLogStore } from '../stores/logStore'
import CalendarToolbar from '../components/calendar/CalendarToolbar.vue'
import CalendarGrid from '../components/calendar/CalendarGrid.vue'
import LogEditor from '../components/editor/LogEditor.vue'

const calendarStore = useCalendarStore()
const logStore = useLogStore()

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
      <LogEditor class="calendar-view-editor" />
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

.calendar-view-editor {
  overflow: auto;
  max-height: 100%;
}
</style>
