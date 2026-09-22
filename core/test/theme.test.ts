import { describe, expect, it } from 'vitest'
import { resolveTheme } from '../src/theme/theme'

describe('主题解析', () => {
  it('浅色/深色直接返回', () => {
    expect(resolveTheme('light')).toBe('light')
    expect(resolveTheme('dark')).toBe('dark')
  })
  it('跟随系统在无法读取时降级为浅色（PRD 5.3）', () => {
    // Node 环境无 window.matchMedia → 应降级 light
    expect(resolveTheme('system')).toBe('light')
  })
})
