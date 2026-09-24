import { describe, expect, it } from 'vitest'
import {
  derivePrimaryLight,
  getPresetTokens,
  isHexColor,
  mixHex,
  normalizeThemePreference,
  resolveAppearanceTokens,
  resolveTheme,
  resolveTokens,
} from '../src/theme/theme'

describe('主题解析', () => {
  it('浅色/深色直接返回', () => {
    expect(resolveTheme('light')).toBe('light')
    expect(resolveTheme('dark')).toBe('dark')
  })
  it('跟随系统在无法读取时降级为浅色（PRD 5.3）', () => {
    expect(resolveTheme('system')).toBe('light')
  })
})

describe('配色预设', () => {
  it('预设浅色/深色均包含完整色板', () => {
    const light = getPresetTokens('forest', 'light')
    const dark = getPresetTokens('forest', 'dark')
    expect(light.primary).toMatch(/^#/)
    expect(dark.bgPage).toMatch(/^#/)
    expect(light.bgPage).not.toBe(dark.bgPage)
  })

  it('自定义配色覆盖主色并自动推导浅底', () => {
    const tokens = resolveTokens('light', 'custom', { primary: '#E06B3A', bgPage: '#FBF6F1' })
    expect(tokens.primary).toBe('#E06B3A')
    expect(tokens.primaryLight).toBe(derivePrimaryLight('#E06B3A', 'light', '#FBF6F1'))
  })

  it('兼容旧版仅保存 mode 字符串', () => {
    expect(normalizeThemePreference('dark')).toEqual({ mode: 'dark', palette: 'azure' })
    expect(normalizeThemePreference({ mode: 'system', palette: 'violet' }).palette).toBe('violet')
  })

  it('解析偏好时使用对应外观的自定义色', () => {
    const tokens = resolveAppearanceTokens(
      {
        mode: 'dark',
        palette: 'custom',
        custom: { dark: { primary: '#9B8CFF' } },
      },
      'dark',
    )
    expect(tokens.primary).toBe('#9B8CFF')
  })

  it('HEX 混色与校验', () => {
    expect(isHexColor('#1677FF')).toBe(true)
    expect(isHexColor('red')).toBe(false)
    expect(mixHex('#000000', '#FFFFFF', 0.5)).toBe('#808080')
  })
})
