import { describe, expect, it } from 'vitest'
import {
  fromBase64,
  newEntryId,
  openVault,
  passwordStrength,
  sealVault,
  toBase64,
  VAULT_ITERATIONS,
  type VaultEntry,
} from '../src/devtools/vault'

const ITER = 1000

function entry(partial: Partial<VaultEntry> = {}): VaultEntry {
  return {
    id: newEntryId(),
    label: 'GitHub Token',
    kind: 'password',
    value: 'ghp_xxxxxxxxxxxx',
    memo: 'CI 专用',
    updatedAt: Date.now(),
    ...partial,
  }
}

describe('本地保险箱', () => {
  it('base64 编解码往返（含 1/2/3/4/5 字节与非 3 倍数补齐）', () => {
    for (const len of [1, 2, 3, 4, 5, 7, 16, 31]) {
      const raw = new Uint8Array(len)
      for (let i = 0; i < len; i++) raw[i] = (i * 37 + 11) % 256
      const b64 = toBase64(raw)
      expect(b64).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)
      expect(Array.from(fromBase64(b64))).toEqual(Array.from(raw))
    }
    expect(Array.from(fromBase64(''))).toEqual([])
    expect(Array.from(fromBase64('AQID'))).toEqual([1, 2, 3])
    expect(Array.from(fromBase64('AQI='))).toEqual([1, 2])
    expect(Array.from(fromBase64('AQ=='))).toEqual([1])
  })

  it('加密封存后可用同一口令解开，内容完整往返', async () => {
    const list = [entry(), entry({ label: '银行卡', kind: 'card', value: '6222 **** **** 1234' })]
    const sealed = await sealVault('correct horse', list, ITER)
    expect(sealed.v).toBe(1)
    expect(sealed.kdf).toBe('PBKDF2')
    expect(sealed.hash).toBe('SHA-256')
    expect(sealed.iter).toBe(ITER)
    expect(sealed.ct).not.toContain('GitHub')
    const opened = await openVault('correct horse', sealed)
    expect(opened).toHaveLength(2)
    expect(opened[0].value).toBe('ghp_xxxxxxxxxxxx')
    expect(opened[1].kind).toBe('card')
  })

  it('空口令直接拒绝', async () => {
    await expect(sealVault('', [], ITER)).rejects.toThrow('口令不能为空')
    const sealed = await sealVault('x', [], ITER)
    await expect(openVault('', sealed)).rejects.toThrow('口令不能为空')
  })

  it('口令错误 → 明确提示且不返回任何内容', async () => {
    const sealed = await sealVault('right-pass', [entry()], ITER)
    await expect(openVault('wrong-pass', sealed)).rejects.toThrow('口令错误或数据已被篡改')
    await expect(openVault('Right-Pass', sealed)).rejects.toThrow('口令错误或数据已被篡改')
  })

  it('密文被篡改 → 与口令错误同样报错', async () => {
    const sealed = await sealVault('pw', [entry()], ITER)
    const bytes = fromBase64(sealed.ct)
    bytes[bytes.length - 1] ^= 0xff
    const tampered = { ...sealed, ct: toBase64(bytes) }
    await expect(openVault('pw', tampered)).rejects.toThrow('口令错误或数据已被篡改')
  })

  it('盐或 IV 被替换 → 无法解密', async () => {
    const sealed = await sealVault('pw', [entry()], ITER)
    const other = await sealVault('pw', [entry()], ITER)
    await expect(openVault('pw', { ...sealed, salt: other.salt })).rejects.toThrow(
      '口令错误或数据已被篡改',
    )
    await expect(openVault('pw', { ...sealed, iv: other.iv })).rejects.toThrow(
      '口令错误或数据已被篡改',
    )
  })

  it('结构字段缺失或版本不对 → 格式错误', async () => {
    const sealed = await sealVault('pw', [], ITER)
    await expect(openVault('pw', { ...sealed, v: 2 } as never)).rejects.toThrow('保险箱格式不正确')
    await expect(openVault('pw', { ...sealed, ct: '' })).rejects.toThrow('保险箱格式不正确')
    await expect(openVault('pw', null as never)).rejects.toThrow('保险箱格式不正确')
  })

  it('每次封装都换新盐与 IV（同口令也不同密文）', async () => {
    const a = await sealVault('same', [], ITER)
    const b = await sealVault('same', [], ITER)
    expect(a.salt).not.toBe(b.salt)
    expect(a.iv).not.toBe(b.iv)
    expect(a.ct).not.toBe(b.ct)
  })

  it('默认迭代次数落在安全量级', () => {
    expect(VAULT_ITERATIONS).toBeGreaterThanOrEqual(300000)
  })

  it('口令强度评估', () => {
    expect(passwordStrength('abc')).toEqual({ score: 0, label: '太短' })
    expect(passwordStrength('abcdefgh').label).toBe('弱')
    expect(passwordStrength('abcdefg123').label).toBe('一般')
    expect(passwordStrength('Abcdefg12345').label).toBe('较强')
    expect(passwordStrength('Abcdefg!23456789').label).toBe('强')
  })
})
