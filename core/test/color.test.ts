import { describe, expect, it } from 'vitest'
import { hexToRgb, rgbToHex, rgbToHsl, hslToRgb, shades } from '../src/tools/color'

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
