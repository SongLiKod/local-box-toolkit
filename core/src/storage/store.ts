import type { KVAdapter } from './adapter'
import type {
  FavoriteItem,
  HistoryItem,
  LocalBackup,
  NoteItem,
  SealedVault,
  ThemeMode,
  ThemePreference,
  TodoItem,
  TodoRepeat,
} from '../types'
import { DEFAULT_THEME_PREFERENCE, normalizeThemePreference } from '../theme/theme'
import type { ThemePaletteId } from '../theme/palettes'

const KEY_THEME = 'themeMode'
const KEY_THEME_PREF = 'themePreference'
const KEY_FAV = 'favorites'
const KEY_HIST = 'history'
const KEY_PARAMS = 'toolParams'
const KEY_NOTES = 'notes'
const KEY_TODOS = 'todos'
const KEY_VAULT = 'vault'

const HISTORY_LIMIT = 500
const NOTES_LIMIT = 200
const TODOS_LIMIT = 500

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

  /** 清空全部收藏（设置页「清空收藏」；与逐条 toggle 等价但一次写入） */
  async clearFavorites(): Promise<void> {
    await this.adapter.set(KEY_FAV, [])
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

  async getAllToolParams(): Promise<Record<string, unknown>> {
    return (await this.adapter.get<Record<string, unknown>>(KEY_PARAMS)) ?? {}
  }

  async getNotes(): Promise<NoteItem[]> {
    return (await this.adapter.get<NoteItem[]>(KEY_NOTES)) ?? []
  }

  async upsertNote(input: { id?: string; title: string; body: string }): Promise<NoteItem> {
    const list = await this.getNotes()
    const now = Date.now()
    const title = input.title.trim() || '未命名便签'
    if (input.id) {
      const idx = list.findIndex((n) => n.id === input.id)
      if (idx >= 0) {
        list[idx] = { ...list[idx], title, body: input.body, updatedAt: now }
        await this.adapter.set(KEY_NOTES, list)
        return list[idx]
      }
    }
    const note: NoteItem = {
      id: `n_${now}_${Math.random().toString(36).slice(2, 8)}`,
      title,
      body: input.body,
      updatedAt: now,
    }
    list.unshift(note)
    if (list.length > NOTES_LIMIT) list.length = NOTES_LIMIT
    await this.adapter.set(KEY_NOTES, list)
    return note
  }

  async deleteNote(id: string): Promise<void> {
    const list = (await this.getNotes()).filter((n) => n.id !== id)
    await this.adapter.set(KEY_NOTES, list)
  }

  async getTodos(): Promise<TodoItem[]> {
    return (await this.adapter.get<TodoItem[]>(KEY_TODOS)) ?? []
  }

  /** 新建或修改待办；due 传 undefined 表示清空截止日 */
  async upsertTodo(input: {
    id?: string
    title: string
    due?: number
    repeat?: TodoRepeat
  }): Promise<TodoItem> {
    const list = await this.getTodos()
    const now = Date.now()
    const title = input.title.trim() || '未命名待办'
    const repeat: TodoRepeat = input.repeat ?? 'none'
    if (input.id) {
      const idx = list.findIndex((t) => t.id === input.id)
      if (idx >= 0) {
        list[idx] = { ...list[idx], title, due: input.due, repeat, updatedAt: now }
        await this.adapter.set(KEY_TODOS, list)
        return list[idx]
      }
    }
    const todo: TodoItem = {
      id: `t_${now}_${Math.random().toString(36).slice(2, 8)}`,
      title,
      done: false,
      due: input.due,
      repeat,
      createdAt: now,
      updatedAt: now,
    }
    list.unshift(todo)
    if (list.length > TODOS_LIMIT) list.length = TODOS_LIMIT
    await this.adapter.set(KEY_TODOS, list)
    return todo
  }

  async setTodoDone(id: string, done: boolean): Promise<TodoItem | undefined> {
    const list = await this.getTodos()
    const idx = list.findIndex((t) => t.id === id)
    if (idx < 0) return undefined
    const now = Date.now()
    list[idx] = { ...list[idx], done, doneAt: done ? now : undefined, updatedAt: now }
    await this.adapter.set(KEY_TODOS, list)
    return list[idx]
  }

  async deleteTodo(id: string): Promise<void> {
    const list = (await this.getTodos()).filter((t) => t.id !== id)
    await this.adapter.set(KEY_TODOS, list)
  }

  /** 取出保险箱密文（内容是加密的，仓库本身不解密） */
  async getVaultBlob(): Promise<SealedVault | null> {
    return (await this.adapter.get<SealedVault>(KEY_VAULT)) ?? null
  }

  async setVaultBlob(v: SealedVault | null): Promise<void> {
    await this.adapter.set(KEY_VAULT, v ?? undefined)
  }

  async exportBackup(): Promise<LocalBackup> {
    return {
      version: 1,
      exportedAt: Date.now(),
      themePreference: await this.getThemePreference(),
      favorites: await this.getFavorites(),
      history: await this.getHistory(),
      toolParams: await this.getAllToolParams(),
      notes: await this.getNotes(),
      todos: await this.getTodos(),
      vault: await this.getVaultBlob(),
    }
  }

  async importBackup(data: LocalBackup, mode: 'merge' | 'replace' = 'merge'): Promise<void> {
    if (!data || data.version !== 1) throw new Error('备份文件格式不正确')
    if (data.themePreference) await this.setThemePreference(data.themePreference)

    if (data.favorites) {
      if (mode === 'replace') {
        await this.adapter.set(KEY_FAV, data.favorites)
      } else {
        const cur = await this.getFavorites()
        const map = new Map(cur.map((f) => [f.toolId, f]))
        for (const f of data.favorites) map.set(f.toolId, f)
        await this.adapter.set(KEY_FAV, [...map.values()])
      }
    }

    if (data.history) {
      if (mode === 'replace') {
        await this.adapter.set(KEY_HIST, data.history.slice(0, HISTORY_LIMIT))
      } else {
        const cur = await this.getHistory()
        const ids = new Set(cur.map((h) => h.id))
        const merged = [...cur]
        for (const h of data.history) {
          if (!ids.has(h.id)) merged.push(h)
        }
        merged.sort((a, b) => b.time - a.time)
        if (merged.length > HISTORY_LIMIT) merged.length = HISTORY_LIMIT
        await this.adapter.set(KEY_HIST, merged)
      }
    }

    if (data.toolParams) {
      if (mode === 'replace') {
        await this.adapter.set(KEY_PARAMS, data.toolParams)
      } else {
        const cur = await this.getAllToolParams()
        await this.adapter.set(KEY_PARAMS, { ...cur, ...data.toolParams })
      }
    }

    if (data.notes) {
      if (mode === 'replace') {
        await this.adapter.set(KEY_NOTES, data.notes.slice(0, NOTES_LIMIT))
      } else {
        const cur = await this.getNotes()
        const map = new Map(cur.map((n) => [n.id, n]))
        for (const n of data.notes) {
          const old = map.get(n.id)
          if (!old || n.updatedAt >= old.updatedAt) map.set(n.id, n)
        }
        const merged = [...map.values()].sort((a, b) => b.updatedAt - a.updatedAt)
        if (merged.length > NOTES_LIMIT) merged.length = NOTES_LIMIT
        await this.adapter.set(KEY_NOTES, merged)
      }
    }

    if (data.todos) {
      if (mode === 'replace') {
        await this.adapter.set(KEY_TODOS, data.todos.slice(0, TODOS_LIMIT))
      } else {
        const cur = await this.getTodos()
        const map = new Map(cur.map((t) => [t.id, t]))
        for (const t of data.todos) {
          const old = map.get(t.id)
          if (!old || t.updatedAt >= old.updatedAt) map.set(t.id, t)
        }
        const merged = [...map.values()].sort((a, b) => b.updatedAt - a.updatedAt)
        if (merged.length > TODOS_LIMIT) merged.length = TODOS_LIMIT
        await this.adapter.set(KEY_TODOS, merged)
      }
    }

    // 保险箱密文随备份走，但绝不覆盖本机已有的保险箱（口令不同会变成打不开的孤儿）
    if (data.vault && (mode === 'replace' || !(await this.getVaultBlob()))) {
      await this.setVaultBlob(data.vault)
    }
  }
}
