import {
  LocalStore,
  IndexedDbAdapter,
  LocalStorageAdapter,
  NativeJsonAdapter,
  getNative,
} from '@localbox/core/index'

/**
 * 三端存储介质选择（PRD 3.5 / TechDoc 5）：
 * - Electron：AppData 本地 JSON 配置文件
 * - Web：IndexedDB + localStorage（主题走 localStorage 快速读取）
 */
export const nativeBridge = getNative()

export const kvAdapter = nativeBridge ? new NativeJsonAdapter() : new IndexedDbAdapter()
export const themeAdapter = nativeBridge ? new NativeJsonAdapter() : new LocalStorageAdapter()

export const store = new LocalStore(kvAdapter)
export const themeStore = new LocalStore(themeAdapter)
