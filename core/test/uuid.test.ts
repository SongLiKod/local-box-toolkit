import { describe, expect, it } from 'vitest'
import {
  generateUuids,
  uuidsToText,
  MAX_UUID_COUNT,
  NAMESPACE_PRESETS,
  buildUuidHistoryPayload,
  summarizeUuidHistory,
  parseUuidHistory,
  UUID_HISTORY_STORE_LIMIT,
} from '../src/devtools/uuid'

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

  it('历史 payload 保存并可解析出原始 UUID', () => {
    const uuids = generateUuids('v4', 5)
    const payload = buildUuidHistoryPayload('v4', uuids)
    expect(payload.uuids).toEqual(uuids)
    expect(payload.truncated).toBe(false)
    const summary = summarizeUuidHistory(payload)
    expect(summary).toContain('v4 × 5')
    expect(summary).toContain(uuids[0])
    const parsed = parseUuidHistory({ payload })
    expect(parsed?.uuids).toEqual(uuids)
  })

  it('缺少 payload 时无法解析历史内容', () => {
    expect(parseUuidHistory({ detail: 'v4 × 10' })).toBeNull()
  })

  it('超量 UUID 截断保存', () => {
    const uuids = generateUuids('v4', UUID_HISTORY_STORE_LIMIT + 10)
    const payload = buildUuidHistoryPayload('v4', uuids)
    expect(payload.count).toBe(UUID_HISTORY_STORE_LIMIT + 10)
    expect(payload.uuids).toHaveLength(UUID_HISTORY_STORE_LIMIT)
    expect(payload.truncated).toBe(true)
    expect(summarizeUuidHistory(payload)).toContain('已存前')
  })
})
