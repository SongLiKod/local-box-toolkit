import { describe, expect, it } from 'vitest'
import {
  buildCron,
  describeCron,
  describeField,
  formatRunTime,
  nextRunTimes,
  parseCron,
} from '../src/devtools/cron'

describe('Cron 解析', () => {
  it('5 字段结构与描述', () => {
    const p = parseCron('0 9 * * *')
    expect(p.useSeconds).toBe(false)
    expect(p.fields.map((f) => f.key)).toEqual(['minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek'])
    expect(p.description).toBe('每天 9 时 0 分 执行')
  })

  it('6 字段含秒', () => {
    const p = parseCron('*/10 * * * * *')
    expect(p.useSeconds).toBe(true)
    expect(p.fields[0].values).toEqual([0, 10, 20, 30, 40, 50])
    expect(p.description).toBe('每 10 秒 执行')
  })

  it('步长与区间描述', () => {
    expect(describeCron('*/5 * * * *')).toBe('每 5 分钟 执行')
    expect(describeCron('0 9-17 * * *')).toBe('每天 9~17 时 0 分 执行')
    expect(describeCron('0 */6 * * *')).toBe('每 6 小时 0 分 执行')
  })

  it('周、日与月描述', () => {
    expect(describeCron('0 9 * * 1')).toBe('每周一 9 时 0 分 执行')
    expect(describeCron('0 9 * * 1-5')).toBe('每周一至周五 9 时 0 分 执行')
    expect(describeCron('0 0 1 * *')).toBe('每月 1 日 0 时 0 分 执行')
    expect(describeCron('0 0 1 1 *')).toBe('在 1 月 内，每月 1 日 0 时 0 分 执行')
  })

  it('日与周同时限定为或语义', () => {
    const p = parseCron('0 0 1 * 1')
    expect(p.description).toBe('每月 1 日或每周一（满足其一） 0 时 0 分 执行')
    expect(describeCron('0 0 ? * 1')).toBe('每周一 0 时 0 分 执行')
  })

  it('月份与周英文名', () => {
    const p = parseCron('0 0 12 JAN SUN')
    expect(p.fields.find((f) => f.key === 'month')?.values).toEqual([1])
    expect(p.fields.find((f) => f.key === 'dayOfWeek')?.values).toEqual([0])
    expect(parseCron('0 0 * * MON-FRI').fields[4].values).toEqual([1, 2, 3, 4, 5])
  })

  it('跨天回绕范围', () => {
    expect(parseCron('0 22-2 * * *').fields[1].values).toEqual([0, 1, 2, 22, 23])
    expect(parseCron('0 7-1/10 * * *').fields[1].values).toEqual([7, 17])
    expect(parseCron('0 0 * * 5-7').fields[4].values).toEqual([0, 5, 6])
  })

  it('单字段中文说明', () => {
    const p = parseCron('*/5 9-17 ? * MON')
    expect(describeField(p.fields[0])).toBe('每 5 分钟')
    expect(describeField(p.fields[1])).toBe('9~17 时')
    expect(describeField(p.fields[2])).toBe('不指定（?），由另一日期字段决定')
    expect(describeField(p.fields[3])).toBe('每月（*）')
    expect(describeField(p.fields[4])).toBe('周一')
  })

  it('非法表达式报中文错误', () => {
    expect(() => parseCron('')).toThrow('请输入')
    expect(() => parseCron('* * *')).toThrow('5 或 6')
    expect(() => parseCron('0 99 * * *')).toThrow('0-23')
    expect(() => parseCron('*/0 * * * *')).toThrow('步长')
    expect(() => parseCron('61 * * * *')).toThrow('0-59')
    expect(() => parseCron('0 9 * * L')).toThrow('L/W/#')
    expect(() => parseCron('0 9 * * ? ?')).toThrow()
    expect(() => parseCron('0/5/2 * * * *')).toThrow('步长')
    expect(() => parseCron('0 ,9 * * *')).toThrow('空项')
  })
})

describe('Cron 生成', () => {
  it('按配置生成并可回解析', () => {
    const expr = buildCron({
      minute: { kind: 'step', step: 5 },
      hour: { kind: 'range', from: 9, to: 17 },
      dayOfMonth: { kind: 'any' },
      month: { kind: 'any' },
      dayOfWeek: { kind: 'values', values: [1, 2, 3, 4, 5] },
    })
    expect(expr).toBe('*/5 9-17 * * 1-5')
    expect(parseCron(expr).fields[0].values).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55])
  })

  it('可选秒字段生成 6 字段表达式', () => {
    const expr = buildCron({
      second: { kind: 'step', step: 10 },
      minute: { kind: 'any' },
      hour: { kind: 'any' },
      dayOfMonth: { kind: 'any' },
      month: { kind: 'any' },
      dayOfWeek: { kind: 'any' },
    })
    expect(expr).toBe('*/10 * * * * *')
    expect(parseCron(expr).useSeconds).toBe(true)
    expect(buildCron({ ...defaultSpec(), second: null })).toBe('* * * * *')
  })

  it('指定值连续时折叠为区间', () => {
    expect(
      buildCron({ ...defaultSpec(), minute: { kind: 'values', values: [5, 3, 4] } })
    ).toBe('3-5 * * * *')
  })

  it('生成越界与非法配置报错', () => {
    expect(() => buildCron({ ...defaultSpec(), minute: { kind: 'values', values: [60] } })).toThrow('0-59')
    expect(() => buildCron({ ...defaultSpec(), hour: { kind: 'range', from: 0, to: 24 } })).toThrow('0-23')
    expect(() => buildCron({ ...defaultSpec(), minute: { kind: 'values', values: [] } })).toThrow('至少')
    expect(() => buildCron({ ...defaultSpec(), minute: { kind: 'step', step: 0 } })).toThrow('步长')
    expect(() => buildCron({ ...defaultSpec(), minute: { kind: 'question' } })).toThrow('?')
  })
})

function defaultSpec() {
  return {
    minute: { kind: 'any' } as const,
    hour: { kind: 'any' } as const,
    dayOfMonth: { kind: 'any' } as const,
    month: { kind: 'any' } as const,
    dayOfWeek: { kind: 'any' } as const,
  }
}

describe('Cron 下次执行时间', () => {
  it('每 15 分钟', () => {
    const from = new Date(2026, 8, 24, 10, 7, 33)
    const runs = nextRunTimes('*/15 * * * *', 3, from)
    expect(runs.map(formatRunTime)).toEqual([
      '2026-09-24 10:15:00',
      '2026-09-24 10:30:00',
      '2026-09-24 10:45:00',
    ])
  })

  it('5 字段表达式按第 0 秒执行', () => {
    const from = new Date(2026, 8, 24, 9, 0, 30)
    expect(formatRunTime(nextRunTimes('0 * * * *', 1, from)[0])).toBe('2026-09-24 10:00:00')
  })

  it('跨天与跨月推进', () => {
    expect(formatRunTime(nextRunTimes('0 9 * * *', 1, new Date(2026, 8, 24, 23, 59, 0))[0])).toBe(
      '2026-09-25 09:00:00'
    )
    expect(formatRunTime(nextRunTimes('0 0 1 * *', 1, new Date(2026, 8, 24, 0, 0, 1))[0])).toBe(
      '2026-10-01 00:00:00'
    )
  })

  it('日与周或语义', () => {
    const runs = nextRunTimes('0 0 1 * 1', 3, new Date(2026, 8, 1, 0, 0, 1)).map(formatRunTime)
    expect(runs).toEqual([
      '2026-09-07 00:00:00',
      '2026-09-14 00:00:00',
      '2026-09-21 00:00:00',
    ])
  })

  it('6 字段秒级推进', () => {
    const from = new Date(2026, 8, 24, 10, 0, 4)
    expect(nextRunTimes('*/30 * * * * *', 2, from).map(formatRunTime)).toEqual([
      '2026-09-24 10:00:30',
      '2026-09-24 10:01:00',
    ])
  })

  it('不存在的日期报错', () => {
    expect(() => nextRunTimes('0 0 30 2 *', 1, new Date(2026, 0, 1))).toThrow('没有匹配')
    expect(() => nextRunTimes('* * * * *', 0)).toThrow('≥1')
  })
})
