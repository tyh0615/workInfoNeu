import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DEFAULT_SETTINGS, type AppSettings } from '@shared/types'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS })

  async function load(): Promise<void> {
    settings.value = await window.api.settings.get()
  }

  async function update(partial: Partial<AppSettings>): Promise<void> {
    settings.value = { ...settings.value, ...partial }
    // 展开为 plain object：reactive proxy 无法通过 IPC 结构化克隆
    await window.api.settings.set({ ...settings.value })
  }

  return { settings, load, update }
})
