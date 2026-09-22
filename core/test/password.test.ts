import { describe, expect, it } from 'vitest'
import { generatePassword, passwordStrength } from '../src/devtools/password'

describe('随机密码', () => {
  it('长度与字符集符合选项', () => {
    const p = generatePassword({
      length: 20,
      lowercase: true,
      uppercase: false,
      digits: false,
      symbols: false,
      excludeChars: '',
      guaranteeEach: true,
    })
    expect(p).toHaveLength(20)
    expect(p).toMatch(/^[a-z]+$/)
  })
  it('每类至少一个', () => {
    const p = generatePassword({
      length: 8,
      lowercase: true,
      uppercase: true,
      digits: true,
      symbols: true,
      excludeChars: '',
      guaranteeEach: true,
    })
    expect(p).toMatch(/[a-z]/)
    expect(p).toMatch(/[A-Z]/)
    expect(p).toMatch(/\d/)
    expect(p).toMatch(/[^a-zA-Z0-9]/)
  })
  it('排除字符不出现', () => {
    const p = generatePassword({
      length: 64,
      lowercase: true,
      uppercase: true,
      digits: true,
      symbols: false,
      excludeChars: 'aeiouAEIOU0123456789',
      guaranteeEach: false,
    })
    expect(p).not.toMatch(/[aeiouAEIOU0-9]/)
  })
  it('空字符集报错', () => {
    expect(() =>
      generatePassword({
        length: 8,
        lowercase: false,
        uppercase: false,
        digits: false,
        symbols: false,
        excludeChars: '',
        guaranteeEach: false,
      })
    ).toThrow()
  })
  it('强度评估', () => {
    expect(passwordStrength('abc').score).toBeLessThan(3)
    expect(passwordStrength('Ab3!xKz9#mQp').score).toBeGreaterThanOrEqual(4)
  })
})
