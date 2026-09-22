import { describe, expect, it } from 'vitest'
import { convertUnit, convertTemperature, roundSmart, UNIT_CATEGORIES } from '../src/tools/units'
import { convertTimezone, daysBetween, addDuration } from '../src/tools/timeconv'

describe('单位换算', () => {
  it('长度：1m = 100cm', () => {
    expect(roundSmart(convertUnit('length', 'm', 'cm', 1))).toBe(100)
  })
  it('英寸：1in = 2.54cm', () => {
    expect(roundSmart(convertUnit('length', 'in', 'cm', 1))).toBeCloseTo(2.54, 6)
  })
  it('数据存储：1GB = 1024MB', () => {
    expect(convertUnit('data', 'gb', 'mb', 1)).toBe(1024)
  })
  it('温度：0°C = 32°F = 273.15K', () => {
    expect(convertTemperature(0, 'c', 'f')).toBe(32)
    expect(convertTemperature(0, 'c', 'k')).toBeCloseTo(273.15, 6)
    expect(convertTemperature(100, 'c', 'f')).toBe(212)
  })
  it('类别覆盖 PRD 便民需求（长度/面积/体积/重量/速度/时间/存储等）', () => {
    const ids = UNIT_CATEGORIES.map((c) => c.id)
    for (const need of ['length', 'area', 'volume', 'weight', 'speed', 'time', 'data']) {
      expect(ids).toContain(need)
    }
  })
  it('未知单位报错', () => {
    expect(() => convertUnit('length', 'xx', 'm', 1)).toThrow()
  })
})

describe('时间换算', () => {
  it('时区换算：北京 12:00 = 东京 13:00', () => {
    const r = convertTimezone('2026-09-22 12:00:00', 'Asia/Shanghai', 'Asia/Tokyo')
    expect(r.local).toBe('2026-09-22 13:00:00')
  })
  it('时区换算：北京 12:00 = UTC 04:00', () => {
    const r = convertTimezone('2026-09-22 12:00:00', 'Asia/Shanghai', 'UTC')
    expect(r.local).toBe('2026-09-22 04:00:00')
    expect(r.offset).toBe('UTC+00:00')
  })
  it('日期差值', () => {
    expect(daysBetween('2026-01-01', '2026-01-31')).toBe(30)
  })
  it('日期加减', () => {
    expect(addDuration(1, '2026-12-31')).toBe('2027-01-01')
    expect(addDuration(-1, '2026-01-01')).toBe('2025-12-31')
  })
})
