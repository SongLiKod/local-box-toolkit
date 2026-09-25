import { describe, expect, it } from 'vitest'
import {
  defaultZones,
  getWorldClock,
  getZoneClock,
  meetingPlan,
  relativeTime,
  zoneLabel,
  zoneOptions,
} from '../src/devtools/worldtime'
import { convertTimezone } from '../src/tools/timeconv'

/** 2025-09-21T16:00:00Z（北京 2025-09-22 00:00，纽约夏令时 UTC-4） */
const TS = 1758470400000

describe('世界时钟', () => {
  it('同一时刻各城市本地时间与 UTC 偏移', () => {
    const clocks = getWorldClock(TS, ['Asia/Shanghai', 'America/New_York', 'UTC'])
    const [bj, ny, utc] = clocks
    expect(bj.local).toBe('2025-09-22 00:00:00')
    expect(bj.offset).toBe('UTC+08:00')
    expect(bj.weekday).toBe('周一')
    expect(ny.local).toBe('2025-09-21 12:00:00')
    expect(ny.offset).toBe('UTC-04:00')
    expect(utc.offset).toBe('UTC+00:00')
  })

  it('相对基准时区的时差（分钟）', () => {
    const [bj, ny] = getWorldClock(TS, ['Asia/Shanghai', 'America/New_York'], { baseZone: 'Asia/Shanghai' })
    expect(bj.diffMinutes).toBe(0)
    expect(ny.diffMinutes).toBe(-720) // 夏令时：纽约比北京慢 12 小时
  })

  it('工作时段、白天与周末标记', () => {
    const [morning, night] = getWorldClock(TS, ['Asia/Shanghai', 'Asia/Shanghai'])
    expect(morning.inWorkHours).toBe(false) // 00:00 不在 9-18
    expect(morning.isDaytime).toBe(false)
    expect(night.isWeekend).toBe(false) // 2025-09-22 是周一
    const sunday = getZoneClock(Date.parse('2025-09-21T12:00:00Z'), 'UTC', { workStart: 9, workEnd: 18 })
    expect(sunday.isWeekend).toBe(true)
    expect(sunday.inWorkHours).toBe(true) // 12:00 在时段内（是否周末由调用方决定）
  })

  it('默认城市列表包含本地时区且去重', () => {
    const zones = defaultZones()
    expect(zones.length).toBeGreaterThanOrEqual(5)
    expect(new Set(zones).size).toBe(zones.length)
  })

  it('城市中文名与选项', () => {
    expect(zoneLabel('Asia/Shanghai')).toBe('中国·上海')
    expect(zoneLabel('Mars/Olympus')).toBe('Mars/Olympus')
    const opts = zoneOptions()
    expect(opts.length).toBeGreaterThan(30)
    expect(opts.find((o) => o.zone === 'Asia/Shanghai')?.label).toContain('UTC+08:00')
  })
})

describe('会议时间对比', () => {
  it('北京与东京 9-18 有大量重叠', () => {
    const plan = meetingPlan({ zones: ['Asia/Shanghai', 'Asia/Tokyo'], date: '2026-09-22' })
    expect(plan.slots.length).toBe(24)
    expect(plan.available.length).toBeGreaterThan(0)
    // 东京比北京快 1 小时：北京 9:00-17:00 = 东京 10:00-18:00，取交集 09:00-17:00（基准=北京）
    expect(plan.available[0]).toEqual({ start: '09:00', end: '17:00', minutes: 480 })
  })

  it('北京与纽约 9-18 无法重叠', () => {
    const plan = meetingPlan({ zones: ['Asia/Shanghai', 'America/New_York'], date: '2026-09-22' })
    expect(plan.available).toEqual([])
    expect(plan.slots.every((s) => !s.ok)).toBe(true)
  })

  it('伦敦与纽约可以约到共同工作时间', () => {
    const plan = meetingPlan({
      zones: ['Europe/London', 'America/New_York'],
      date: '2026-09-22',
      refZone: 'Europe/London',
    })
    expect(plan.available.length).toBeGreaterThan(0)
    // 夏令时：纽约比伦敦慢 5 小时 → 伦敦 14:00 = 纽约 09:00
    // 纽约 09:00-13:00 = 伦敦 14:00-18:00
    expect(plan.available[0]).toEqual({ start: '14:00', end: '18:00', minutes: 240 })
    expect(plan.slots.find((s) => s.time === '14:00')?.clocks[1].time).toBe('09:00')
  })

  it('30 分钟粒度与工作时段可配置', () => {
    const plan = meetingPlan({
      zones: ['Asia/Shanghai', 'Asia/Tokyo'],
      date: '2026-09-22',
      stepMinutes: 30,
      workStart: 10,
      workEnd: 16,
    })
    expect(plan.slots.length).toBe(48)
    expect(plan.workStart).toBe(10)
    expect(plan.available[0]).toEqual({ start: '10:00', end: '15:00', minutes: 300 })
  })

  it('非法参数与空时区报错', () => {
    expect(() => meetingPlan({ zones: [] })).toThrow()
    expect(() => meetingPlan({ zones: ['UTC'], stepMinutes: 7 })).toThrow()
    expect(() => meetingPlan({ zones: ['UTC'], workStart: 18, workEnd: 9 })).toThrow()
  })

  it('未指定日期时使用基准时区今天', () => {
    const plan = meetingPlan({ zones: ['UTC'], refZone: 'UTC' })
    expect(plan.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(plan.slots[0].time).toBe('00:00')
  })
})

describe('相对时间', () => {
  const now = Date.parse('2026-09-22T12:00:00Z')
  it('过去与未来', () => {
    expect(relativeTime(now, now)).toBe('刚刚')
    expect(relativeTime(now - 10 * 60_000, now)).toBe('10 分钟前')
    expect(relativeTime(now + 3 * 3_600_000, now)).toBe('3 小时后')
    expect(relativeTime(now - 5 * 86_400_000, now)).toBe('5 天前')
    expect(relativeTime(now - 400 * 86_400_000, now)).toBe('1 年前')
  })
})

describe('时区工具复用', () => {
  it('convertTimezone 仍按原逻辑工作', () => {
    const r = convertTimezone('2026-09-22 12:00:00', 'Asia/Shanghai', 'Asia/Tokyo')
    expect(r.local).toBe('2026-09-22 13:00:00')
    expect(r.offset).toBe('UTC+09:00')
  })
})
