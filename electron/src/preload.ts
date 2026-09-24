import { contextBridge, ipcRenderer } from 'electron'

/**
 * preload 桥接：向渲染进程暴露本地能力（Electron fs/path + AppData 配置）。
 * 与 core/src/types.ts 的 NativeBridge 接口对应。
 */
contextBridge.exposeInMainWorld('localboxNative', {
  platform: 'electron',
  configGet: (key: string): Promise<string | null> => ipcRenderer.invoke('config:get', key),
  configSet: (key: string, value: string): Promise<boolean> => ipcRenderer.invoke('config:set', key, value),
  saveFile: (name: string, data: ArrayBuffer): Promise<string | null> =>
    ipcRenderer.invoke('file:save', name, data),
  renameFiles: (map: Record<string, string>): Promise<string[]> =>
    ipcRenderer.invoke('file:rename', map),
  openPath: (p: string): Promise<string> => ipcRenderer.invoke('shell:open', p),
  openExternal: async (url: string): Promise<void> => {
    await ipcRenderer.invoke('shell:external', url)
  },
})
