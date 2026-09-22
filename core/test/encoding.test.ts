import { describe, expect, it } from 'vitest'
import { base64Encode, base64Decode, base64EncodeUrlSafe, base64DecodeUrlSafe } from '../src/devtools/base64'
import { urlEncode, urlDecode, urlEncodeComponent, urlDecodeComponent } from '../src/devtools/urlcode'

describe('Base64', () => {
  it('UTF-8 中文往返一致', () => {
    const s = '你好 LocalBox 🚀 =?/'
    expect(base64Decode(base64Encode(s))).toBe(s)
  })
  it('已知向量', () => {
    expect(base64Encode('abc')).toBe('YWJj')
    expect(base64Decode('YWJj')).toBe('abc')
  })
  it('URL 安全模式无 +/= ', () => {
    const enc = base64EncodeUrlSafe('???>>>')
    expect(enc).not.toContain('+')
    expect(enc).not.toContain('/')
    expect(enc).not.toContain('=')
    expect(base64DecodeUrlSafe(enc)).toBe('???>>>')
  })
})

describe('URL 编解码', () => {
  it('component 编解码往返', () => {
    const s = 'a b&c=中文/?#'
    expect(urlDecodeComponent(urlEncodeComponent(s))).toBe(s)
  })
  it('encodeURI 保留结构字符', () => {
    const u = 'https://example.com/a b?q=你好'
    const enc = urlEncode(u)
    expect(enc).toContain('https://example.com/')
    expect(urlDecode(enc)).toBe(u)
  })
})
