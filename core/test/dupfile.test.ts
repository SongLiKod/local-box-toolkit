import { describe, expect, it } from 'vitest'
import {
  formatDupList,
  groupBySize,
  refineGroups,
  statDuplicates,
  wasteOf,
  type DupFileLike,
} from '../src/tools/dupfile'

function f(id: string, name: string, size: number, path?: string): DupFileLike {
  return { id, name, size, path }
}

describe('重复文件查找', () => {
  it('按体积分组：单个文件与 0 字节不参与，体积大的在前', () => {
    const files = [
      f('1', 'a', 100),
      f('2', 'b', 100),
      f('3', 'c', 500), // 只有一个，不算候选
      f('4', 'd', 0),
      f('5', 'e', 0), // 0 字节即使有两个也不比对
      f('6', 'f', 7),
    ]
    const groups = groupBySize(files)
    expect(groups).toHaveLength(1)
    expect(groups[0].size).toBe(100)
    expect(groups[0].items.map((i) => i.id)).toEqual(['1', '2'])
  })

  it('多个候选组按体积降序排列', () => {
    const files = [
      f('a1', 'a1', 10),
      f('a2', 'a2', 10),
      f('b1', 'b1', 999),
      f('b2', 'b2', 999),
    ]
    expect(groupBySize(files).map((g) => g.size)).toEqual([999, 10])
    expect(groupBySize([])).toEqual([])
  })

  it('同体积但内容不同不算重复，内容相同才成组', async () => {
    const files = [
      f('1', 'a.txt', 10, 'x/a.txt'),
      f('2', 'b.txt', 10, 'y/b.txt'),
      f('3', 'c.txt', 10, 'z/c.txt'),
    ]
    const content: Record<string, string> = { 1: 'same', 2: 'same', 3: 'other' }
    const groups = await refineGroups(groupBySize(files), async (item) => content[item.id])
    expect(groups).toHaveLength(1)
    expect(groups[0].items.map((i) => i.id)).toEqual(['1', '2'])
    expect(groups[0].hash).toBe('same')
    expect(statDuplicates(groups)).toEqual({ groups: 1, files: 2, waste: 10 })
    expect(wasteOf(groups[0])).toBe(10)
  })

  it('按"可释放空间"降序排序', async () => {
    const files = [
      f('a1', 'a1', 10),
      f('a2', 'a2', 10),
      f('a3', 'a3', 10), // 可释放 20
      f('b1', 'b1', 100),
      f('b2', 'b2', 100), // 可释放 100
    ]
    const content: Record<string, string> = { a1: 'A', a2: 'A', a3: 'A', b1: 'B', b2: 'B' }
    const groups = await refineGroups(groupBySize(files), async (i) => content[i.id])
    expect(groups.map((g) => g.size)).toEqual([100, 10])
  })

  it('哈希失败的文件被排除且不中断整体', async () => {
    const files = [f('1', 'a', 9), f('2', 'b', 9), f('3', 'c', 9)]
    const groups = await refineGroups(groupBySize(files), async (item) => {
      if (item.id === '1') throw new Error('io error')
      return 'same'
    })
    expect(groups).toHaveLength(1)
    expect(groups[0].items.map((i) => i.id)).toEqual(['2', '3'])
  })

  it('进度回调覆盖全部待比对文件', async () => {
    const files = [f('1', 'a', 5), f('2', 'b', 5), f('3', 'c', 5), f('4', 'd', 5)]
    const seen: number[] = []
    let total = 0
    await refineGroups(
      groupBySize(files),
      async () => 'h',
      (p) => {
        seen.push(p.done)
        total = p.total
      },
    )
    expect(total).toBe(4)
    expect(Math.max(...seen)).toBe(4)
    expect(seen[0]).toBe(0)
  })

  it('shouldStop 中止后返回已完成部分', async () => {
    const files = Array.from({ length: 6 }, (_, i) => f(String(i), `f${i}`, 3))
    let calls = 0
    const groups = await refineGroups(
      groupBySize(files),
      async () => {
        calls++
        return 'h'
      },
      undefined,
      { shouldStop: () => calls >= 2 },
    )
    expect(calls).toBe(2)
    expect(groups).toHaveLength(1)
    expect(groups[0].items).toHaveLength(2)
  })

  it('清单导出包含路径、体积与哈希', async () => {
    const files = [f('1', 'a.txt', 10, 'x/a.txt'), f('2', 'b.txt', 10, 'y/b.txt')]
    const groups = await refineGroups(groupBySize(files), async () => 'same')
    const text = formatDupList(groups)
    expect(text).toContain('# 重复文件清单')
    expect(text).toContain('x/a.txt')
    expect(text).toContain('y/b.txt')
    expect(text).toContain('sha256=same')
    expect(formatDupList([])).toContain('共 0 组重复')
  })
})
