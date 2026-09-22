import { describe, expect, it } from 'vitest'
import { hashText } from '../src/devtools/hash'

describe('哈希计算（crypto-js 标准向量）', () => {
  it('MD5', () => {
    expect(hashText('md5', '')).toBe('d41d8cd98f00b204e9800998ecf8427e')
    expect(hashText('md5', 'abc')).toBe('900150983cd24fb0d6963f7d28e17f72')
    expect(hashText('md5', '中文')).toBe('a7bac2239fcdcb3a067903d8077c4a07')
  })
  it('SHA1', () => {
    expect(hashText('sha1', 'abc')).toBe('a9993e364706816aba3e25717850c26c9cd0d89d')
  })
  it('SHA256', () => {
    expect(hashText('sha256', 'abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    )
  })
})
