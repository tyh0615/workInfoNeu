/**
 * Neutralino 全局环境声明
 *  - window.Neutralino：客户端原生 API（index.html 注入 resources/js/neutralino.js）
 *  - window.api：本应用适配层注入的业务 API（与 Electron preload 形状一致）
 */
import type { WindowApi } from '../../../shared/ipc'

export interface NeutralinoNs {
  init: () => void
  events: {
    on: (event: string, handler: (evt: unknown) => void) => void
  }
  app: {
    getVersion: () => Promise<string>
  }
  os: {
    getPath: (name: string) => Promise<string>
    showSaveDialog: (title: string, options?: Record<string, unknown>) => Promise<string>
    showNotification: (title: string, body: string, type: string) => Promise<void>
  }
  filesystem: {
    createDirectory: (path: string) => Promise<void>
    writeFile: (name: string, data: string) => Promise<void>
    readFile: (name: string) => Promise<string>
    remove: (path: string) => Promise<void>
    move: (source: string, dest: string) => Promise<void>
    writeBinaryFile: (name: string, data: ArrayBuffer) => Promise<void>
    readBinaryFile: (path: string) => Promise<ArrayBuffer>
  }
}

declare global {
  interface Window {
    Neutralino: NeutralinoNs
    api: WindowApi
  }
  // 非 window 前缀的全局访问（如 dataStore 中的 Neutralino.filesystem）
  var Neutralino: NeutralinoNs
}

export {}
