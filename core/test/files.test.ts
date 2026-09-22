import { describe, expect, it } from 'vitest'
import { extOf, baseName, formatBytes } from '../src/files'

describe('文件工具', () => {
  it('扩展名解析', () => {
    expect(extOf('a.BbC')).toBe('bbc')
    expect(extOf('noext')).toBe('')
    expect(baseName('report.final.docx')).toBe('report.final')
    expect(baseName('noext')).toBe('noext')
  })
  it('体积格式化', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
  })
})
