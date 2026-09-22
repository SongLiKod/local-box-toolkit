export type ThemePaletteId =
  | 'azure'
  | 'forest'
  | 'ocean'
  | 'violet'
  | 'sunset'
  | 'rose'
  | 'ink'
  | 'custom'

export interface ThemeTokens {
  bgPage: string
  bgCard: string
  textPrimary: string
  textSecondary: string
  border: string
  primary: string
  primaryLight: string
  success: string
  warning: string
  error: string
  shadow: string
}

export interface ThemePreset {
  id: Exclude<ThemePaletteId, 'custom'>
  name: string
  desc: string
}

export const TOKEN_CSS_VARS: Record<keyof ThemeTokens, string> = {
  bgPage: '--color-bg-page',
  bgCard: '--color-bg-card',
  textPrimary: '--color-text-primary',
  textSecondary: '--color-text-secondary',
  border: '--color-border',
  primary: '--color-primary',
  primaryLight: '--color-primary-light',
  success: '--color-success',
  warning: '--color-warning',
  error: '--color-error',
  shadow: '--color-shadow',
}

export const TOKEN_LABELS: Record<keyof ThemeTokens, string> = {
  bgPage: '页面背景',
  bgCard: '卡片背景',
  textPrimary: '主文字',
  textSecondary: '次文字',
  border: '边框',
  primary: '主色',
  primaryLight: '主色浅底',
  success: '成功',
  warning: '警告',
  error: '错误',
  shadow: '阴影',
}

const LIGHT_SEMANTIC = {
  success: '#00B42A',
  warning: '#FF7D00',
  error: '#F53F3F',
  shadow: 'rgba(0, 0, 0, 0.08)',
} as const

const DARK_SEMANTIC = {
  success: '#00C48C',
  warning: '#FF9500',
  error: '#FF4D4F',
  shadow: 'rgba(0, 0, 0, 0.32)',
} as const

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'azure', name: '晴空蓝', desc: '清爽专业，默认配色' },
  { id: 'forest', name: '松林绿', desc: '沉稳自然，护眼耐看' },
  { id: 'ocean', name: '青石海', desc: '冷静克制，适合长时间使用' },
  { id: 'violet', name: '鸢尾紫', desc: '利落精致，偏设计气质' },
  { id: 'sunset', name: '暮色橙', desc: '温暖纸感，阅读更柔和' },
  { id: 'rose', name: '蔷薇粉', desc: '轻盈柔和，对比适中' },
  { id: 'ink', name: '墨灰', desc: '低饱和中性，接近印刷纸面' },
]

const PALETTES: Record<Exclude<ThemePaletteId, 'custom'>, { light: ThemeTokens; dark: ThemeTokens }> = {
  azure: {
    light: {
      bgPage: '#F5F7FA',
      bgCard: '#FFFFFF',
      textPrimary: '#1D2129',
      textSecondary: '#6E7681',
      border: '#E5E6EB',
      primary: '#1677FF',
      primaryLight: '#E8F3FF',
      ...LIGHT_SEMANTIC,
    },
    dark: {
      bgPage: '#17171A',
      bgCard: '#232324',
      textPrimary: '#F2F3F5',
      textSecondary: '#86909C',
      border: '#2E2E30',
      primary: '#4096FF',
      primaryLight: '#192945',
      ...DARK_SEMANTIC,
    },
  },
  forest: {
    light: {
      bgPage: '#F3F7F4',
      bgCard: '#FFFFFF',
      textPrimary: '#1B2A22',
      textSecondary: '#5E7266',
      border: '#D7E4DA',
      primary: '#2F7D4F',
      primaryLight: '#E5F4EA',
      ...LIGHT_SEMANTIC,
    },
    dark: {
      bgPage: '#131A16',
      bgCard: '#1D2620',
      textPrimary: '#E8F0EA',
      textSecondary: '#8AA394',
      border: '#2B3830',
      primary: '#5DCA8A',
      primaryLight: '#1A2E22',
      ...DARK_SEMANTIC,
    },
  },
  ocean: {
    light: {
      bgPage: '#F1F7F7',
      bgCard: '#FFFFFF',
      textPrimary: '#163033',
      textSecondary: '#5B7376',
      border: '#D4E4E4',
      primary: '#0E8A8A',
      primaryLight: '#DFF4F3',
      ...LIGHT_SEMANTIC,
    },
    dark: {
      bgPage: '#101918',
      bgCard: '#182322',
      textPrimary: '#E6F4F2',
      textSecondary: '#86A8A5',
      border: '#2A3A38',
      primary: '#2DD4BF',
      primaryLight: '#16302E',
      ...DARK_SEMANTIC,
    },
  },
  violet: {
    light: {
      bgPage: '#F6F5FB',
      bgCard: '#FFFFFF',
      textPrimary: '#241E3A',
      textSecondary: '#6B6580',
      border: '#E3DFF0',
      primary: '#6D5AE6',
      primaryLight: '#EEEBFF',
      ...LIGHT_SEMANTIC,
    },
    dark: {
      bgPage: '#15131D',
      bgCard: '#201C2B',
      textPrimary: '#F0EDF8',
      textSecondary: '#9A93B3',
      border: '#322C42',
      primary: '#9B8CFF',
      primaryLight: '#2A2445',
      ...DARK_SEMANTIC,
    },
  },
  sunset: {
    light: {
      bgPage: '#FBF6F1',
      bgCard: '#FFFDFB',
      textPrimary: '#2B2218',
      textSecondary: '#7A6A58',
      border: '#EADFD3',
      primary: '#E06B3A',
      primaryLight: '#FDEEE6',
      ...LIGHT_SEMANTIC,
    },
    dark: {
      bgPage: '#1B1612',
      bgCard: '#27201A',
      textPrimary: '#F6EDE4',
      textSecondary: '#B09A86',
      border: '#3A3128',
      primary: '#FF8A5B',
      primaryLight: '#3A2418',
      ...DARK_SEMANTIC,
    },
  },
  rose: {
    light: {
      bgPage: '#FBF4F6',
      bgCard: '#FFFFFF',
      textPrimary: '#2A1720',
      textSecondary: '#7A5B68',
      border: '#EEDDE3',
      primary: '#D9467A',
      primaryLight: '#FDE8F0',
      ...LIGHT_SEMANTIC,
    },
    dark: {
      bgPage: '#1A1417',
      bgCard: '#261C21',
      textPrimary: '#F8EAF0',
      textSecondary: '#B08A99',
      border: '#3A2A31',
      primary: '#F472B6',
      primaryLight: '#3A1F2C',
      ...DARK_SEMANTIC,
    },
  },
  ink: {
    light: {
      bgPage: '#F3F4F6',
      bgCard: '#FFFFFF',
      textPrimary: '#1F2329',
      textSecondary: '#6B7280',
      border: '#E2E5EA',
      primary: '#3D4F6F',
      primaryLight: '#E8ECF2',
      ...LIGHT_SEMANTIC,
    },
    dark: {
      bgPage: '#121316',
      bgCard: '#1C1E22',
      textPrimary: '#F3F4F6',
      textSecondary: '#9CA3AF',
      border: '#2C2F36',
      primary: '#8BA3C7',
      primaryLight: '#232A36',
      ...DARK_SEMANTIC,
    },
  },
}

const PALETTE_IDS: ThemePaletteId[] = [...THEME_PRESETS.map((p) => p.id), 'custom']

export function isThemePaletteId(value: unknown): value is ThemePaletteId {
  return typeof value === 'string' && PALETTE_IDS.includes(value as ThemePaletteId)
}

export function getPresetTokens(
  palette: Exclude<ThemePaletteId, 'custom'>,
  appearance: 'light' | 'dark',
): ThemeTokens {
  return PALETTES[palette][appearance]
}

export function cloneTokens(tokens: ThemeTokens): ThemeTokens {
  return { ...tokens }
}

function parseHex(input: string): { r: number; g: number; b: number } | null {
  const raw = input.trim().replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null
  return {
    r: Number.parseInt(raw.slice(0, 2), 16),
    g: Number.parseInt(raw.slice(2, 4), 16),
    b: Number.parseInt(raw.slice(4, 6), 16),
  }
}

function toHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase()
}

export function isHexColor(value: string): boolean {
  return parseHex(value) !== null
}

export function mixHex(a: string, b: string, amount: number): string {
  const left = parseHex(a)
  const right = parseHex(b)
  if (!left || !right) return a
  const t = Math.max(0, Math.min(1, amount))
  return toHex(
    left.r + (right.r - left.r) * t,
    left.g + (right.g - left.g) * t,
    left.b + (right.b - left.b) * t,
  )
}

export function derivePrimaryLight(primary: string, appearance: 'light' | 'dark', bgPage: string): string {
  if (appearance === 'light') return mixHex('#FFFFFF', primary, 0.12)
  return mixHex(bgPage, primary, 0.28)
}

export function normalizeCustomTokens(
  appearance: 'light' | 'dark',
  custom?: Partial<ThemeTokens> | null,
  basePalette: Exclude<ThemePaletteId, 'custom'> = 'azure',
): ThemeTokens {
  const base = cloneTokens(getPresetTokens(basePalette, appearance))
  if (!custom) return base
  const next = { ...base }
  ;(Object.keys(TOKEN_CSS_VARS) as Array<keyof ThemeTokens>).forEach((key) => {
    const value = custom[key]
    if (typeof value === 'string' && value.trim()) next[key] = value.trim()
  })
  if (!custom.primaryLight && custom.primary && isHexColor(next.primary)) {
    next.primaryLight = derivePrimaryLight(next.primary, appearance, next.bgPage)
  }
  return next
}

export function resolveTokens(
  appearance: 'light' | 'dark',
  palette: ThemePaletteId = 'azure',
  custom?: Partial<ThemeTokens> | null,
): ThemeTokens {
  if (palette === 'custom') return normalizeCustomTokens(appearance, custom)
  return cloneTokens(getPresetTokens(palette, appearance))
}

export function tokensToStyle(tokens: ThemeTokens): Record<string, string> {
  const style: Record<string, string> = {}
  ;(Object.keys(TOKEN_CSS_VARS) as Array<keyof ThemeTokens>).forEach((key) => {
    style[TOKEN_CSS_VARS[key]] = tokens[key]
  })
  return style
}

export function applyTokens(root: HTMLElement, tokens: ThemeTokens): void {
  const style = tokensToStyle(tokens)
  Object.entries(style).forEach(([name, value]) => {
    root.style.setProperty(name, value)
  })
}

export function getPresetById(id: ThemePaletteId): ThemePreset | undefined {
  if (id === 'custom') return undefined
  return THEME_PRESETS.find((p) => p.id === id)
}
