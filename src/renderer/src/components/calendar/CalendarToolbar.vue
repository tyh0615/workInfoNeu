<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { useCalendarStore } from '../../stores/calendarStore'

const calendarStore = useCalendarStore()

const monthValue = computed({
  get: () => dayjs(`${calendarStore.currentYear}-${calendarStore.currentMonth}-01`).format('YYYY-MM'),
  set: (v: string) => {
    const d = dayjs(v)
    calendarStore.setMonth(d.year(), d.month() + 1)
  }
})

function goToday(): void {
  const now = dayjs()
  calendarStore.setMonth(now.year(), now.month() + 1)
}
</script>

<template>
  <div class="toolbar">
    <el-button :icon="ArrowLeft" circle @click="calendarStore.prevMonth()" />
    <el-date-picker
      v-model="monthValue"
      type="month"
      format="YYYY年MM月"
      value-format="YYYY-MM"
      :clearable="false"
      style="width: 130px"
    />
    <el-button :icon="ArrowRight" circle @click="calendarStore.nextMonth()" />
    <el-button @click="goToday">今天</el-button>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
