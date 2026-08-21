import { createApp } from 'vue'
import { createPinia } from 'pinia'
// 程序化 API（ElMessage）样式按需引入；模板组件由 unplugin-vue-components 自动按需注册
import 'element-plus/es/components/message/style/css'
import App from './App.vue'
import { router } from './router'
import './assets/base.css'
// 全局类型声明（window.api / window.Neutralino），需先于业务代码引入
import './neu/globals'
import { ensureNeuReady, initNeuBackend } from './neu/neuBackend'

async function bootstrap(): Promise<void> {
  // 先等 Neutralino 原生环境就绪并注入 window.api，再挂载 Vue 应用
  await ensureNeuReady()
  await initNeuBackend()

  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.mount('#app')
}

void bootstrap()
