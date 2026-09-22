import { describe, expect, it } from 'vitest'
import {
  trimTrailingSpaces,
  removeAllSpaces,
  removeEmptyLines,
  joinLines,
  trimEachLine,
  dedupeSpaces,
  countText,
} from '../src/tools/text'

describe('文本处理', () => {
  it('去行尾空格', () => {
    expect(trimTrailingSpaces('abc  \ndef')).toBe('abc\ndef')
  })
  it('去所有空格（保留换行）', () => {
    expect(removeAllSpaces('a b\nc d')).toBe('ab\ncd')
  })
  it('去空格与换行', () => {
    expect(removeAllSpaces('a b\nc d', true)).toBe('abcd')
  })
  it('去空行', () => {
    expect(removeEmptyLines('a\n\n b \n\n')).toBe('a\n b ')
  })
  it('合并为一行', () => {
    expect(joinLines('a\r\nb\nc', ' ')).toBe('a b c')
  })
  it('每行去首尾空白', () => {
    expect(trimEachLine('  a  \n  b')).toBe('a\nb')
  })
  it('多余空格折叠', () => {
    expect(dedupeSpaces('a    b')).toBe('a b')
  })
})

describe('字数统计', () => {
  it('中英文混合统计', () => {
    const s = countText('你好 hello 世界\n第二行')
    expect(s.chars).toBe(15)
    expect(s.cjkChars).toBe(7)
    expect(s.words).toBe(8)
    expect(s.lines).toBe(2)
  })
  it('空文本', () => {
    const s = countText('')
    expect(s.chars).toBe(0)
    expect(s.lines).toBe(0)
  })
})
