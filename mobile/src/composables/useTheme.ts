import { computed, reactive } from 'vue'
import { resolveTheme, watchSystemTheme, type ThemeMode, type ResolvedTheme } from '@localbox/core/index'
import { store } from '../store'

const state = reactive<{ mode: ThemeMode; system: ResolvedTheme }>({
  mode: 'light',
  system: 'light',
})

watchSystemTheme((t) => {
  state.system = t
})

export const themeMode = computed(() => state.mode)
export const resolvedTheme = computed<ResolvedTheme>(() =>
  state.mode === 'system' ? state.system : resolveTheme(state.mode)
)
export const themeClass = computed(() => (resolvedTheme.value === 'dark' ? 'theme-dark' : 'theme-light'))

export async function initTheme(): Promise<void> {
  try {
    state.mode = await store.getThemeMode()
  } catch {
    state.mode = 'light'
  }
}

export async function setThemeMode(mode: ThemeMode): Promise<void> {
  state.mode = mode
  try {
    await store.setThemeMode(mode)
  } catch {
    /* ignore */
  }
}
