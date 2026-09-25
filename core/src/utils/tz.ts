/** 时区基础工具：基于 Intl.DateTimeFormat 的时区计算（自动处理夏令时） */

export interface ZonedParts {
  y: string
  mo: string
  d: string
  h: string
  mi: string
  s: string
}

const pad2 = (n: number | string): string => String(n).padStart(2, '0')

/** Intl.DateTimeFormat 构造开销较大，按缓存复用 */
const FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>()

function formatterFor(zone: string): Intl.DateTimeFormat {
  let f = FORMATTER_CACHE.get(zone)
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    FORMATTER_CACHE.set(zone, f)
  }
  return f
}

/** 某 UTC 时刻在指定时区的年月日时分秒（时区无效时退回 UTC） */
export function tzParts(ts: number, zone: string): ZonedParts {
  try {
    const parts = formatterFor(zone).formatToParts(new Date(ts))
    const get = (t: string): string => parts.find((p) => p.type === t)?.value ?? '00'
    const hour = get('hour') === '24' ? '00' : get('hour')
    return { y: get('year'), mo: get('month'), d: get('day'), h: hour, mi: get('minute'), s: get('second') }
  } catch {
    const d = new Date(ts)
    return {
      y: String(d.getUTCFullYear()),
      mo: pad2(d.getUTCMonth() + 1),
      d: pad2(d.getUTCDate()),
      h: pad2(d.getUTCHours()),
      mi: pad2(d.getUTCMinutes()),
      s: pad2(d.getUTCSeconds()),
    }
  }
}

/** 某 UTC 时刻该时区相对 UTC 的偏移（分钟，东为正） */
export function tzOffsetMinutes(ts: number, zone: string): number {
  const t = tzParts(ts, zone)
  const asUtc = Date.parse(`${t.y}-${t.mo}-${t.d}T${t.h}:${t.mi}:${t.s}Z`)
  return Math.round((asUtc - Math.floor(ts / 1000) * 1000) / 60000)
}

/** 时区偏移标签，如 UTC+08:00 */
export function tzOffsetLabel(ts: number, zone: string): string {
  const mins = tzOffsetMinutes(ts, zone)
  const sign = mins >= 0 ? '+' : '-'
  const abs = Math.abs(mins)
  return `UTC${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`
}

/**
 * 「某时区的墙上时间」→ UTC 毫秒时间戳（DST 安全）。
 * datetime 格式：YYYY-MM-DD HH:mm[:ss]，不带时区则按 zone 解释。
 */
export function zoneWallTimeToMillis(datetime: string, zone: string): number {
  const m = datetime.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (!m) throw new Error('格式应为 2026-09-22 10:30:00')
  const [, y, mo, d, h, mi, s] = m
  const guess = `${y}-${mo}-${d}T${h}:${mi}:${s ?? '00'}`
  // 使用 Intl 反推该 zone 的真实 UTC 时刻
  let ts = Date.parse(guess + 'Z')
  for (let iter = 0; iter < 3; iter++) {
    const asZone = tzParts(ts, zone)
    const diff =
      Date.parse(`${asZone.y}-${asZone.mo}-${asZone.d}T${asZone.h}:${asZone.mi}:${asZone.s}Z`) -
      Date.parse(guess + 'Z')
    ts -= diff
    if (diff === 0) break
  }
  return ts
}

/** 当前运行环境所在时区（如 Asia/Shanghai） */
export function localZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** 指定时区的日期 YYYY-MM-DD */
export function zoneDate(ts: number, zone: string): string {
  const t = tzParts(ts, zone)
  return `${t.y}-${t.mo}-${t.d}`
}

/** 指定时区的时间 HH:mm */
export function zoneTime(ts: number, zone: string): string {
  const t = tzParts(ts, zone)
  return `${t.h}:${t.mi}`
}
