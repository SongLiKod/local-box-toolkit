import { describe, expect, it } from 'vitest'
import { applyRename, buildRenameScript } from '../src/tools/rename'

describe('批量重命名', () => {
  it('前缀+后缀', () => {
    const r = applyRename(['a.txt', 'b.txt'], { prefix: 'x_', suffix: '_end' })
    expect(r.map((i) => i.to)).toEqual(['x_a_end.txt', 'x_b_end.txt'])
  })
  it('查找替换', () => {
    const r = applyRename(['photo_01.jpg'], { find: 'photo', replace: '图片' })
    expect(r[0].to).toBe('图片_01.jpg')
  })
  it('正则替换', () => {
    const r = applyRename(['IMG-2026.jpg'], { find: '\\d{4}', replace: '2027', useRegex: true })
    expect(r[0].to).toBe('IMG-2027.jpg')
  })
  it('序号补零', () => {
    const r = applyRename(['a.md', 'b.md', 'c.md'], {
      numbering: { start: 1, step: 1, digits: 3, position: 'prefix' },
    })
    expect(r[0].to).toBe('001_a.md')
    expect(r[2].to).toBe('003_c.md')
  })
  it('大小写与扩展名替换', () => {
    const r = applyRename(['Report.Docx'], { casing: 'lower', extTo: 'pdf' })
    expect(r[0].to).toBe('report.pdf')
  })
  it('脚本生成', () => {
    const s = buildRenameScript([{ from: 'a.txt', to: 'b.txt' }], 'win')
    expect(s).toContain('ren "a.txt" "b.txt"')
    const n = buildRenameScript([{ from: 'a.txt', to: 'b.txt' }], 'nix')
    expect(n).toContain('mv -- "a.txt" "b.txt"')
  })
})
