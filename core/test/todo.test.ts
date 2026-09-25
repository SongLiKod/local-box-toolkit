import { describe, expect, it } from 'vitest'
import {
  dueLabel,
  endOfDay,
  isActionableToday,
  isDoneInCycle,
  isDueToday,
  splitToday,
  startOfDay,
  startOfWeek,
  todayProgress,
} from '../src/tools/todo'
import type { TodoItem } from '../src/types'

function todo(partial: Partial<TodoItem> = {}): TodoItem {
  return {
    id: 't1',
    title: '买牛奶',
    done: false,
    repeat: 'none',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...partial,
  }
}

describe('待办周期判断', () => {
  it('startOfDay / endOfDay 取本地日边界', () => {
    const t = new Date(2026, 8, 25, 15, 30, 12).getTime()
    expect(startOfDay(t)).toBe(new Date(2026, 8, 25, 0, 0, 0, 0).getTime())
    expect(endOfDay(t)).toBe(new Date(2026, 8, 25, 0, 0, 0, 0).getTime() + 86400000 - 1)
  })

  it('startOfWeek 以周一为一周起点', () => {
    // 2026-09-25 是周五，同周周一为 2026-09-21
    const fri = new Date(2026, 8, 25, 20, 0, 0).getTime()
    expect(startOfWeek(fri)).toBe(new Date(2026, 8, 21, 0, 0, 0, 0).getTime())
    // 周日归入同一周（周一）
    const sun = new Date(2026, 8, 27, 10, 0, 0).getTime()
    expect(startOfWeek(sun)).toBe(new Date(2026, 8, 21, 0, 0, 0, 0).getTime())
    // 上周日归入上一周
    const lastSun = new Date(2026, 8, 20, 10, 0, 0).getTime()
    expect(startOfWeek(lastSun)).toBe(new Date(2026, 8, 14, 0, 0, 0, 0).getTime())
  })

  it('一次性任务完成即完成', () => {
    const now = new Date(2026, 8, 25, 10).getTime()
    expect(isDoneInCycle(todo({ done: true }), now)).toBe(true)
    expect(isDoneInCycle(todo(), now)).toBe(false)
    expect(isActionableToday(todo({ done: true }), now)).toBe(false)
    expect(isActionableToday(todo(), now)).toBe(true)
  })

  it('每日任务：今天完成仍算完成，昨天完成则重新出现', () => {
    const now = new Date(2026, 8, 25, 10).getTime()
    const todayDone = todo({ done: true, doneAt: new Date(2026, 8, 25, 8).getTime(), repeat: 'daily' })
    const yestDone = todo({ done: true, doneAt: new Date(2026, 8, 24, 8).getTime(), repeat: 'daily' })
    expect(isDoneInCycle(todayDone, now)).toBe(true)
    expect(isDoneInCycle(yestDone, now)).toBe(false)
    expect(isActionableToday(yestDone, now)).toBe(true)
  })

  it('每周任务：同周有效，跨周重置', () => {
    const now = new Date(2026, 8, 25, 10).getTime()
    const monDone = todo({ done: true, doneAt: new Date(2026, 8, 21, 9).getTime(), repeat: 'weekly' })
    const lastWeek = todo({ done: true, doneAt: new Date(2026, 8, 20, 9).getTime(), repeat: 'weekly' })
    expect(isDoneInCycle(monDone, now)).toBe(true)
    expect(isDoneInCycle(lastWeek, now)).toBe(false)
  })

  it('截止日口径：无期限恒在今天，逾期仍要处理', () => {
    const now = new Date(2026, 8, 25, 10).getTime()
    expect(isDueToday(todo(), now)).toBe(true)
    expect(isDueToday(todo({ due: new Date(2026, 8, 25, 23).getTime() }), now)).toBe(true)
    expect(isDueToday(todo({ due: new Date(2026, 8, 26, 0).getTime() }), now)).toBe(false)
    expect(isDueToday(todo({ due: new Date(2026, 8, 24, 0).getTime() }), now)).toBe(true)
  })

  it('今日分组与完成度', () => {
    const now = new Date(2026, 8, 25, 10).getTime()
    const list = [
      todo({ id: 'a', done: true }),
      todo({ id: 'b' }),
      todo({ id: 'c', due: new Date(2026, 8, 28).getTime() }),
    ]
    const { pending, done } = splitToday(list, now)
    expect(pending.map((t) => t.id)).toEqual(['b'])
    expect(done.map((t) => t.id)).toEqual(['a'])
    expect(todayProgress(list, now)).toEqual({ total: 2, done: 1, percent: 50 })
    expect(todayProgress([], now)).toEqual({ total: 0, done: 0, percent: 0 })
  })

  it('dueLabel 相对日期文案', () => {
    const now = new Date(2026, 8, 25, 10).getTime()
    expect(dueLabel(new Date(2026, 8, 24).getTime(), now)).toBe('已逾期')
    expect(dueLabel(new Date(2026, 8, 25).getTime(), now)).toBe('今天')
    expect(dueLabel(new Date(2026, 8, 26).getTime(), now)).toBe('明天')
    expect(dueLabel(new Date(2026, 10, 1).getTime(), now)).toBe('11月1日')
  })
})
