import type { ThemeMode, ThemePreference, ThemeCustomColors } from '../types'
import {
  applyTokens,
  isThemePaletteId,
  resolveTokens,
  type ThemePaletteId,
  type ThemeTokens,
} from './palettes'

export type ResolvedTheme = 'light' | 'dark'
export type { ThemePaletteId, ThemeTokens } from './palettes'
export {
  THEME_PRESETS,
  TOKEN_CSS_VARS,
  TOKEN_LABELS,
  applyTokens,
  cloneTokens,
  derivePrimaryLight,
  getPresetById,
  getPresetTokens,
  isHexColor,
  isThemePaletteId,
  mixHex,
  normalizeCustomTokens,
  resolveTokens,
  tokensToStyle,
} from './palettes'

export const DEFAULT_THEME_PREFERENCE: ThemePreference = {
  mode: 'light',
  palette: 'azure',
}

export function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

/**
 * 解析实际主题：跟随系统时读取系统明暗；
 * 设备无法读取系统主题时降级为浅色（PRD 5.3）。
 */
export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'dark') return 'dark'
  if (mode === 'light') return 'light'
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light'
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function normalizeThemePreference(input?: Partial<ThemePreference> | ThemeMode | null): ThemePreference {
  if (typeof input === 'string') {
    const mode: ThemeMode = input === 'dark' || input === 'system' ? input : 'light'
    return { mode, palette: 'azure' }
  }
  const mode: ThemeMode =
    input?.mode === 'dark' || input?.mode === 'system' || input?.mode === 'light' ? input.mode : 'light'
  const palette: ThemePaletteId = isThemePaletteId(input?.palette) ? input.palette : 'azure'
  const custom = sanitizeCustom(input?.custom)
  return custom ? { mode, palette, custom } : { mode, palette }
}

function sanitizeCustom(custom?: ThemeCustomColors | null): ThemeCustomColors | undefined {
  if (!custom) return undefined
  const light = pickPartialTokens(custom.light)
  const dark = pickPartialTokens(custom.dark)
  if (!light && !dark) return undefined
  return { ...(light ? { light } : {}), ...(dark ? { dark } : {}) }
}

function pickPartialTokens(tokens?: Partial<ThemeTokens> | null): Partial<ThemeTokens> | undefined {
  if (!tokens) return undefined
  const next: Partial<ThemeTokens> = {}
  let has = false
  ;(Object.keys(tokens) as Array<keyof ThemeTokens>).forEach((key) => {
    const value = tokens[key]
    if (typeof value === 'string' && value.trim()) {
      next[key] = value.trim()
      has = true
    }
  })
  return has ? next : undefined
}

export function resolveAppearanceTokens(
  preference: ThemePreference,
  appearance: ResolvedTheme = resolveTheme(preference.mode),
): ThemeTokens {
  return resolveTokens(appearance, preference.palette, preference.custom?.[appearance])
}

/** 将主题类与配色变量挂到 :root（html），CSS 变量整体切换 */
export function applyTheme(
  root: HTMLElement,
  mode: ThemeMode,
  preference?: ThemePreference,
): ResolvedTheme {
  const pref = preference ?? normalizeThemePreference({ mode })
  const resolved = resolveTheme(mode)
  root.classList.remove('light', 'dark')
  root.classList.add(resolved)
  root.dataset.theme = resolved
  root.dataset.palette = pref.palette
  root.style.colorScheme = resolved
  applyTokens(root, resolveAppearanceTokens({ ...pref, mode }, resolved))
  return resolved
}

/** 监听系统明暗变化，返回取消订阅函数；不支持时返回 null（调用方保持浅色降级） */
export function watchSystemTheme(cb: (theme: ResolvedTheme) => void): (() => void) | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
  try {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent): void => cb(e.matches ? 'dark' : 'light')
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
    const legacy = mq as unknown as {
      addListener?: (fn: (e: MediaQueryListEvent) => void) => void
      removeListener?: (fn: (e: MediaQueryListEvent) => void) => void
    }
    if (typeof legacy.addListener === 'function') {
      legacy.addListener(handler)
      return () => legacy.removeListener?.(handler)
    }
    return null
  } catch {
    return null
  }
}
