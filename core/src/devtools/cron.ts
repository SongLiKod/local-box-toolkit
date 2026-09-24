/**
 * Cron 表达式：解析（中文语义 + 下次执行时间）与可视化生成。
 *
 * 支持两种写法：
 * - 5 字段：分 时 日 月 周（Unix/Quartz 标准）
 * - 6 字段：秒 分 时 日 月 周（Spring 等框架常见的秒扩展）
 *
 * 语法：`*`、`?`、`,`、`-`、`/`，月与周支持英文名（JAN、MON 等），
 * 范围可跨天回绕（如小时 `22-2` 表示 22 点到次日 2 点），
 * 「日」与「周」同时限定时按「满足其一」的或语义匹配。
 */

export type CronFieldKey =
  | 'second'
  | 'minute'
  | 'hour'
  | 'dayOfMonth'
  | 'month'
  | 'dayOfWeek'

export interface CronFieldDef {
  key: CronFieldKey
  /** 字段中文名（秒/分/时/日/月/周） */
  label: string
  /** 数值单位（拼在取值后，如「9 时」「30 分」） */
  unit: string
  min: number
  max: number
  /** 英文别名（JAN、MON …） */
  names?: Record<string, number>
  /** 是否允许 `?`（不指定，由另一日期字段决定） */
  question: boolean
}

export interface CronField {
  key: CronFieldKey
  label: string
  /** 字段原始文本 */
  raw: string
  /** 展开后的取值（已排序去重，周字段的 7 归一为 0） */
  values: number[]
  /** 覆盖全部取值（等价 `*` 语义） */
  any: boolean
  /** 使用了 `?` */
  question: boolean
}

export interface CronParsed {
  /** 规范化后的表达式（单个空格分隔） */
  expr: string
  /** 是否为 6 字段（含秒）写法 */
  useSeconds: boolean
  /** 字段顺序：秒 分 时 日 月 周（5 字段写法时无秒字段） */
  fields: CronField[]
  /** 中文语义描述 */
  description: string
}

/** 生成表达式时单个字段的配置 */
export type CronFieldSpec =
  | { kind: 'any' }
  | { kind: 'question' }
  | { kind: 'step'; step: number; from?: number; to?: number }
  | { kind: 'range'; from: number; to: number }
  | { kind: 'values'; values: number[] }

export interface CronSpec {
  /** 不填则生成 5 字段表达式 */
  second?: CronFieldSpec | null
  minute: CronFieldSpec
  hour: CronFieldSpec
  dayOfMonth: CronFieldSpec
  month: CronFieldSpec
  dayOfWeek: CronFieldSpec
}

export interface CronPreset {
  label: string
  expr: string
}

const MONTH_NAMES: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
}
const WEEK_NAMES: Record<string, number> = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
}

/** 星期中文（下标即 0=周日 … 6=周六） */
export const CRON_WEEK_CN = ['日', '一', '二', '三', '四', '五', '六']
/** 月份英文别名（下标 0 对应 1 月） */
export const CRON_MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

const DEF: Record<CronFieldKey, CronFieldDef> = {
  second: { key: 'second', label: '秒', unit: '秒', min: 0, max: 59, question: false },
  minute: { key: 'minute', label: '分', unit: '分', min: 0, max: 59, question: false },
  hour: { key: 'hour', label: '时', unit: '时', min: 0, max: 23, question: false },
  dayOfMonth: { key: 'dayOfMonth', label: '日', unit: '日', min: 1, max: 31, question: true },
  month: { key: 'month', label: '月', unit: '月', min: 1, max: 12, names: MONTH_NAMES, question: false },
  dayOfWeek: { key: 'dayOfWeek', label: '周', unit: '周', min: 0, max: 7, names: WEEK_NAMES, question: true },
}

/** 字段定义（供生成器渲染取值选项与范围校验） */
export const CRON_FIELD_DEFS: CronFieldDef[] = [
  DEF.second,
  DEF.minute,
  DEF.hour,
  DEF.dayOfMonth,
  DEF.month,
  DEF.dayOfWeek,
]

/** `*` 语义在各字段下的中文说明（用于字段明细表） */
const ANY_TEXT: Record<CronFieldKey, string> = {
  second: '每秒（*）',
  minute: '每分钟（*）',
  hour: '每小时（*）',
  dayOfMonth: '每天（*）',
  month: '每月（*）',
  dayOfWeek: '每周（*）',
}

/** 常用表达式预设 */
export const CRON_PRESETS: CronPreset[] = [
  { label: '每分钟', expr: '* * * * *' },
  { label: '每5分钟', expr: '*/5 * * * *' },
  { label: '每小时整点', expr: '0 * * * *' },
  { label: '每天 9:00', expr: '0 9 * * *' },
  { label: '每天 9:30', expr: '30 9 * * *' },
  { label: '工作日 9:00', expr: '0 9 * * 1-5' },
  { label: '每周一 9:00', expr: '0 9 * * 1' },
  { label: '每月1号 0:00', expr: '0 0 1 * *' },
  { label: '每年1月1日', expr: '0 0 1 1 *' },
  { label: '每6小时', expr: '0 */6 * * *' },
]

/** 取字段定义（内部使用，字段固定存在） */
function defOf(key: CronFieldKey): CronFieldDef {
  return DEF[key]
}

function isContiguous(values: number[]): boolean {
  for (let i = 1; i < values.length; i++) {
    if (values[i] - values[i - 1] !== 1) return false
  }
  return values.length > 1
}

/** 等差步长（长度不足 3 或差值不恒定返回 0） */
function stepOf(values: number[]): number {
  if (values.length < 3) return 0
  const step = values[1] - values[0]
  if (step < 1) return 0
  for (let i = 2; i < values.length; i++) {
    if (values[i] - values[i - 1] !== step) return 0
  }
  return step
}

/** 取值列表转中文：连续值折叠为 a~b，过长列表截断 */
function listText(values: number[]): string {
  if (isContiguous(values)) return `${values[0]}~${values[values.length - 1]}`
  if (values.length > 8) return `${values.slice(0, 6).join('、')}…共 ${values.length} 项`
  return values.join('、')
}

/** 字段取值转中文片段，如「每 5 分钟」「9~17 时」「0、30 分」 */
function segText(values: number[], def: CronFieldDef, unit: string): string {
  const plain =
    unit === '分' ? '分钟' : unit === '时' ? '小时' : unit === '日' ? '天' : unit === '月' ? '个月' : unit
  const step = stepOf(values)
  // 步长为 1 就是连续区间，交给 listText 折叠成 a~b
  if (step >= 2 && values.length >= 3 && values[0] === def.min) return `每 ${step} ${plain}`
  if (step >= 2 && values.length >= 3) return `从 ${values[0]} ${unit}起，每 ${step} ${plain}`
  if (values.length === 1) return `${values[0]} ${unit}`
  return `${listText(values)} ${unit}`
}

function toNum(def: CronFieldDef, token: string, raw: string): number {
  const t = token.trim().toUpperCase()
  if (!t) throw new Error(`字段 "${raw}" 存在空项（逗号后没有内容）`)
  if (def.names && t in def.names) return def.names[t]
  if (!/^\d+$/.test(t)) {
    throw new Error(`"${raw}" 中的 "${token.trim()}" 不是有效的${def.label}值，范围 ${def.min}-${def.max}`)
  }
  const n = Number(t)
  if (n < def.min || n > def.max) {
    throw new Error(`"${raw}" 中的 ${n} 超出${def.label}字段范围 ${def.min}-${def.max}`)
  }
  return n
}

/** 解析单个字段为取值集合 */
function parseField(def: CronFieldDef, raw: string): CronField {
  const text = raw.trim()
  if (!text) throw new Error(`${def.label}字段为空`)
  if (/[LW#]/i.test(text)) {
    throw new Error(`暂不支持 ${def.label} 字段中的 L/W/# 语法（Quartz 扩展），请改用标准 cron 写法`)
  }
  if (text === '?') {
    if (!def.question) throw new Error(`? 只能用于「日」和「周」字段，${def.label}字段不支持`)
    return { key: def.key, label: def.label, raw: text, values: [], any: true, question: true }
  }
  if (text.includes('?')) throw new Error(`? 必须单独占一个字段（当前为 "${raw}"）`)

  const set = new Set<number>()
  const size = def.max - def.min + 1
  for (const item of text.split(',')) {
    const seg = item.trim()
    if (!seg) throw new Error(`字段 "${raw}" 存在空项（逗号后没有内容）`)
    const slash = seg.split('/')
    if (slash.length > 2) throw new Error(`"${seg}" 的步长写法错误，应如 */5 或 0-30/5`)
    let step = 1
    if (slash.length === 2) {
      const s = slash[1].trim()
      if (!/^\d+$/.test(s) || Number(s) < 1) {
        throw new Error(`"${seg}" 的步长必须是 ≥1 的整数`)
      }
      step = Number(s)
    }
    const body = slash[0].trim()
    let from: number
    let to: number
    if (body === '*') {
      from = def.min
      to = def.max
    } else if (body.includes('-')) {
      const parts = body.split('-')
      if (parts.length !== 2) throw new Error(`"${seg}" 的范围写法错误，应如 1-5`)
      from = toNum(def, parts[0], raw)
      to = toNum(def, parts[1], raw)
    } else {
      from = toNum(def, body, raw)
      // 「5/10」表示从 5 开始每隔 10 直到字段末尾
      to = slash.length === 2 ? def.max : from
    }
    // 跨界范围（from > to）按回绕展开，如小时 22-2 = 22,23,0,1,2
    const span = from <= to ? to - from : def.max - from + (to - def.min) + 1
    for (let i = 0; i <= span; i += step) {
      let v = from + i
      if (v > def.max) v = def.min + (v - def.max - 1)
      set.add(v)
    }
  }

  let values = [...set]
  // 周字段 7 与 0 等价，统一归一为 0
  if (def.key === 'dayOfWeek') values = [...new Set(values.map((v) => (v === 7 ? 0 : v)))]
  values.sort((a, b) => a - b)
  if (!values.length) throw new Error(`字段 "${raw}" 没有匹配到任何取值`)
  const full = def.key === 'dayOfWeek' ? 7 : size
  return {
    key: def.key,
    label: def.label,
    raw: text,
    values,
    any: values.length === full,
    question: false,
  }
}

function findField(fields: CronField[], key: CronFieldKey): CronField | undefined {
  return fields.find((f) => f.key === key)
}

function requireField(fields: CronField[], key: CronFieldKey): CronField {
  const f = findField(fields, key)
  if (!f) throw new Error(`缺少${DEF[key].label}字段`)
  return f
}

/** 是否已是「重复」语义的片段（每 X / 从 X 起每 X） */
function isRepeat(text: string): boolean {
  return text.startsWith('每') || text.startsWith('从')
}

function describeTime(hour: CronField, minute: CronField, second?: CronField): string {
  const secAny = !second || second.any
  const hourTxt = segText(hour.values, defOf('hour'), '时')
  const minTxt = segText(minute.values, defOf('minute'), '分')
  const secTxt = second ? segText(second.values, defOf('second'), '秒') : ''

  if (hour.any && minute.any && secAny) return '每分钟'

  if (hour.any) {
    if (minute.any) {
      if (secAny) return '每分钟'
      return isRepeat(secTxt) ? secTxt : `每分钟的第 ${listText(second!.values)} 秒`
    }
    const m = isRepeat(minTxt) ? minTxt : `每小时的第 ${listText(minute.values)} 分`
    if (secAny) return m
    const s = isRepeat(secTxt) ? secTxt : `第 ${listText(second!.values)} 秒`
    return `${m}、${s}`
  }

  // 小时受限
  if (minute.any && secAny) return `${hourTxt}内的每一分钟`
  if (minute.any) {
    const s = isRepeat(secTxt) ? secTxt : `每分钟的第 ${listText(second!.values)} 秒`
    return `${hourTxt}内${s}`
  }
  const m = isRepeat(minTxt) ? `${hourTxt}内${minTxt}` : `${hourTxt} ${listText(minute.values)} 分`
  if (secAny) return m
  const s = isRepeat(secTxt) ? secTxt : `${listText(second!.values)} 秒`
  return `${m} ${s}`
}

function describeDom(dom: CronField): string {
  const step = stepOf(dom.values)
  if (step >= 2 && dom.values.length >= 3 && dom.values[0] === 1) return `每 ${step} 天`
  if (dom.values.length === 1) return `每月 ${dom.values[0]} 日`
  return `每月 ${listText(dom.values)} 日`
}

function describeDow(dow: CronField): string {
  const texts = dow.values.map((v) => `周${CRON_WEEK_CN[v]}`)
  if (texts.length === 1) return `每${texts[0]}`
  if (isContiguous(dow.values)) return `每${texts[0]}至${texts[texts.length - 1]}`
  return `每${texts.join('、')}`
}

function describeDay(dom: CronField, dow: CronField): string {
  const domAny = dom.any || dom.question
  const dowAny = dow.any || dow.question
  if (domAny && dowAny) return '每天'
  if (domAny) return describeDow(dow)
  if (dowAny) return describeDom(dom)
  return `${describeDom(dom)}或${describeDow(dow)}（满足其一）`
}

function describeParsed(fields: CronField[], useSeconds: boolean): string {
  const minute = requireField(fields, 'minute')
  const hour = requireField(fields, 'hour')
  const dom = requireField(fields, 'dayOfMonth')
  const month = requireField(fields, 'month')
  const dow = requireField(fields, 'dayOfWeek')
  const second = useSeconds ? requireField(fields, 'second') : undefined

  const time = describeTime(hour, minute, second)
  const day = describeDay(dom, dow)
  const monthSeg = month.any ? '' : segText(month.values, defOf('month'), '月')

  let out = ''
  if (monthSeg) out += `在 ${monthSeg} 内，`
  if (day !== '每天') out += `${day} `
  else if (!time.startsWith('每')) out += '每天 '
  return `${out}${time} 执行`
}

/** 解析 Cron 表达式（非法输入抛出中文错误） */
export function parseCron(expr: string): CronParsed {
  const text = expr.trim().replace(/\s+/g, ' ')
  if (!text) throw new Error('请输入 Cron 表达式')
  const parts = text.split(' ')
  if (parts.length !== 5 && parts.length !== 6) {
    throw new Error(
      `字段数应为 5 或 6，当前为 ${parts.length} 个。5 字段：分 时 日 月 周；6 字段：秒 分 时 日 月 周`
    )
  }
  const useSeconds = parts.length === 6
  const keys: CronFieldKey[] = useSeconds
    ? ['second', 'minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek']
    : ['minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek']
  const fields = keys.map((k, i) => parseField(DEF[k], parts[i]))
  return {
    expr: parts.join(' '),
    useSeconds,
    fields,
    description: describeParsed(fields, useSeconds),
  }
}

/** 仅返回中文语义描述 */
export function describeCron(expr: string): string {
  return parseCron(expr).description
}

/** 单个字段的中文说明（用于字段明细表） */
export function describeField(field: CronField): string {
  if (field.question) return '不指定（?），由另一日期字段决定'
  if (field.any) return ANY_TEXT[field.key]
  if (field.key === 'dayOfWeek') {
    const texts = field.values.map((v) => `周${CRON_WEEK_CN[v]}`)
    if (isContiguous(field.values)) return `${texts[0]}至${texts[texts.length - 1]}`
    return texts.join('、')
  }
  return segText(field.values, defOf(field.key), defOf(field.key).unit)
}

function matchDay(
  d: Date,
  dom: CronField,
  dow: CronField,
  domAny: boolean,
  dowAny: boolean
): boolean {
  const domHit = domAny || dom.values.includes(d.getDate())
  const dowHit = dowAny || dow.values.includes(d.getDay())
  if (domAny && dowAny) return true
  // 日与周同时限定：标准 cron 的或语义
  if (!domAny && !dowAny) return domHit || dowHit
  return domHit && dowHit
}

/** 接下来 count 次执行时间（本地时区，最多向后推演 5 年） */
export function nextRunTimes(expr: string, count = 5, from?: Date): Date[] {
  if (!Number.isInteger(count) || count < 1) throw new Error('次数必须是 ≥1 的整数')
  const parsed = parseCron(expr)
  const months = requireField(parsed.fields, 'month').values
  const hours = requireField(parsed.fields, 'hour').values
  const minutes = requireField(parsed.fields, 'minute').values
  const dom = requireField(parsed.fields, 'dayOfMonth')
  const dow = requireField(parsed.fields, 'dayOfWeek')
  const seconds = parsed.useSeconds ? requireField(parsed.fields, 'second').values : [0]
  const domAny = dom.any || dom.question
  const dowAny = dow.any || dow.question

  const t = new Date(from ? from.getTime() : Date.now())
  t.setMilliseconds(0)
  t.setSeconds(t.getSeconds() + 1)
  const deadline = new Date(t.getTime())
  deadline.setFullYear(deadline.getFullYear() + 5)

  const out: Date[] = []
  while (out.length < count && t.getTime() <= deadline.getTime()) {
    if (!months.includes(t.getMonth() + 1)) {
      t.setDate(1)
      t.setHours(0, 0, 0, 0)
      t.setMonth(t.getMonth() + 1)
      continue
    }
    if (!matchDay(t, dom, dow, domAny, dowAny)) {
      t.setDate(t.getDate() + 1)
      t.setHours(0, 0, 0, 0)
      continue
    }
    if (!hours.includes(t.getHours())) {
      t.setHours(t.getHours() + 1, 0, 0, 0)
      continue
    }
    if (!minutes.includes(t.getMinutes())) {
      t.setMinutes(t.getMinutes() + 1, 0, 0)
      continue
    }
    if (!seconds.includes(t.getSeconds())) {
      t.setSeconds(t.getSeconds() + 1, 0)
      continue
    }
    out.push(new Date(t.getTime()))
    t.setSeconds(t.getSeconds() + 1)
  }
  if (!out.length) throw new Error('未来 5 年内没有匹配的执行时间')
  return out
}

/** 执行时间 → 本地 YYYY-MM-DD HH:mm:ss */
export function formatRunTime(d: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  )
}

function checkRange(def: CronFieldDef, v: number, what: string): void {
  if (!Number.isInteger(v) || v < def.min || v > def.max) {
    throw new Error(`「${def.label}」的${what}必须是 ${def.min}-${def.max} 的整数，当前为 ${v}`)
  }
}

function renderField(def: CronFieldDef, spec: CronFieldSpec): string {
  switch (spec.kind) {
    case 'any':
      return '*'
    case 'question':
      if (!def.question) throw new Error(`只有「日」和「周」字段支持 ?`)
      return '?'
    case 'range':
      checkRange(def, spec.from, '起始值')
      checkRange(def, spec.to, '结束值')
      return spec.from === spec.to ? String(spec.from) : `${spec.from}-${spec.to}`
    case 'step': {
      if (!Number.isInteger(spec.step) || spec.step < 1) {
        throw new Error(`「${def.label}」的步长必须是 ≥1 的整数`)
      }
      const from = spec.from ?? def.min
      const to = spec.to ?? def.max
      checkRange(def, from, '起始值')
      checkRange(def, to, '结束值')
      if (from === def.min && to === def.max) return `*/${spec.step}`
      return to === def.max ? `${from}/${spec.step}` : `${from}-${to}/${spec.step}`
    }
    case 'values': {
      const list = [...new Set(spec.values)].sort((a, b) => a - b)
      if (!list.length) throw new Error(`「${def.label}」至少要选择一个取值`)
      list.forEach((v) => checkRange(def, v, '取值'))
      if (list.length >= 2 && isContiguous(list)) return `${list[0]}-${list[list.length - 1]}`
      return list.join(',')
    }
  }
  throw new Error('未知的字段配置')
}

/** 由结构化配置生成 Cron 表达式（生成结果会再走一遍解析校验） */
export function buildCron(spec: CronSpec): string {
  const parts: string[] = []
  if (spec.second) parts.push(renderField(DEF.second, spec.second))
  parts.push(renderField(DEF.minute, spec.minute))
  parts.push(renderField(DEF.hour, spec.hour))
  parts.push(renderField(DEF.dayOfMonth, spec.dayOfMonth))
  parts.push(renderField(DEF.month, spec.month))
  parts.push(renderField(DEF.dayOfWeek, spec.dayOfWeek))
  const expr = parts.join(' ')
  parseCron(expr)
  return expr
}
