/**
 * 计算器：安全的数学表达式求值（递归下降解析，不使用 eval）。
 * 支持四则运算、括号、幂、阶乘、百分号、函数、常量，角度/弧度两种三角模式。
 */

export type CalcAngle = 'deg' | 'rad'

export interface CalcOptions {
  /** 三角函数输入输出的角度模式，默认 deg（度） */
  angle?: CalcAngle
}

export interface CalcResult {
  /** 归一化后的表达式（去除空白） */
  expr: string
  /** 数值结果 */
  value: number
  /** 展示用字符串（12 位有效数字 + 千分位） */
  formatted: string
}

export interface CalcFunctionDoc {
  name: string
  args: string
  desc: string
}

export interface CalcConstantDoc {
  name: string
  value: number
  desc: string
}

/** 函数清单（供界面提示） */
export const CALC_FUNCTIONS: CalcFunctionDoc[] = [
  { name: 'sqrt', args: 'x', desc: '平方根' },
  { name: 'cbrt', args: 'x', desc: '立方根' },
  { name: 'abs', args: 'x', desc: '绝对值' },
  { name: 'round', args: 'x[,n]', desc: '四舍五入到 n 位小数' },
  { name: 'floor', args: 'x', desc: '向下取整' },
  { name: 'ceil', args: 'x', desc: '向上取整' },
  { name: 'trunc', args: 'x', desc: '截断小数' },
  { name: 'ln', args: 'x', desc: '自然对数' },
  { name: 'log', args: 'x', desc: '常用对数（以 10 为底）' },
  { name: 'log2', args: 'x', desc: '以 2 为底的对数' },
  { name: 'exp', args: 'x', desc: 'e 的 x 次幂' },
  { name: 'sin', args: 'x', desc: '正弦（按角度/弧度模式）' },
  { name: 'cos', args: 'x', desc: '余弦（按角度/弧度模式）' },
  { name: 'tan', args: 'x', desc: '正切（按角度/弧度模式）' },
  { name: 'asin', args: 'x', desc: '反正弦，结果为角度/弧度' },
  { name: 'acos', args: 'x', desc: '反余弦，结果为角度/弧度' },
  { name: 'atan', args: 'x', desc: '反正切，结果为角度/弧度' },
  { name: 'min', args: 'a,b,…', desc: '最小值' },
  { name: 'max', args: 'a,b,…', desc: '最大值' },
  { name: 'pow', args: 'a,b', desc: 'a 的 b 次幂' },
  { name: 'mod', args: 'a,b', desc: '取余 a mod b' },
  { name: 'hypot', args: 'a,b', desc: '直角三角形斜边 √(a²+b²)' },
  { name: 'fact', args: 'n', desc: '阶乘 n!（0~170）' },
  { name: 'degrees', args: 'rad', desc: '弧度 → 角度' },
  { name: 'radians', args: 'deg', desc: '角度 → 弧度' },
]

/** 常量清单 */
export const CALC_CONSTANTS: CalcConstantDoc[] = [
  { name: 'pi', value: Math.PI, desc: '圆周率 π' },
  { name: 'e', value: Math.E, desc: '自然常数 e' },
  { name: 'tau', value: Math.PI * 2, desc: '圆周率的 2 倍 τ' },
]

/* ---------------- 词法分析 ---------------- */

type Token =
  | { kind: 'num'; value: number; pos: number }
  | { kind: 'ident'; text: string; pos: number }
  | { kind: 'op'; text: string; pos: number }
  | { kind: '('; pos: number }
  | { kind: ')'; pos: number }
  | { kind: ','; pos: number }

/** 全角/符号归一化 */
const CHAR_MAP: Record<string, string> = {
  '×': '*',
  '·': '*',
  '✕': '*',
  '÷': '/',
  '−': '-',
  '－': '-',
  '＋': '+',
  '（': '(',
  '）': ')',
  '，': ',',
  '。': '.',
  '％': '%',
  '！': '!',
  '＾': '^',
}

const MAX_EXPR_LENGTH = 2000
const MAX_TOKENS = 4000
const MAX_DEPTH = 200

function fail(msg: string): never {
  throw new Error(msg)
}

/**
 * 去掉千分位逗号：`1,000,000` → `1000000`。
 * 函数括号内的逗号是参数分隔符（如 min(123,456)），不做处理。
 */
function stripThousands(input: string): string {
  let out = ''
  let lastChar = ''
  const fnStack: boolean[] = []
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (ch === '(') {
      fnStack.push(/[A-Za-z_]/.test(lastChar))
      out += ch
      lastChar = ch
      continue
    }
    if (ch === ')') {
      fnStack.pop()
      out += ch
      lastChar = ch
      continue
    }
    if (ch === ',' || ch === '，') {
      const next = input[i + 1] ?? ''
      const thousands = !fnStack.includes(true) && /[\d.]/.test(lastChar) && /\d/.test(next)
      if (!thousands) {
        out += ch
        lastChar = ch
      }
      continue
    }
    out += ch
    if (!/\s/.test(ch)) lastChar = ch
  }
  return out
}

function tokenize(input: string): Token[] {
  if (!input.trim()) fail('请输入表达式')
  if (input.length > MAX_EXPR_LENGTH) fail(`表达式过长（最多 ${MAX_EXPR_LENGTH} 字符）`)

  const s = stripThousands(input)
  const tokens: Token[] = []
  let i = 0
  while (i < s.length) {
    const raw = s[i]
    const ch = CHAR_MAP[raw] ?? raw
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++
      continue
    }
    if (ch === ',') {
      tokens.push({ kind: ',', pos: i })
      i++
      continue
    }
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(s[i + 1] ?? ''))) {
      const m = s.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/)
      const text = m?.[0] ?? ''
      const value = Number(text)
      if (!Number.isFinite(value)) fail(`数字格式错误：${text}`)
      tokens.push({ kind: 'num', value, pos: i })
      i += text.length
      continue
    }
    if (/[A-Za-z_]/.test(ch)) {
      const m = s.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/)
      const text = m?.[0] ?? ''
      tokens.push({ kind: 'ident', text, pos: i })
      i += text.length
      continue
    }
    if ('+-*/^%!'.includes(ch)) {
      tokens.push({ kind: 'op', text: ch, pos: i })
      i++
      continue
    }
    if (ch === '(') {
      tokens.push({ kind: '(', pos: i })
      i++
      continue
    }
    if (ch === ')') {
      tokens.push({ kind: ')', pos: i })
      i++
      continue
    }
    fail(`无法解析的字符「${raw}」（第 ${i + 1} 个字符）`)
  }
  if (tokens.length === 0) fail('请输入表达式')
  if (tokens.length > MAX_TOKENS) fail('表达式过长')
  return tokens
}

/* ---------------- 内置函数 ---------------- */

const CONSTANTS = new Map(CALC_CONSTANTS.map((c) => [c.name, c.value]))

function toRad(x: number, angle: CalcAngle): number {
  return angle === 'deg' ? (x * Math.PI) / 180 : x
}
function fromRad(x: number, angle: CalcAngle): number {
  return angle === 'deg' ? (x * 180) / Math.PI : x
}
function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) fail('阶乘仅支持非负整数，如 fact(5)')
  if (n > 170) fail('阶乘超出范围（最大 170!）')
  let r = 1
  for (let i = 2; i <= n; i++) r *= i
  return r
}
function guard(x: number, fn: string): number {
  if (Number.isNaN(x)) fail(`结果不是实数（${fn} 的定义域错误）`)
  return x
}

interface FnDef {
  minArgs: number
  maxArgs: number
  apply: (args: number[], angle: CalcAngle) => number
}

const FUNCTIONS: Record<string, FnDef> = {
  sqrt: { minArgs: 1, maxArgs: 1, apply: ([x]) => guard(Math.sqrt(x), 'sqrt') },
  cbrt: { minArgs: 1, maxArgs: 1, apply: ([x]) => Math.cbrt(x) },
  abs: { minArgs: 1, maxArgs: 1, apply: ([x]) => Math.abs(x) },
  round: {
    minArgs: 1,
    maxArgs: 2,
    apply: ([x, n]) => {
      const digits = n === undefined ? 0 : n
      if (!Number.isInteger(digits) || digits < 0 || digits > 15) fail('round 的位数需为 0~15 的整数')
      const f = 10 ** digits
      return Math.round(x * f) / f
    },
  },
  floor: { minArgs: 1, maxArgs: 1, apply: ([x]) => Math.floor(x) },
  ceil: { minArgs: 1, maxArgs: 1, apply: ([x]) => Math.ceil(x) },
  trunc: { minArgs: 1, maxArgs: 1, apply: ([x]) => Math.trunc(x) },
  ln: { minArgs: 1, maxArgs: 1, apply: ([x]) => guard(Math.log(x), 'ln') },
  log: { minArgs: 1, maxArgs: 1, apply: ([x]) => guard(Math.log10(x), 'log') },
  log2: { minArgs: 1, maxArgs: 1, apply: ([x]) => guard(Math.log2(x), 'log2') },
  exp: { minArgs: 1, maxArgs: 1, apply: ([x]) => guard(Math.exp(x), 'exp') },
  sin: { minArgs: 1, maxArgs: 1, apply: ([x], a) => Math.sin(toRad(x, a)) },
  cos: { minArgs: 1, maxArgs: 1, apply: ([x], a) => Math.cos(toRad(x, a)) },
  tan: { minArgs: 1, maxArgs: 1, apply: ([x], a) => guard(Math.tan(toRad(x, a)), 'tan') },
  asin: { minArgs: 1, maxArgs: 1, apply: ([x], a) => guard(fromRad(Math.asin(x), a), 'asin') },
  acos: { minArgs: 1, maxArgs: 1, apply: ([x], a) => guard(fromRad(Math.acos(x), a), 'acos') },
  atan: { minArgs: 1, maxArgs: 1, apply: ([x], a) => fromRad(Math.atan(x), a) },
  min: { minArgs: 1, maxArgs: Infinity, apply: (args) => Math.min(...args) },
  max: { minArgs: 1, maxArgs: Infinity, apply: (args) => Math.max(...args) },
  pow: { minArgs: 2, maxArgs: 2, apply: ([a, b]) => guard(a ** b, 'pow') },
  mod: {
    minArgs: 2,
    maxArgs: 2,
    apply: ([a, b]) => {
      if (b === 0) fail('除数不能为 0')
      return a % b
    },
  },
  hypot: { minArgs: 2, maxArgs: Infinity, apply: (args) => Math.hypot(...args) },
  fact: { minArgs: 1, maxArgs: 1, apply: ([n]) => factorial(n) },
  degrees: { minArgs: 1, maxArgs: 1, apply: ([x]) => (x * 180) / Math.PI },
  radians: { minArgs: 1, maxArgs: 1, apply: ([x]) => (x * Math.PI) / 180 },
}

/* ---------------- 语法分析 ---------------- */

class Parser {
  private i = 0
  private depth = 0

  constructor(private readonly tokens: Token[], private readonly angle: CalcAngle) {}

  parse(): number {
    const v = this.expr()
    const rest = this.peek()
    if (rest) fail(`多余的符号「${this.text(rest)}」`)
    return v
  }

  private peek(offset = 0): Token | undefined {
    return this.tokens[this.i + offset]
  }
  private next(): Token {
    const t = this.tokens[this.i++]
    if (!t) fail('表达式不完整')
    return t
  }
  private text(t: Token): string {
    switch (t.kind) {
      case 'num':
        return String(t.value)
      case 'ident':
        return t.text
      case 'op':
        return t.text
      case ',':
        return ','
      default:
        return t.kind === '(' ? '(' : ')'
    }
  }
  private isOp(t: Token | undefined, text: string): boolean {
    return !!t && t.kind === 'op' && t.text === text
  }
  private expect(kind: '(' | ')' | ',', what: string): void {
    const t = this.peek()
    if (!t) fail(what)
    this.next()
    if (t.kind !== kind) fail(`${what}，但遇到「${this.text(t)}」`)
  }
  private enter(): void {
    this.depth++
    if (this.depth > MAX_DEPTH) fail('括号嵌套过深')
  }
  private leave(): void {
    this.depth--
  }

  /** expr := addsub */
  private expr(): number {
    this.enter()
    const v = this.addsub()
    this.leave()
    return v
  }

  private addsub(): number {
    let v = this.muldiv()
    for (;;) {
      const t = this.peek()
      if (this.isOp(t, '+')) {
        this.next()
        v += this.muldiv()
      } else if (this.isOp(t, '-')) {
        this.next()
        v -= this.muldiv()
      } else {
        return v
      }
    }
  }

  private muldiv(): number {
    let v = this.unary()
    for (;;) {
      const t = this.peek()
      if (this.isOp(t, '*')) {
        this.next()
        v *= this.unary()
      } else if (this.isOp(t, '/')) {
        this.next()
        const d = this.unary()
        if (d === 0) fail('除数不能为 0')
        v /= d
      } else if (t && (t.kind === 'num' || t.kind === 'ident' || t.kind === '(')) {
        // 隐式乘法：2(3+4)、2π、3sqrt(4)
        v *= this.unary()
      } else {
        return v
      }
    }
  }

  private unary(): number {
    const t = this.peek()
    if (this.isOp(t, '-')) {
      this.next()
      return -this.unary()
    }
    if (this.isOp(t, '+')) {
      this.next()
      return this.unary()
    }
    return this.power()
  }

  /** power := postfix ('^' unary)? —— 右结合，且指数允许一元负号 */
  private power(): number {
    const base = this.postfix()
    if (this.isOp(this.peek(), '^')) {
      this.next()
      return base ** this.unary()
    }
    return base
  }

  private postfix(): number {
    let v = this.primary()
    for (;;) {
      const t = this.peek()
      if (this.isOp(t, '!')) {
        this.next()
        v = factorial(v)
      } else if (this.isOp(t, '%')) {
        this.next()
        v = v / 100
      } else {
        return v
      }
    }
  }

  private primary(): number {
    const t = this.next()
    if (t.kind === 'num') return t.value
    if (t.kind === '(') {
      this.enter()
      const v = this.expr()
      this.expect(')', '缺少右括号')
      this.leave()
      return v
    }
    if (t.kind === 'ident') return this.ident(t.text)
    if (t.kind === 'op') fail(`符号「${t.text}」位置不对`)
    fail(`意外的符号「${this.text(t)}」`)
  }

  private ident(name: string): number {
    const after = this.peek()
    if (after && after.kind === '(') {
      const fn = FUNCTIONS[name.toLowerCase()]
      if (!fn) fail(`未知的函数「${name}」`)
      this.next() // 吃掉 '('
      this.enter()
      const args: number[] = []
      if (this.peek()?.kind !== ')') {
        args.push(this.expr())
        while (this.peek()?.kind === ',') {
          this.next()
          args.push(this.expr())
        }
      }
      this.expect(')', `函数 ${name} 缺少右括号`)
      this.leave()
      if (args.length < fn.minArgs || args.length > fn.maxArgs) {
        const need =
          fn.maxArgs === Infinity
            ? `至少 ${fn.minArgs} 个`
            : fn.minArgs === fn.maxArgs
              ? `${fn.minArgs} 个`
              : `${fn.minArgs}~${fn.maxArgs} 个`
        fail(`函数 ${name} 需要 ${need}参数，实际收到 ${args.length} 个`)
      }
      return guard(fn.apply(args, this.angle), name)
    }
    const constant = CONSTANTS.get(name.toLowerCase())
    if (constant !== undefined) return constant
    fail(`未知的名称「${name}」，请使用函数（如 sqrt）或常量（如 pi）`)
  }
}

/* ---------------- 对外接口 ---------------- */

/** 求值：解析失败或结果非法时抛出中文错误信息 */
export function evaluate(expr: string, opts: CalcOptions = {}): CalcResult {
  const normalized = expr.trim()
  const tokens = tokenize(normalized)
  const value = new Parser(tokens, opts.angle ?? 'deg').parse()
  if (Number.isNaN(value)) fail('结果不是实数')
  if (!Number.isFinite(value)) fail('计算结果超出范围')
  return { expr: normalized, value, formatted: formatNumber(value) }
}

/** 表达式是否可求值（不抛异常） */
export function isValid(expr: string, opts: CalcOptions = {}): boolean {
  try {
    evaluate(expr, opts)
    return true
  } catch {
    return false
  }
}

function groupDigits(s: string): string {
  const neg = s.startsWith('-')
  const body = neg ? s.slice(1) : s
  const [int, dec] = body.split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${neg ? '-' : ''}${grouped}${dec !== undefined ? `.${dec}` : ''}`
}

function trimExponential(s: string): string {
  const [mantissa, exp] = s.split('e')
  const m = mantissa.includes('.')
    ? mantissa.replace(/0+$/, '').replace(/\.$/, '')
    : mantissa
  const e = Number(exp)
  return `${m}e${e >= 0 ? '+' : ''}${e}`
}

/** 数字展示：12 位有效数字，可选千分位；极大/极小值使用科学计数法 */
export function formatNumber(n: number, group = true): string {
  if (Number.isNaN(n)) return 'NaN'
  if (!Number.isFinite(n)) return n > 0 ? 'Infinity' : '-Infinity'
  const v = Object.is(n, -0) ? 0 : n
  const abs = Math.abs(v)
  if (abs >= 1e21 || (abs > 0 && abs < 1e-9)) return trimExponential(v.toExponential(9))
  const s = Number(v.toPrecision(12)).toString()
  if (s.includes('e')) return trimExponential(s)
  return group ? groupDigits(s) : s
}
