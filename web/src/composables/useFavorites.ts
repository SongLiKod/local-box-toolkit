import { ref } from 'vue'
import { store } from '../store/bootstrap'
import type { HistoryItem } from '@localbox/core/index'

export const favorites = ref<Set<string>>(new Set())
export const history = ref<HistoryItem[]>([])

export async function loadFavorites(): Promise<void> {
  try {
    const list = await store.getFavorites()
    favorites.value = new Set(list.map((f) => f.toolId))
  } catch {
    favorites.value = new Set()
  }
}

export async function toggleFavorite(toolId: string): Promise<boolean> {
  const added = await store.toggleFavorite(toolId)
  await loadFavorites()
  return added
}

export async function loadHistory(): Promise<void> {
  try {
    history.value = await store.getHistory()
  } catch {
    history.value = []
  }
}

export async function recordHistory(
  toolId: string,
  toolName: string,
  action: string,
  detail: string,
  payload?: unknown
): Promise<void> {
  try {
    await store.addHistory({ toolId, toolName, action, detail, payload })
    history.value = await store.getHistory()
  } catch {
    /* 忽略记录失败 */
  }
}

export async function clearHistory(): Promise<void> {
  await store.clearHistory()
  history.value = []
}

export async function clearFavorites(): Promise<void> {
  await store.clearFavorites()
  favorites.value = new Set()
}
