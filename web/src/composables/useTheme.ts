import { computed, ref, watch } from 'vue'
import {
  applyTheme,
  normalizeThemePreference,
  watchSystemTheme,
  type ThemeMode,
  type ThemePaletteId,
  type ThemePreference,
  type ThemeCustomColors,
  type ResolvedTheme,
  type ThemeTokens,
} from '@localbox/core/index'
import { themeStore } from '../store/bootstrap'

export const themeMode = ref<ThemeMode>('light')
export const themePalette = ref<ThemePaletteId>('azure')
export const customColors = ref<ThemeCustomColors>({})
export const resolvedTheme = ref<ResolvedTheme>('light')

let unwatch: (() => void) | null = null
let persistReady = false

export const themePreference = computed<ThemePreference>(() =>
  normalizeThemePreference({
    mode: themeMode.value,
    palette: themePalette.value,
    custom: customColors.value,
  }),
)

function applyCurrent(): void {
  resolvedTheme.value = applyTheme(document.documentElement, themeMode.value, themePreference.value)
  if (unwatch) {
    unwatch()
    unwatch = null
  }
  if (themeMode.value === 'system') {
    unwatch = watchSystemTheme(() => {
      resolvedTheme.value = applyTheme(document.documentElement, 'system', themePreference.value)
    })
  }
}

async function persist(): Promise<void> {
  if (!persistReady) return
  try {
    await themeStore.setThemePreference(themePreference.value)
  } catch {
    /* 存储不可用时仅内存生效 */
  }
}

export async function initTheme(): Promise<void> {
  try {
    const pref = await themeStore.getThemePreference()
    themeMode.value = pref.mode
    themePalette.value = pref.palette
    customColors.value = pref.custom ? { ...pref.custom } : {}
  } catch {
    themeMode.value = 'light'
    themePalette.value = 'azure'
    customColors.value = {}
  }
  applyCurrent()
  persistReady = true
  watch([themeMode, themePalette, customColors], () => {
    applyCurrent()
    void persist()
  }, { deep: true })
}

export async function setThemeMode(mode: ThemeMode): Promise<void> {
  themeMode.value = mode
}

export async function setThemePalette(palette: ThemePaletteId): Promise<void> {
  themePalette.value = palette
}

export async function setCustomTokens(appearance: ResolvedTheme, patch: Partial<ThemeTokens>): Promise<void> {
  customColors.value = {
    ...customColors.value,
    [appearance]: {
      ...(customColors.value[appearance] ?? {}),
      ...patch,
    },
  }
  themePalette.value = 'custom'
}

export async function resetCustomTheme(): Promise<void> {
  customColors.value = {}
  themePalette.value = 'azure'
}
