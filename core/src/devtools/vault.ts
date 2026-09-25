/** 本地保险箱：PBKDF2 派生密钥 + AES-GCM 加密，密文只落在本机（PRD 3.4 / 第 7 章隐私） */

export interface VaultEntry {
  id: string
  label: string
  kind: 'password' | 'key' | 'card' | 'note'
  value: string
  memo?: string
  updatedAt: number
}

/** 落库的密文结构，字段全部可序列化 */
export interface SealedVault {
  v: 1
  kdf: 'PBKDF2'
  hash: 'SHA-256'
  iter: number
  /** base64(16B 随机盐) */
  salt: string
  /** base64(12B IV) */
  iv: string
  /** base64(AES-GCM 密文) */
  ct: string
}

export const VAULT_ITERATIONS = 310_000

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const encoder = new TextEncoder()
const decoder = new TextDecoder()

export function toBase64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0
    const n = (a << 16) | (b << 8) | c
    out += B64[(n >> 18) & 63]
    out += B64[(n >> 12) & 63]
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63] : '='
    out += i + 2 < bytes.length ? B64[n & 63] : '='
  }
  return out
}

export function fromBase64(s: string): Uint8Array {
  // 允许带换行/空白的粘贴文本；'=' 补位符直接丢弃（长度已反映补齐位数）
  const clean = s.replace(/[^A-Za-z0-9+/]/g, '')
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4))
  let bits = 0
  let value = 0
  let idx = 0
  for (const ch of clean) {
    const v = B64.indexOf(ch)
    if (v < 0) continue
    value = (value << 6) | v
    bits += 6
    if (bits >= 8) {
      bits -= 8
      if (idx < out.length) out[idx++] = (value >> bits) & 0xff
    }
  }
  return out
}

function randomBytes(len: number): Uint8Array {
  const buf = new Uint8Array(len)
  const c = globalThis.crypto
  if (c?.getRandomValues) {
    c.getRandomValues(buf)
    return buf
  }
  // 极老环境兜底：仅用于取随机数，不涉及加密算法本身
  for (let i = 0; i < len; i++) buf[i] = Math.floor(Math.random() * 256)
  return buf
}

function subtle(): SubtleCrypto {
  const s = globalThis.crypto?.subtle
  if (!s) throw new Error('当前环境不支持 WebCrypto，无法使用保险箱')
  return s
}

async function deriveKey(pass: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const base = await subtle().importKey('raw', encoder.encode(pass), 'PBKDF2', false, ['deriveKey'])
  return subtle().deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** 加密并序列化保险箱内容；每次调用都换新盐与 IV */
export async function sealVault(
  pass: string,
  entries: VaultEntry[],
  iterations: number = VAULT_ITERATIONS,
): Promise<SealedVault> {
  if (!pass) throw new Error('口令不能为空')
  const salt = randomBytes(16)
  const iv = randomBytes(12)
  const key = await deriveKey(pass, salt, iterations)
  const ct = await subtle().encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    encoder.encode(JSON.stringify(entries)),
  )
  return {
    v: 1,
    kdf: 'PBKDF2',
    hash: 'SHA-256',
    iter: iterations,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ct: toBase64(new Uint8Array(ct)),
  }
}

/** 解密保险箱；口令错误或密文被改都会落到同一个错误上，不泄露细节 */
export async function openVault(pass: string, vault: SealedVault): Promise<VaultEntry[]> {
  if (!vault || vault.v !== 1 || !vault.salt || !vault.iv || !vault.ct) {
    throw new Error('保险箱格式不正确')
  }
  if (!pass) throw new Error('口令不能为空')
  const key = await deriveKey(pass, fromBase64(vault.salt), vault.iter || VAULT_ITERATIONS)
  let plain: ArrayBuffer
  try {
    plain = await subtle().decrypt(
      { name: 'AES-GCM', iv: fromBase64(vault.iv) as BufferSource },
      key,
      fromBase64(vault.ct) as BufferSource,
    )
  } catch {
    throw new Error('口令错误或数据已被篡改')
  }
  try {
    const parsed: unknown = JSON.parse(decoder.decode(plain))
    if (!Array.isArray(parsed)) throw new Error('not array')
    return parsed as VaultEntry[]
  } catch {
    throw new Error('保险箱数据损坏')
  }
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4
  label: '太短' | '弱' | '一般' | '较强' | '强'
}

/** 口令强度：长度 + 字符种类，纯本地评估 */
export function passwordStrength(p: string): PasswordStrength {
  if (p.length < 8) return { score: 0, label: '太短' }
  let kinds = 0
  if (/[a-z]/.test(p)) kinds++
  if (/[A-Z]/.test(p)) kinds++
  if (/\d/.test(p)) kinds++
  if (/[^\w\s]/.test(p)) kinds++
  if (p.length >= 16 && kinds >= 3) return { score: 4, label: '强' }
  if (p.length >= 12 && kinds >= 3) return { score: 3, label: '较强' }
  if (p.length >= 10 && kinds >= 2) return { score: 2, label: '一般' }
  return { score: 1, label: '弱' }
}

/** 新建一条记录的 id */
export function newEntryId(): string {
  return `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
