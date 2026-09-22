import type { KVAdapter } from './adapter'
import type { FavoriteItem, HistoryItem, ThemeMode, ThemePreference } from '../types'
import { DEFAULT_THEME_PREFERENCE, normalizeThemePreference } from '../theme/theme'
import type { ThemePaletteId } from '../theme/palettes'

const KEY_THEME = 'themeMode'
const KEY_THEME_PREF = 'themePreference'
const KEY_FAV = 'favorites'
const KEY_HIST = 'history'
const KEY_PARAMS = 'toolParams'

const HISTORY_LIMIT = 500

/** 本地持久化仓库：主题、收藏、历史、参数配置（无后端、不跨设备同步） */
export class LocalStore {
  constructor(private adapter: KVAdapter) {}

  async getThemeMode(): Promise<ThemeMode> {
    return (await this.getThemePreference()).mode
  }

  async setThemeMode(mode: ThemeMode): Promise<void> {
    const pref = await this.getThemePreference()
    await this.setThemePreference({ ...pref, mode })
  }

  async getThemePreference(): Promise<ThemePreference> {
    const stored = await this.adapter.get<ThemePreference | ThemeMode>(KEY_THEME_PREF)
    if (stored) return normalizeThemePreference(stored)
    const legacy = await this.adapter.get<ThemeMode>(KEY_THEME)
    if (legacy === 'dark' || legacy === 'system' || legacy === 'light') {
      return normalizeThemePreference(legacy)
    }
    return { ...DEFAULT_THEME_PREFERENCE }
  }

  async setThemePreference(preference: ThemePreference): Promise<void> {
    const next = normalizeThemePreference(preference)
    await this.adapter.set(KEY_THEME_PREF, next)
    await this.adapter.set(KEY_THEME, next.mode)
  }

  async setThemePalette(palette: ThemePaletteId): Promise<void> {
    const pref = await this.getThemePreference()
    await this.setThemePreference({ ...pref, palette })
  }

  async getFavorites(): Promise<FavoriteItem[]> {
    return (await this.adapter.get<FavoriteItem[]>(KEY_FAV)) ?? []
  }

  async isFavorite(toolId: string): Promise<boolean> {
    const list = await this.getFavorites()
    return list.some((f) => f.toolId === toolId)
  }

  async toggleFavorite(toolId: string): Promise<boolean> {
    const list = await this.getFavorites()
    const idx = list.findIndex((f) => f.toolId === toolId)
    if (idx >= 0) {
      list.splice(idx, 1)
      await this.adapter.set(KEY_FAV, list)
      return false
    }
    list.push({ toolId, addedAt: Date.now() })
    await this.adapter.set(KEY_FAV, list)
    return true
  }

  async getHistory(): Promise<HistoryItem[]> {
    return (await this.adapter.get<HistoryItem[]>(KEY_HIST)) ?? []
  }

  async addHistory(item: Omit<HistoryItem, 'id' | 'time'>): Promise<HistoryItem> {
    const full: HistoryItem = {
      ...item,
      id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      time: Date.now(),
    }
    const list = await this.getHistory()
    list.unshift(full)
    if (list.length > HISTORY_LIMIT) list.length = HISTORY_LIMIT
    await this.adapter.set(KEY_HIST, list)
    return full
  }

  async clearHistory(): Promise<void> {
    await this.adapter.set(KEY_HIST, [])
  }

  async getToolParams<T>(toolId: string): Promise<T | null> {
    const all = (await this.adapter.get<Record<string, T>>(KEY_PARAMS)) ?? {}
    return all[toolId] ?? null
  }

  async setToolParams<T>(toolId: string, params: T): Promise<void> {
    const all = (await this.adapter.get<Record<string, T>>(KEY_PARAMS)) ?? {}
    all[toolId] = params
    await this.adapter.set(KEY_PARAMS, all)
  }
}
