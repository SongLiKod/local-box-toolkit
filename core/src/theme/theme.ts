import type { ThemeMode } from '../types'

export type ResolvedTheme = 'light' | 'dark'

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

/** 将主题类挂到 :root（html），CSS 变量整体切换 */
export function applyTheme(root: HTMLElement, mode: ThemeMode): ResolvedTheme {
  const resolved = resolveTheme(mode)
  root.classList.remove('light', 'dark')
  root.classList.add(resolved)
  root.dataset.theme = resolved
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
    // 旧版 Safari 兼容
    const legacy = mq as unknown as { addListener?: (fn: (e: MediaQueryListEvent) => void) => void; removeListener?: (fn: (e: MediaQueryListEvent) => void) => void }
    if (typeof legacy.addListener === 'function') {
      legacy.addListener(handler)
      return () => legacy.removeListener?.(handler)
    }
    return null
  } catch {
    return null
  }
}
