import { describe, expect, it } from 'vitest'
import { generateUuids, uuidsToText, MAX_UUID_COUNT, NAMESPACE_PRESETS } from '../src/devtools/uuid'

const V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const V1_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-1[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const ANY_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

describe('UUID 生成器', () => {
  it('v4 生成指定数量且格式正确', () => {
    const list = generateUuids('v4', 100)
    expect(list).toHaveLength(100)
    list.forEach((u) => expect(u).toMatch(V4_RE))
    expect(new Set(list).size).toBe(100)
  })

  it('v1 格式正确', () => {
    const list = generateUuids('v1', 5)
    list.forEach((u) => expect(u).toMatch(V1_RE))
  })

  it('v3/v5 确定性：相同输入相同输出', () => {
    const ns = NAMESPACE_PRESETS.URL
    const a = generateUuids('v3', 1, { name: 'hello', namespace: ns })
    const b = generateUuids('v3', 1, { name: 'hello', namespace: ns })
    expect(a).toEqual(b)
    const c = generateUuids('v5', 1, { name: 'hello', namespace: ns })
    expect(c).not.toEqual(a)
    expect(c[0]).toMatch(ANY_RE)
  })

  it('v3/v5 缺少名称时报错', () => {
    expect(() => generateUuids('v3', 1, { name: '' })).toThrow()
  })

  it('数量限制 1~10000', () => {
    expect(MAX_UUID_COUNT).toBe(10000)
    expect(generateUuids('v4', 99999)).toHaveLength(10000)
    expect(generateUuids('v4', 0)).toHaveLength(1)
  })

  it('uuidsToText 以换行连接', () => {
    expect(uuidsToText(['a', 'b'])).toBe('a\nb')
  })
})
