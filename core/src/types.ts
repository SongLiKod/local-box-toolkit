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

export interface LocalBackup {
  version: 1
  exportedAt: number
  themePreference?: ThemePreference
  favorites?: FavoriteItem[]
  history?: HistoryItem[]
  toolParams?: Record<string, unknown>
  notes?: NoteItem[]
}
