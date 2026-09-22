import { computed, reactive } from 'vue'
import {
  normalizeThemePreference,
  resolveAppearanceTokens,
  resolveTheme,
  tokensToStyle,
  watchSystemTheme,
  type ThemeCustomColors,
  type ThemeMode,
  type ThemePaletteId,
  type ResolvedTheme,
  type ThemeTokens,
} from '@localbox/core/index'
import { store } from '../store'

const state = reactive<{
  mode: ThemeMode
  palette: ThemePaletteId
  custom: ThemeCustomColors
  system: ResolvedTheme
}>({
  mode: 'light',
  palette: 'azure',
  custom: {},
  system: 'light',
})

watchSystemTheme((t) => {
  state.system = t
})

export const themeMode = computed(() => state.mode)
export const themePalette = computed(() => state.palette)
export const resolvedTheme = computed<ResolvedTheme>(() =>
  state.mode === 'system' ? state.system : resolveTheme(state.mode),
)
export const themeClass = computed(() => (resolvedTheme.value === 'dark' ? 'theme-dark' : 'theme-light'))
export const themeStyle = computed(() =>
  tokensToStyle(
    resolveAppearanceTokens(
      normalizeThemePreference({
        mode: state.mode,
        palette: state.palette,
        custom: state.custom,
      }),
      resolvedTheme.value,
    ),
  ),
)

async function persist(): Promise<void> {
  try {
    await store.setThemePreference(
      normalizeThemePreference({
        mode: state.mode,
        palette: state.palette,
        custom: state.custom,
      }),
    )
  } catch {
    /* ignore */
  }
}

export async function initTheme(): Promise<void> {
  try {
    const pref = await store.getThemePreference()
    state.mode = pref.mode
    state.palette = pref.palette
    state.custom = pref.custom ? { ...pref.custom } : {}
  } catch {
    state.mode = 'light'
    state.palette = 'azure'
    state.custom = {}
  }
}

export async function setThemeMode(mode: ThemeMode): Promise<void> {
  state.mode = mode
  await persist()
}

export async function setThemePalette(palette: ThemePaletteId): Promise<void> {
  state.palette = palette
  await persist()
}

export async function setCustomTokens(appearance: ResolvedTheme, patch: Partial<ThemeTokens>): Promise<void> {
  state.custom = {
    ...state.custom,
    [appearance]: {
      ...(state.custom[appearance] ?? {}),
      ...patch,
    },
  }
  state.palette = 'custom'
  await persist()
}
