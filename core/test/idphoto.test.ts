import { describe, expect, it } from 'vitest'
import { PHOTO_SPECS, specPixelSize, mmToPx, BG_COLORS } from '../src/idphoto/specs'

describe('证件照尺寸', () => {
  it('内置一寸/二寸/小二寸/身份证/护照/签证', () => {
    const names = PHOTO_SPECS.map((s) => s.name).join('|')
    for (const need of ['一寸', '二寸', '小二寸', '身份证', '护照', '签证']) {
      expect(names).toContain(need)
    }
  })
  it('一寸 300DPI 像素约 295×413', () => {
    const spec = PHOTO_SPECS.find((s) => s.name === '一寸')!
    const { width, height } = specPixelSize(spec, 300)
    expect(width).toBe(Math.round((25 / 25.4) * 300))
    expect(height).toBe(Math.round((35 / 25.4) * 300))
  })
  it('mmToPx 正确', () => {
    expect(mmToPx(25.4, 300)).toBe(300)
  })
  it('背景色含白蓝红', () => {
    expect(Object.keys(BG_COLORS)).toEqual(expect.arrayContaining(['white', 'blue', 'red']))
  })
})
