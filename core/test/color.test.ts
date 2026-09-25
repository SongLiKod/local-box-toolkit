import { describe, expect, it } from 'vitest'
import {
  bestTextOn,
  contrastRatio,
  hexToRgb,
  hsvToRgb,
  hslToRgb,
  normalizeHex,
  rgbToHex,
  rgbToHsl,
  rgbToHsv,
  shades,
} from '../src/tools/color'

describe('颜色工具', () => {
  it('hex → rgb', () => {
    expect(hexToRgb('#1677FF')).toEqual({ r: 22, g: 119, b: 255 })
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 })
  })
  it('rgb → hex', () => {
    expect(rgbToHex({ r: 22, g: 119, b: 255 })).toBe('#1677FF')
  })
  it('hsl 往返', () => {
    const src = hexToRgb('#1677FF')
    const back = hslToRgb(rgbToHsl(src))
    expect(Math.abs(back.r - src.r)).toBeLessThanOrEqual(4)
    expect(Math.abs(back.g - src.g)).toBeLessThanOrEqual(2)
    expect(Math.abs(back.b - src.b)).toBeLessThanOrEqual(2)
  })
  it('色阶生成数量', () => {
    expect(shades('#1677FF', 6)).toHaveLength(6)
  })
  it('非法 hex 报错', () => {
    expect(() => hexToRgb('zzz')).toThrow()
  })
})

describe('HSV 转换', () => {
  it('rgb → hsv 关键值', () => {
    expect(rgbToHsv({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 100, v: 100 })
    expect(rgbToHsv({ r: 0, g: 255, b: 0 })).toEqual({ h: 120, s: 100, v: 100 })
    expect(rgbToHsv({ r: 0, g: 0, b: 255 })).toEqual({ h: 240, s: 100, v: 100 })
    expect(rgbToHsv({ r: 0, g: 0, b: 0 })).toEqual({ h: 0, s: 0, v: 0 })
    expect(rgbToHsv({ r: 255, g: 255, b: 255 })).toEqual({ h: 0, s: 0, v: 100 })
    expect(rgbToHsv({ r: 128, g: 128, b: 128 })).toEqual({ h: 0, s: 0, v: 50 })
  })

  it('hsv → rgb 关键值与角度归一', () => {
    expect(hsvToRgb({ h: 0, s: 100, v: 100 })).toEqual({ r: 255, g: 0, b: 0 })
    expect(hsvToRgb({ h: 120, s: 100, v: 100 })).toEqual({ r: 0, g: 255, b: 0 })
    expect(hsvToRgb({ h: 240, s: 100, v: 100 })).toEqual({ r: 0, g: 0, b: 255 })
    expect(hsvToRgb({ h: 0, s: 0, v: 100 })).toEqual({ r: 255, g: 255, b: 255 })
    expect(hsvToRgb({ h: 0, s: 100, v: 0 })).toEqual({ r: 0, g: 0, b: 0 })
    expect(hsvToRgb({ h: 360, s: 100, v: 100 })).toEqual(hsvToRgb({ h: 0, s: 100, v: 100 }))
    expect(hsvToRgb({ h: -30, s: 100, v: 100 })).toEqual(hsvToRgb({ h: 330, s: 100, v: 100 }))
  })

  it('往返误差 ≤ 3', () => {
    for (const hex of ['#1677FF', '#F7BA1E', '#722ED1', '#13C2C2', '#EB2F96', '#86909C']) {
      const src = hexToRgb(hex)
      const back = hsvToRgb(rgbToHsv(src))
      expect(Math.abs(back.r - src.r)).toBeLessThanOrEqual(3)
      expect(Math.abs(back.g - src.g)).toBeLessThanOrEqual(3)
      expect(Math.abs(back.b - src.b)).toBeLessThanOrEqual(3)
    }
  })
})

describe('HEX 规范化', () => {
  it('简写与大小写归一', () => {
    expect(normalizeHex('#abc')).toBe('#AABBCC')
    expect(normalizeHex('1677ff')).toBe('#1677FF')
    expect(normalizeHex('  #Ff0  ')).toBe('#FFFF00')
  })
  it('非法输入抛错', () => {
    expect(() => normalizeHex('#12345')).toThrow()
    expect(() => normalizeHex('rgb(1,2,3)')).toThrow()
  })
})

describe('对比度（WCAG）', () => {
  it('黑白极值', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBe(21)
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBe(1)
  })
  it('对称性', () => {
    expect(contrastRatio('#1677FF', '#FFFFFF')).toBe(contrastRatio('#FFFFFF', '#1677FF'))
  })
  it('取更清晰的文字色', () => {
    expect(bestTextOn('#FFFFFF')).toBe('#000000')
    expect(bestTextOn('#000000')).toBe('#FFFFFF')
    for (const bg of ['#1677FF', '#F7BA1E', '#F5F7FA', '#722ED1']) {
      const best = bestTextOn(bg)
      expect(contrastRatio(bg, best)).toBe(
        Math.max(contrastRatio(bg, '#FFFFFF'), contrastRatio(bg, '#000000')),
      )
    }
  })
})
