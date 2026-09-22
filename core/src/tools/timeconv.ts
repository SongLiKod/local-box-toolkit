/** 时间换算：时区换算、日期差值（PRD 3.4） */

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
  const m = datetime.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (!m) throw new Error('格式应为 2026-09-22 10:30:00')
  const [, y, mo, d, h, mi, s] = m
  const guess = `${y}-${mo}-${d}T${h}:${mi}:${s ?? '00'}`
  // 使用 Intl 反推 fromZone 的真实 UTC 时刻
  let ts = Date.parse(guess + 'Z')
  for (let iter = 0; iter < 3; iter++) {
    const asFrom = tzParts(ts, fromZone)
    const diff =
      Date.parse(`${asFrom.y}-${asFrom.mo}-${asFrom.d}T${asFrom.h}:${asFrom.mi}:${asFrom.s}Z`) -
      Date.parse(guess + 'Z')
    ts -= diff
    if (diff === 0) break
  }
  const t = tzParts(ts, toZone)
  const offsetStr = tzOffsetLabel(ts, toZone)
  return {
    iso: new Date(ts).toISOString(),
    local: `${t.y}-${t.mo}-${t.d} ${t.h}:${t.mi}:${t.s}`,
    offset: offsetStr,
  }
}

function tzParts(ts: number, zone: string): Record<string, string> {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(new Date(ts))
    const get = (t: string): string => parts.find((p) => p.type === t)?.value ?? '00'
    const hour = get('hour') === '24' ? '00' : get('hour')
    return { y: get('year'), mo: get('month'), d: get('day'), h: hour, mi: get('minute'), s: get('second') }
  } catch {
    const d = new Date(ts)
    return {
      y: String(d.getUTCFullYear()),
      mo: String(d.getUTCMonth() + 1).padStart(2, '0'),
      d: String(d.getUTCDate()).padStart(2, '0'),
      h: String(d.getUTCHours()).padStart(2, '0'),
      mi: String(d.getUTCMinutes()).padStart(2, '0'),
      s: String(d.getUTCSeconds()).padStart(2, '0'),
    }
  }
}

function tzOffsetLabel(ts: number, zone: string): string {
  const t = tzParts(ts, zone)
  const local = Date.parse(`${t.y}-${t.mo}-${t.d}T${t.h}:${t.mi}:${t.s}Z`)
  const mins = Math.round((local - Math.floor(ts / 1000) * 1000) / 60000)
  const sign = mins >= 0 ? '+' : '-'
  const abs = Math.abs(mins)
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`
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
