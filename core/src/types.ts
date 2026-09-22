export interface NativeBridge {
  platform: 'electron'
  configGet(key: string): Promise<string | null>
  configSet(key: string, value: string): Promise<void>
  saveFile(name: string, data: ArrayBuffer): Promise<string | null>
  renameFiles(map: Record<string, string>): Promise<string[]>
  openPath(path: string): Promise<string>
}

declare global {
  interface Window {
    localboxNative?: NativeBridge
  }
}

export type ThemeMode = 'light' | 'dark' | 'system'

export interface FavoriteItem {
  toolId: string
  addedAt: number
}

export interface HistoryItem {
  id: string
  toolId: string
  toolName: string
  action: string
  detail: string
  time: number
}

export interface ProgressInfo {
  done: number
  total: number
  label: string
}

export type ProgressCb = (info: ProgressInfo) => void

export interface ConvertedFile {
  name: string
  blob: Blob
}
