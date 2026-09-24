import { computed, reactive, watch } from 'vue'
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
/** 自定义配色（浅色/深色各自的覆盖色值），设置页编辑器读写用 */
export const customColors = computed(() => state.custom)
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

/** 主题/配色变化时同步原生导航栏颜色（H5 顶栏不随 CSS 变量自动变，否则深色模式下白顶很突兀） */
function syncNavigationBar(): void {
  try {
    const dark = resolvedTheme.value === 'dark'
    const bgMatch = /--color-bg-page:\s*([^;]+)/.exec(themeStyle.value)
    const bg = (bgMatch?.[1] ?? '').trim() || (dark ? '#17171a' : '#f5f7fa')
    uni.setNavigationBarColor({
      frontColor: dark ? '#ffffff' : '#000000',
      backgroundColor: bg,
      animation: { duration: 0, timingFunc: 'linear' },
    })
  } catch {
    /* 平台不支持或时机过早时忽略 */
  }
}

watch(themeStyle, syncNavigationBar, { immediate: true })

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

/** 清空自定义色值并回到默认「晴空蓝」（与 Web 设置「恢复默认」一致） */
export async function resetCustomTheme(): Promise<void> {
  state.custom = {}
  state.palette = 'azure'
  await persist()
}
