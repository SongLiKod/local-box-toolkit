import { ref, watch } from 'vue'
import { applyTheme, watchSystemTheme, type ThemeMode, type ResolvedTheme } from '@localbox/core/index'
import { themeStore } from '../store/bootstrap'

export const themeMode = ref<ThemeMode>('light')
export const resolvedTheme = ref<ResolvedTheme>('light')

let unwatch: (() => void) | null = null

function refresh(mode: ThemeMode): void {
  resolvedTheme.value = applyTheme(document.documentElement, mode)
  if (unwatch) {
    unwatch()
    unwatch = null
  }
  if (mode === 'system') {
    // 监听操作系统明暗模式自动切换（PRD 5.3）；无法读取时 applyTheme 已降级浅色
    unwatch = watchSystemTheme(() => {
      resolvedTheme.value = applyTheme(document.documentElement, 'system')
    })
  }
}

export async function initTheme(): Promise<void> {
  try {
    themeMode.value = await themeStore.getThemeMode()
  } catch {
    themeMode.value = 'light'
  }
  refresh(themeMode.value)
  watch(themeMode, async (m) => {
    refresh(m)
    try {
      await themeStore.setThemeMode(m)
    } catch {
      /* 存储不可用时仅内存生效 */
    }
  })
}

export async function setThemeMode(mode: ThemeMode): Promise<void> {
  themeMode.value = mode
}
