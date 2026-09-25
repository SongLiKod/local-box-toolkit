export interface NativeBridge {
  platform: 'electron'
  configGet(key: string): Promise<string | null>
  configSet(key: string, value: string): Promise<void>
  saveFile(name: string, data: ArrayBuffer): Promise<string | null>
  renameFiles(map: Record<string, string>): Promise<string[]>
  openPath(path: string): Promise<string>
  /** 用系统浏览器打开外部地址（发布页等） */
  openExternal?(url: string): Promise<void>
}

declare global {
  interface Window {
    localboxNative?: NativeBridge
  }
}

import type { ThemePaletteId, ThemeTokens } from './theme/palettes'

export type ThemeMode = 'light' | 'dark' | 'system'

export interface ThemeCustomColors {
  light?: Partial<ThemeTokens>
  dark?: Partial<ThemeTokens>
}

export interface ThemePreference {
  mode: ThemeMode
  palette: ThemePaletteId
  custom?: ThemeCustomColors
}

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
  payload?: unknown
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

export interface NoteItem {
  id: string
  title: string
  body: string
  updatedAt: number
}

/** 待办重复规则：none = 一次性；daily = 每天；weekly = 每周（按自然周，周一起算） */
export type TodoRepeat = 'none' | 'daily' | 'weekly'

import type { SealedVault } from './devtools/vault'

export type { SealedVault }

export interface TodoItem {
  id: string
  title: string
  done: boolean
  /** 截止日（本地 00:00 时间戳）；缺省表示无期限、始终算"今天要做的" */
  due?: number
  repeat: TodoRepeat
  /** 最近一次勾选完成的时间，用于判断重复任务本周期是否已完成 */
  doneAt?: number
  createdAt: number
  updatedAt: number
}

export interface LocalBackup {
  version: 1
  exportedAt: number
  themePreference?: ThemePreference
  favorites?: FavoriteItem[]
  history?: HistoryItem[]
  toolParams?: Record<string, unknown>
  notes?: NoteItem[]
  todos?: TodoItem[]
  /** 已加密的保险箱密文，随备份走但导入时不会覆盖已有保险箱 */
  vault?: SealedVault | null
}
