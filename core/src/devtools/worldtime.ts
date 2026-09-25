/**
 * 世界时间：多城市时钟、会议时间对比（worldtimebuddy 风格）
 * 全部基于 Intl.DateTimeFormat，自动适配夏令时，纯本地计算。
 */

import { localZone, tzOffsetLabel, tzOffsetMinutes, tzParts, zoneDate, zoneWallTimeToMillis } from '../utils/tz'

export { localZone, tzOffsetLabel, zoneDate, zoneWallTimeToMillis }

const WEEK_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** 常用城市/地区（IANA 时区 → 中文名） */
export const ZONE_LABELS: Record<string, string> = {
  'Asia/Shanghai': '中国·上海',
  'Asia/Hong_Kong': '中国·香港',
  'Asia/Macau': '中国·澳门',
  'Asia/Taipei': '中国·台北',
  'Asia/Urumqi': '中国·乌鲁木齐',
  'Asia/Tokyo': '日本·东京',
  'Asia/Seoul': '韩国·首尔',
  'Asia/Singapore': '新加坡',
  'Asia/Bangkok': '泰国·曼谷',
  'Asia/Jakarta': '印尼·雅加达',
  'Asia/Manila': '菲律宾·马尼拉',
  'Asia/Ho_Chi_Minh': '越南·胡志明市',
  'Asia/Kolkata': '印度·新德里',
  'Asia/Karachi': '巴基斯坦·卡拉奇',
  'Asia/Dubai': '阿联酋·迪拜',
  'Asia/Tehran': '伊朗·德黑兰',
  'Asia/Jerusalem': '以色列·耶路撒冷',
  'Europe/Moscow': '俄罗斯·莫斯科',
  'Europe/Istanbul': '土耳其·伊斯坦布尔',
  'Europe/London': '英国·伦敦',
  'Europe/Paris': '法国·巴黎',
  'Europe/Berlin': '德国·柏林',
  'Europe/Madrid': '西班牙·马德里',
  'Europe/Rome': '意大利·罗马',
  'Europe/Amsterdam': '荷兰·阿姆斯特丹',
  'Europe/Zurich': '瑞士·苏黎世',
  'Europe/Stockholm': '瑞典·斯德哥尔摩',
  'Europe/Warsaw': '波兰·华沙',
  'Africa/Cairo': '埃及·开罗',
  'Africa/Lagos': '尼日利亚·拉各斯',
  'Africa/Johannesburg': '南非·约翰内斯堡',
  'America/Sao_Paulo': '巴西·圣保罗',
  'America/Argentina/Buenos_Aires': '阿根廷·布宜诺斯艾利斯',
  'America/New_York': '美国·纽约',
  'America/Chicago': '美国·芝加哥',
  'America/Denver': '美国·丹佛',
  'America/Los_Angeles': '美国·洛杉矶',
  'America/Vancouver': '加拿大·温哥华',
  'America/Toronto': '加拿大·多伦多',
  'America/Mexico_City': '墨西哥·墨西哥城',
  'Australia/Perth': '澳大利亚·珀斯',
  'Australia/Adelaide': '澳大利亚·阿德莱德',
  'Australia/Melbourne': '澳大利亚·墨尔本',
  'Australia/Sydney': '澳大利亚·悉尼',
  'Pacific/Auckland': '新西兰·奥克兰',
  'Pacific/Honolulu': '美国·檀香山',
  UTC: '协调世界时 UTC',
}

/** 默认展示的城市（含本地时区，去重） */
export const DEFAULT_ZONES = ['Asia/Shanghai', 'Asia/Tokyo', 'Europe/London', 'America/New_York', 'America/Los_Angeles']

export function zoneLabel(zone: string): string {
  return ZONE_LABELS[zone] ?? zone
}

/** 时区选项（按 UTC 偏移从西到东排序），供选择器使用 */
export function zoneOptions(): { zone: string; label: string }[] {
  const now = Date.now()
  return Object.keys(ZONE_LABELS)
    .map((zone) => ({ zone, label: `${zoneLabel(zone)}（${tzOffsetLabel(now, zone)}）` }))
    .sort((a, b) => {
      const oa = tzOffsetMinutes(now, a.zone)
      const ob = tzOffsetMinutes(now, b.zone)
      return oa !== ob ? oa - ob : a.label.localeCompare(b.label)
    })
}

/** 默认世界时钟城市：本地时区在前，再去重 */
export function defaultZones(): string[] {
  return [localZone(), ...DEFAULT_ZONES].filter((z, i, arr) => arr.indexOf(z) === i)
}

export interface ZoneClock {
  /** IANA 时区，如 Asia/Shanghai */
  zone: string
  /** 中文城市名 */
  label: string
  /** 该时刻的 UTC 毫秒时间戳 */
  millis: number
  /** 当地日期 YYYY-MM-DD */
  date: string
  /** 当地时间 HH:mm */
  time: string
  /** 当地日期时间 YYYY-MM-DD HH:mm:ss */
  local: string
  /** 星期，如 周二 */
  weekday: string
  /** UTC 偏移标签，如 UTC+08:00 */
  offset: string
  /** UTC 偏移分钟数（东为正） */
  offsetMinutes: number
  /** 与基准时区的时差（分钟，东为正） */
  diffMinutes: number
  hour: number
  minute: number
  /** 白天（按 06:00–18:00 估算） */
  isDaytime: boolean
  isWeekend: boolean
  /** 落在工作时段内（workStart ≤ 时 < workEnd，不判断周末） */
  inWorkHours: boolean
}

export interface ClockOptions {
  /** 计算时差的基准时区，默认本机时区 */
  baseZone?: string
  /** 工作时段起点（小时，含），默认 9 */
  workStart?: number
  /** 工作时段终点（小时，不含），默认 18 */
  workEnd?: number
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** 某时刻在某时区的城市时钟 */
export function getZoneClock(millis: number, zone: string, opts: ClockOptions = {}): ZoneClock {
  const t = tzParts(millis, zone)
  const offsetMinutes = tzOffsetMinutes(millis, zone)
  const base = opts.baseZone ?? localZone()
  const hour = Number(t.h)
  const workStart = opts.workStart ?? 9
  const workEnd = opts.workEnd ?? 18
  const weekdayIdx = new Date(Date.parse(`${t.y}-${t.mo}-${t.d}T00:00:00Z`)).getUTCDay()
  return {
    zone,
    label: zoneLabel(zone),
    millis,
    date: `${t.y}-${t.mo}-${t.d}`,
    time: `${t.h}:${t.mi}`,
    local: `${t.y}-${t.mo}-${t.d} ${t.h}:${t.mi}:${t.s}`,
    weekday: WEEK_CN[weekdayIdx],
    offset: tzOffsetLabel(millis, zone),
    offsetMinutes,
    diffMinutes: offsetMinutes - tzOffsetMinutes(millis, base),
    hour,
    minute: Number(t.mi),
    isDaytime: hour >= 6 && hour < 18,
    isWeekend: weekdayIdx === 0 || weekdayIdx === 6,
    inWorkHours: hour >= workStart && hour < workEnd,
  }
}

/** 某时刻的多城市时钟 */
export function getWorldClock(millis: number, zones: string[], opts: ClockOptions = {}): ZoneClock[] {
  return zones.map((z) => getZoneClock(millis, z, opts))
}

export interface MeetingSlot {
  /** 该时段对应的 UTC 毫秒时间戳 */
  millis: number
  /** 基准时区的日期 YYYY-MM-DD */
  date: string
  /** 基准时区的时间 HH:mm */
  time: string
  /** 各时区在该时刻的时钟 */
  clocks: ZoneClock[]
  /** 所有城市是否都处于工作时段 */
  ok: boolean
}

export interface MeetingRange {
  /** 起始时间（基准时区 HH:mm） */
  start: string
  /** 结束时间（基准时区 HH:mm，不含） */
  end: string
  /** 时长（分钟） */
  minutes: number
}

export interface MeetingPlan {
  /** 基准时区 */
  refZone: string
  /** 计划日期（基准时区）YYYY-MM-DD */
  date: string
  workStart: number
  workEnd: number
  stepMinutes: number
  zones: string[]
  slots: MeetingSlot[]
  /** 所有城市都方便的连续时间段 */
  available: MeetingRange[]
}

export interface MeetingOptions {
  /** 参与对比的时区（至少 1 个） */
  zones: string[]
  /** 计划日期 YYYY-MM-DD（按 refZone 解释），默认 refZone 的今天 */
  date?: string
  /** 基准时区，默认第一个城市 */
  refZone?: string
  /** 工作时段起点（小时），默认 9 */
  workStart?: number
  /** 工作时段终点（小时），默认 18 */
  workEnd?: number
  /** 时间粒度（分钟），默认 60 */
  stepMinutes?: number
  /** 丢弃周末的时段，默认 false */
  excludeWeekend?: boolean
}

/** 指定时区的今天 */
export function todayInZone(zone: string, now = Date.now()): string {
  return zoneDate(now, zone)
}

/**
 * 会议时间对比：给定日期，按基准时区逐时段扫描，
 * 计算各城市当地时刻，找出所有城市都处于工作时段的连续区间。
 */
export function meetingPlan(opts: MeetingOptions): MeetingPlan {
  const zones = opts.zones.filter((z, i, arr) => arr.indexOf(z) === i)
  if (zones.length === 0) throw new Error('请至少选择一个时区')
  const refZone = opts.refZone ?? zones[0]
  const date = opts.date ?? todayInZone(refZone)
  const workStart = opts.workStart ?? 9
  const workEnd = opts.workEnd ?? 18
  const stepMinutes = opts.stepMinutes ?? 60
  if (stepMinutes <= 0 || 1440 % stepMinutes !== 0) throw new Error('时间粒度需能整除 24 小时（如 15/30/60 分钟）')
  if (workStart >= workEnd) throw new Error('工作时段起点需早于终点')

  const baseOpts: ClockOptions = { baseZone: refZone, workStart, workEnd }
  const slots: MeetingSlot[] = []
  for (let i = 0; i * stepMinutes < 1440; i++) {
    const minuteOfDay = i * stepMinutes
    const slotDate = `${date} ${pad(Math.floor(minuteOfDay / 60))}:${pad(minuteOfDay % 60)}`
    const millis = zoneWallTimeToMillis(slotDate, refZone)
    const clocks = getWorldClock(millis, zones, baseOpts)
    const ok = clocks.every((c) => c.inWorkHours && (!opts.excludeWeekend || !c.isWeekend))
    slots.push({ millis, date: zoneDate(millis, refZone), time: slotDate.slice(11), clocks, ok })
  }

  // 按时间顺序合并连续可用时段
  const hhmm = (minuteOfDay: number): string =>
    `${pad(Math.floor(minuteOfDay / 60))}:${pad(minuteOfDay % 60)}`
  const available: MeetingRange[] = []
  let startIdx = -1
  for (let i = 0; i <= slots.length; i++) {
    const ok = i < slots.length && slots[i].ok
    if (ok && startIdx < 0) startIdx = i
    if (!ok && startIdx >= 0) {
      const startMin = startIdx * stepMinutes
      const endMin = i * stepMinutes
      available.push({ start: hhmm(startMin), end: hhmm(endMin), minutes: endMin - startMin })
      startIdx = -1
    }
  }

  return { refZone, date, workStart, workEnd, stepMinutes, zones, slots, available }
}

/** 相对时间描述：3 分钟前 / 2 小时后 */
export function relativeTime(millis: number, now = Date.now()): string {
  const diff = millis - now
  const abs = Math.abs(diff)
  const suffix = diff < 0 ? '前' : diff > 0 ? '后' : ''
  if (abs < 45_000) return diff === 0 ? '刚刚' : `不到 1 分钟${suffix}`
  const units: { ms: number; name: string }[] = [
    { ms: 60_000, name: '分钟' },
    { ms: 3_600_000, name: '小时' },
    { ms: 86_400_000, name: '天' },
    { ms: 2_592_000_000, name: '个月' },
    { ms: 31_536_000_000, name: '年' },
  ]
  let unit = units[0]
  for (const u of units) {
    if (abs >= u.ms) unit = u
  }
  const n = Math.max(1, Math.floor(abs / unit.ms))
  return `${n} ${unit.name}${suffix}`
}
