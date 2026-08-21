<script setup lang="ts">
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import type { ExportRange } from '@shared/types'
import { useLogStore } from '../../stores/logStore'

defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [v: boolean] }>()

const mode = ref<'month' | 'week' | 'custom'>('month')
const format = ref<'md' | 'xlsx'>('md')

// 按月：月份选择（默认当前月）
const monthValue = ref(dayjs().format('YYYY-MM'))
// 按周：该周内任意一天（默认本周）
const weekDate = ref(dayjs().format('YYYY-MM-DD'))
// 自定义：日期区间（默认本月）
const customRange = ref<[string, string]>([
  dayjs().startOf('month').format('YYYY-MM-DD'),
  dayjs().endOf('month').format('YYYY-MM-DD')
])

const logStore = useLogStore()

const computedRange = computed<ExportRange | null>(() => {
  if (mode.value === 'month') {
    const d = dayjs(monthValue.value)
    return {
      start: d.startOf('month').format('YYYY-MM-DD'),
      end: d.endOf('month').format('YYYY-MM-DD')
    }
  }
  if (mode.value === 'week') {
    const d = dayjs(weekDate.value)
    return {
      start: d.subtract((d.day() + 6) % 7, 'day').format('YYYY-MM-DD'),
      end: d.add(6 - ((d.day() + 6) % 7), 'day').format('YYYY-MM-DD')
    }
  }
  const [start, end] = customRange.value
  if (!start || !end || start > end) return null
  return { start, end }
})

async function doExport(): Promise<void> {
  const range = computedRange.value
  if (!range) {
    ElMessage.warning('请选择有效的导出范围（开始日期不能晚于结束日期）')
    return
  }
  // 先落盘未保存的草稿，保证导出数据完整
  await logStore.flush()

  const result =
    format.value === 'md'
      ? await window.api.export.markdown(range)
      : await window.api.export.excel(range)

  if (result.canceled) {
    ElMessage.info('已取消导出')
  } else {
    ElMessage.success(`已导出：${result.filePath}`)
    emit('update:modelValue', false)
  }
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="导出工作日志"
    width="520px"
    :close-on-click-modal="false"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form label-width="80px">
      <el-form-item label="导出范围">
        <el-radio-group v-model="mode">
          <el-radio value="month">按月</el-radio>
          <el-radio value="week">按周</el-radio>
          <el-radio value="custom">自定义</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item v-if="mode === 'month'" label="选择月份">
        <el-date-picker
          v-model="monthValue"
          type="month"
          format="YYYY年MM月"
          value-format="YYYY-MM"
        />
      </el-form-item>

      <el-form-item v-if="mode === 'week'" label="所在周">
        <el-date-picker
          v-model="weekDate"
          type="date"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          placeholder="选择该周内任意一天（周一为一周起点）"
        />
      </el-form-item>

      <el-form-item v-if="mode === 'custom'" label="起止日期">
        <el-date-picker
          v-model="customRange"
          type="daterange"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
        />
      </el-form-item>

      <el-form-item label="导出格式">
        <el-radio-group v-model="format">
          <el-radio value="md">Markdown（.md）</el-radio>
          <el-radio value="xlsx">Excel（.xlsx）</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item v-if="computedRange" label="导出范围">
        <el-tag type="info">{{ computedRange.start }} ~ {{ computedRange.end }}</el-tag>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="doExport">导出</el-button>
    </template>
  </el-dialog>
</template>
