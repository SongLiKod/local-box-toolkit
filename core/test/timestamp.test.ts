import { describe, expect, it } from 'vitest'
import { timestampToDate, dateToTimestamp } from '../src/devtools/timestamp'

describe('时间戳转换', () => {
  it('10位秒级自动识别', () => {
    const r = timestampToDate(1758470400)
    expect(r.millis).toBe(1758470400000)
    expect(r.iso).toBe('2025-09-21T16:00:00.000Z')
  })
  it('13位毫秒级自动识别', () => {
    const r = timestampToDate(1758470400123)
    expect(r.millis).toBe(1758470400123)
    expect(r.seconds).toBe(1758470400)
  })
  it('日期字符串转时间戳（本地时区）', () => {
    const r = dateToTimestamp('2026-09-22 00:00:00')
    const back = timestampToDate(r.millis)
    expect(back.local.startsWith('2026-09-22')).toBe(true)
  })
  it('非法输入报错', () => {
    expect(() => dateToTimestamp('not-a-date')).toThrow()
  })
})
