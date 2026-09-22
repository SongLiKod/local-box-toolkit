const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz'

export function convertRadix(value: string, fromBase: number, toBase: number): string {
  const from = Math.floor(fromBase)
  const to = Math.floor(toBase)
  if (from < 2 || from > 36 || to < 2 || to > 36) throw new Error('进制范围 2~36')
  const src = value.trim().replace(/^0x/i, from === 16 ? '' : '0x').toLowerCase()
  if (!src) throw new Error('请输入数值')
  const neg = src.startsWith('-')
  const body = neg ? src.slice(1) : src
  if (!body) throw new Error('请输入数值')
  let n = 0n
  for (const ch of body) {
    const d = DIGITS.indexOf(ch)
    if (d < 0 || d >= from) throw new Error(`含有不属于 ${from} 进制的字符`)
    n = n * BigInt(from) + BigInt(d)
  }
  if (n === 0n) return '0'
  let out = ''
  let x = n
  const base = BigInt(to)
  while (x > 0n) {
    const rem = Number(x % base)
    out = DIGITS[rem] + out
    x /= base
  }
  return neg ? `-${out}` : out
}

export function convertRadixSet(value: string, fromBase: number): Record<string, string> {
  const n = convertRadix(value, fromBase, 10)
  return {
    bin: convertRadix(n, 10, 2),
    oct: convertRadix(n, 10, 8),
    dec: n,
    hex: convertRadix(n, 10, 16),
  }
}
