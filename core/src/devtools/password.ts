export interface PasswordOptions {
  length: number
  lowercase: boolean
  uppercase: boolean
  digits: boolean
  symbols: boolean
  excludeChars: string
  /** 保证每种勾选字符集至少出现一个字符 */
  guaranteeEach: boolean
}

const CHARSETS = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>?/~',
}

function randomInt(max: number): number {
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  return arr[0] % max
}

/** 随机密码生成：Web Crypto 本地随机源 */
export function generatePassword(opts: PasswordOptions): string {
  const length = Math.min(128, Math.max(4, Math.floor(opts.length)))
  let pool = ''
  const groups: string[] = []
  const add = (enabled: boolean, chars: string): void => {
    if (!enabled) return
    const filtered = [...chars].filter((c) => !opts.excludeChars.includes(c)).join('')
    if (filtered.length > 0) {
      pool += filtered
      groups.push(filtered)
    }
  }
  add(opts.lowercase, CHARSETS.lowercase)
  add(opts.uppercase, CHARSETS.uppercase)
  add(opts.digits, CHARSETS.digits)
  add(opts.symbols, CHARSETS.symbols)
  if (pool.length === 0) throw new Error('字符集为空，请至少勾选一类字符且不要全部排除')

  const out: string[] = []
  if (opts.guaranteeEach) {
    for (const g of groups) out.push(g[randomInt(g.length)])
  }
  while (out.length < length) out.push(pool[randomInt(pool.length)])
  // Fisher-Yates 洗牌
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out.slice(0, length).join('')
}

export function passwordStrength(pwd: string): { score: number; label: string } {
  let score = 0
  if (pwd.length >= 8) score++
  if (pwd.length >= 12) score++
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++
  if (/\d/.test(pwd)) score++
  if (/[^a-zA-Z0-9]/.test(pwd)) score++
  const labels = ['很弱', '弱', '一般', '较强', '强', '很强']
  return { score, label: labels[Math.min(score, 5)] }
}
