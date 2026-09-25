/** 时间换算：时区换算、日期差值（PRD 3.4） */

import { tzOffsetLabel, tzParts, zoneWallTimeToMillis } from '../utils/tz'

export interface ZonedResult {
  iso: string
  local: string
  offset: string
}

export function convertTimezone(
  datetime: string,
  fromZone: string,
  toZone: string
): ZonedResult {
  // datetime: YYYY-MM-DD HH:mm:ss（按 fromZone 解释）
  const ts = zoneWallTimeToMillis(datetime, fromZone)
  const t = tzParts(ts, toZone)
  return {
    iso: new Date(ts).toISOString(),
    local: `${t.y}-${t.mo}-${t.d} ${t.h}:${t.mi}:${t.s}`,
    offset: tzOffsetLabel(ts, toZone),
  }
}

export const COMMON_ZONES = [
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Australia/Sydney',
  'Pacific/Auckland',
  'UTC',
]

export function daysBetween(a: string, b: string): number {
  const da = Date.parse(a)
  const db = Date.parse(b)
  if (Number.isNaN(da) || Number.isNaN(db)) throw new Error('日期格式无效')
  return Math.round((db - da) / 86400000)
}

export function addDuration(days: number, from?: string): string {
  const base = from ? new Date(Date.parse(from)) : new Date()
  if (Number.isNaN(base.getTime())) throw new Error('日期格式无效')
  base.setDate(base.getDate() + days)
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${base.getFullYear()}-${p(base.getMonth() + 1)}-${p(base.getDate())}`
}
