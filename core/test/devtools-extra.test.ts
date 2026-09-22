import { describe, expect, it } from 'vitest'
import { formatJson, minifyJson, validateJson } from '../src/devtools/jsonfmt'
import { testRegex } from '../src/devtools/regex'
import { decodeJwt } from '../src/devtools/jwt'
import { convertRadix, convertRadixSet } from '../src/devtools/radix'
import { diffLines, diffStats } from '../src/tools/diff'

describe('JSON 格式化', () => {
  it('格式化与压缩', () => {
    const src = '{"a":1,"b":[2,3]}'
    const pretty = formatJson(src, 2)
    expect(pretty.ok).toBe(true)
    expect(pretty.text).toContain('\n')
    const mini = minifyJson(pretty.text)
    expect(mini.ok).toBe(true)
    expect(mini.text).toBe(src)
  })
  it('非法 JSON 报错', () => {
    const r = validateJson('{a}')
    expect(r.ok).toBe(false)
    expect(r.error).toBeTruthy()
  })
})

describe('正则测试', () => {
  it('找出全部匹配', () => {
    const r = testRegex('\\d+', 'g', 'a12b3')
    expect(r.ok).toBe(true)
    expect(r.count).toBe(2)
    expect(r.matches[0].text).toBe('12')
  })
  it('非法正则报错', () => {
    const r = testRegex('(', '', 'x')
    expect(r.ok).toBe(false)
  })
})

describe('JWT 解析', () => {
  it('解码 header 与 payload', () => {
    const header = btoa('{"alg":"none","typ":"JWT"}').replace(/=+$/, '')
    const payload = btoa('{"sub":"42","name":"box"}').replace(/=+$/, '')
    const r = decodeJwt(`${header}.${payload}.sig`)
    expect(r.ok).toBe(true)
    expect(r.payload.json).toContain('"sub": "42"')
    expect(r.signature).toBe('sig')
  })
})

describe('进制转换', () => {
  it('十六进制与十进制互转', () => {
    expect(convertRadix('ff', 16, 10)).toBe('255')
    expect(convertRadix('255', 10, 16)).toBe('ff')
    const set = convertRadixSet('10', 10)
    expect(set.bin).toBe('1010')
    expect(set.hex).toBe('a')
  })
  it('非法字符报错', () => {
    expect(() => convertRadix('2', 2, 10)).toThrow()
  })
})

describe('文本对比', () => {
  it('标记增删行', () => {
    const lines = diffLines('a\nb\nc', 'a\nx\nc')
    const stats = diffStats(lines)
    expect(stats.same).toBe(2)
    expect(stats.added).toBe(1)
    expect(stats.removed).toBe(1)
  })
})
