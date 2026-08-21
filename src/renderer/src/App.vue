<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { Calendar, Setting, Download } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import ExportDialog from './components/export/ExportDialog.vue'
import { useLogStore } from './stores/logStore'

const route = useRoute()
const exportVisible = ref(false)
const logStore = useLogStore()

async function handleSave(): Promise<void> {
  try {
    await logStore.save()
    ElMessage.success(`已保存 ${logStore.selectedDate} 的日志`)
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    ElMessage.error(`保存失败：${detail}`)
  }
}
</script>

<template>
  <el-config-provider :locale="zhCn">
    <el-container class="app-shell">
      <el-header class="app-header">
        <div class="brand">
          <span class="brand-title">犁地几亩地</span>
          <span class="brand-sub">打工牛马，永不言弃!</span>
        </div>
        <nav class="nav">
          <router-link to="/calendar" class="nav-item" :class="{ active: route.path === '/calendar' }">
            <el-icon>
              <Calendar />
            </el-icon>
            日历
          </router-link>
          <router-link to="/settings" class="nav-item" :class="{ active: route.path === '/settings' }">
            <el-icon>
              <Setting />
            </el-icon>
            设置
          </router-link>
        </nav>
        <div class="header-actions">
          <el-button v-if="route.path === '/calendar'" :loading="logStore.saving" @click="handleSave">
            保存
          </el-button>
          <el-button type="primary" :icon="Download" @click="exportVisible = true">导出日志</el-button>
        </div>
      </el-header>
      <el-main class="app-main">
        <router-view />
      </el-main>
      <ExportDialog v-model="exportVisible" />
    </el-container>
  </el-config-provider>
</template>

<style scoped>
.app-shell {
  height: 100%;
}

.app-header {
  display: flex;
  align-items: center;
  gap: 24px;
  height: 56px;
  background: var(--wl-surface);
  border-bottom: 1px solid var(--wl-border);
  padding: 0 20px;
}

.brand {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.brand-title {
  font-size: 18px;
  font-weight: 600;
}

.brand-sub {
  font-size: 12px;
  color: var(--wl-text-secondary);
}

.nav {
  display: flex;
  gap: 4px;
  flex: 1;
}

.nav-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 6px;
  color: var(--wl-text);
  text-decoration: none;
  font-size: 14px;
  transition: background 0.15s;
}

.nav-item:hover {
  background: var(--wl-bg);
}

.nav-item.active {
  background: #ecf5ff;
  color: var(--wl-primary);
}

.app-main {
  padding: 16px;
  height: calc(100% - 56px);
  overflow: auto;
}
</style>
