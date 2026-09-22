import { v1 as uuidV1, v3 as uuidV3, v4 as uuidV4, v5 as uuidV5 } from 'uuid'

export type UuidVersion = 'v1' | 'v3' | 'v4' | 'v5'

export const NAMESPACE_PRESETS: Record<string, string> = {
  DNS: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  URL: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
}

export const MAX_UUID_COUNT = 10000

/**
 * UUID 生成器：v1/v3/v4/v5，数量 1~10000，自定义命名空间（PRD 3.2.1）。
 * v4 使用 Web Crypto API（uuid 库内部即 crypto.getRandomValues）。
 */
export function generateUuids(
  version: UuidVersion,
  count: number,
  options?: { name?: string; namespace?: string }
): string[] {
  const n = Math.min(MAX_UUID_COUNT, Math.max(1, Math.floor(count)))
  const out: string[] = []
  if (version === 'v3' || version === 'v5') {
    const name = options?.name ?? ''
    if (name.length === 0) throw new Error('v3/v5 需要提供命名名称')
    const ns = options?.namespace && options.namespace.length > 0 ? options.namespace : NAMESPACE_PRESETS.URL
    for (let i = 0; i < n; i++) {
      // 命名空间哈希为确定性结果，批量时追加序号生成不同值
      const input = n === 1 ? name : `${name}#${i + 1}`
      out.push(version === 'v3' ? uuidV3(input, ns) : uuidV5(input, ns))
    }
    return out
  }
  for (let i = 0; i < n; i++) {
    out.push(version === 'v1' ? uuidV1() : uuidV4())
  }
  return out
}

export function uuidsToText(list: string[]): string {
  return list.join('\n')
}
