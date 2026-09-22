export interface TimestampInfo {
  seconds: number
  millis: number
  iso: string
  local: string
  utc: string
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function formatLocal(d: Date): string {
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  )
}

/** 时间戳 → 日期时间（自动识别秒/毫秒：10位秒、13位毫秒） */
export function timestampToDate(ts: number): TimestampInfo {
  const millis = ts < 1e11 ? ts * 1000 : ts
  const d = new Date(millis)
  if (Number.isNaN(d.getTime())) throw new Error('无效时间戳')
  return {
    seconds: Math.floor(millis / 1000),
    millis,
    iso: d.toISOString(),
    local: formatLocal(d),
    utc: d.toUTCString(),
  }
}

/** 日期时间字符串 → 时间戳（解析失败抛错） */
export function dateToTimestamp(dateStr: string): TimestampInfo {
  const normalized = dateStr.trim().replace('T', ' ').replace(/\//g, '-')
  const withTz = /([zZ]|[+-]\d{2}:?\d{2})$/.test(normalized)
    ? normalized
    : `${normalized.replace(' ', 'T')}`
  const d = new Date(withTz)
  if (Number.isNaN(d.getTime())) throw new Error('无法解析的日期格式，示例：2026-09-22 10:30:00')
  return timestampToDate(d.getTime())
}

export function nowTimestamp(): { seconds: number; millis: number } {
  const ms = Date.now()
  return { seconds: Math.floor(ms / 1000), millis: ms }
}
