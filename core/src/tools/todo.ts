/** 待办清单的日期与周期判断（PRD 3.4） */
import type { TodoItem } from '../types'

const DAY = 24 * 3600 * 1000

/** 当天 00:00（本地时区） */
export function startOfDay(t: number = Date.now()): number {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** 当天结束时刻 23:59:59.999 */
export function endOfDay(t: number = Date.now()): number {
  return startOfDay(t) + DAY - 1
}

/** 所属自然周的起点（周一 00:00，本地时区） */
export function startOfWeek(t: number = Date.now()): number {
  const d = new Date(startOfDay(t))
  const weekday = (d.getDay() + 6) % 7 // 周一 = 0
  d.setDate(d.getDate() - weekday)
  return d.getTime()
}

/** 重复任务在"现在"所处的周期内是否已完成 */
export function isDoneInCycle(todo: TodoItem, now: number = Date.now()): boolean {
  if (!todo.done) return false
  if (todo.repeat === 'none') return true
  const at = todo.doneAt ?? todo.updatedAt
  if (todo.repeat === 'daily') return startOfDay(at) === startOfDay(now)
  return startOfWeek(at) === startOfWeek(now)
}

/** 是否已到"该出现在今天"的时间：无截止日 → 恒为 true */
export function isDueToday(todo: TodoItem, now: number = Date.now()): boolean {
  if (todo.due === undefined) return true
  return todo.due <= endOfDay(now)
}

/** 今天要做：到期且本周期尚未完成 */
export function isActionableToday(todo: TodoItem, now: number = Date.now()): boolean {
  return isDueToday(todo, now) && !isDoneInCycle(todo, now)
}

/** 今天视图的分组（到期口径）：待办在前、已完成在后 */
export function splitToday(
  list: TodoItem[],
  now: number = Date.now(),
): { pending: TodoItem[]; done: TodoItem[] } {
  const due = list.filter((t) => isDueToday(t, now))
  return {
    pending: due.filter((t) => !isDoneInCycle(t, now)),
    done: due.filter((t) => isDoneInCycle(t, now)),
  }
}

/** 今天完成度统计 */
export function todayProgress(
  list: TodoItem[],
  now: number = Date.now(),
): { total: number; done: number; percent: number } {
  const { pending, done } = splitToday(list, now)
  const total = pending.length + done.length
  return { total, done: done.length, percent: total ? Math.round((done.length / total) * 100) : 0 }
}

/** 截止标签：逾期 / 今天 / 明天 / M月D日，无截止日返回空串 */
export function dueLabel(due: number, now: number = Date.now()): string {
  const day = startOfDay(now)
  const target = startOfDay(due)
  const diff = Math.round((target - day) / DAY)
  if (diff < 0) return '已逾期'
  if (diff === 0) return '今天'
  if (diff === 1) return '明天'
  const d = new Date(due)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
