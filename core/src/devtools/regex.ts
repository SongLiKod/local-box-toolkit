export interface RegexMatch {
  index: number
  text: string
  groups: string[]
}

export interface RegexTestResult {
  ok: boolean
  error?: string
  matches: RegexMatch[]
  count: number
}

const FLAG_RE = /^[gimsuy]*$/

export function testRegex(pattern: string, flags: string, text: string, limit = 200): RegexTestResult {
  if (!pattern) return { ok: false, error: '请输入正则表达式', matches: [], count: 0 }
  const f = flags.replace(/[^gimsuy]/g, '')
  if (!FLAG_RE.test(f)) return { ok: false, error: '非法正则标志', matches: [], count: 0 }
  let re: RegExp
  try {
    re = new RegExp(pattern, f.includes('g') ? f : `${f}g`)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), matches: [], count: 0 }
  }
  const matches: RegexMatch[] = []
  let m: RegExpExecArray | null
  let guard = 0
  while ((m = re.exec(text)) !== null) {
    matches.push({ index: m.index, text: m[0], groups: m.slice(1) })
    if (m[0].length === 0) re.lastIndex += 1
    guard += 1
    if (guard >= limit) break
  }
  return { ok: true, matches, count: matches.length }
}
