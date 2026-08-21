<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useSettingsStore } from '../stores/settingsStore'

const settingsStore = useSettingsStore()
const dataPath = ref('')
const version = ref('')

onMounted(async () => {
  await settingsStore.load()
  dataPath.value = await window.api.app.getDataPath()
  version.value = await window.api.app.getVersion()
})

async function onReminderChange(v: boolean | string | number): Promise<void> {
  await settingsStore.update({ reminderEnabled: Boolean(v) })
  ElMessage.success('提醒设置已保存')
}

async function onSkipChange(v: boolean | string | number): Promise<void> {
  await settingsStore.update({ skipIfFilled: Boolean(v) })
  ElMessage.success('设置已保存')
}
</script>

<template>
  <div class="settings">
    <el-card class="settings-card" shadow="never">
      <template #header>提醒设置</template>
      <el-form label-width="180px">
        <el-form-item label="工作日 18:00 提醒">
          <el-switch :model-value="settingsStore.settings.reminderEnabled" @update:model-value="onReminderChange" />
          <span class="hint">应用运行时，法定工作日 18:00 弹系统通知提醒填写日志</span>
        </el-form-item>
        <el-form-item label="已填写则不提醒">
          <el-switch :model-value="settingsStore.settings.skipIfFilled" @update:model-value="onSkipChange" />
          <span class="hint">当天任一模块已有内容时不再弹提醒</span>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="settings-card" shadow="never">
      <template #header>数据与存储</template>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="应用版本">v{{ version }}</el-descriptions-item>
        <el-descriptions-item label="数据目录">
          <span class="mono">{{ dataPath }}</span>
          <span class="hint">（日志数据保存在该目录 data/ 下，备份此目录即可迁移数据）</span>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card class="settings-card" shadow="never">
      <template #header>关于工作日判定</template>
      <p class="about-text">
        工作日判定：周一至周五且非法定节假日，或周末调休补班日。节假日数据内置：
        2026 年为国务院办公厅官方安排，2027 年为按《全国年节及纪念日放假办法》推算值
        （官方通知预计 2026 年 11 月发布，届时更新数据文件即可）。
      </p>
    </el-card>
  </div>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-card :deep(.el-card__header) {
  font-weight: 600;
}

.hint {
  margin-left: 12px;
  font-size: 12px;
  color: var(--wl-text-secondary);
}

.mono {
  font-family: Consolas, 'Courier New', monospace;
  font-size: 13px;
}

.about-text {
  margin: 0;
  line-height: 1.8;
  color: var(--wl-text);
}
</style>
