import type { KVAdapter } from './adapter'

declare const uni: {
  getStorageSync(key: string): unknown
  setStorageSync(key: string, value: unknown): void
  removeStorageSync(key: string): void
}

/**
 * 安卓端适配器：uni.setStorage 本地存储 API（TechDoc 5 / PRD 3.5）。
 * 仅在 uni-app 运行时可用。
 */
export class UniStorageAdapter implements KVAdapter {
  private prefix: string
  constructor(prefix = 'localbox:') {
    this.prefix = prefix
  }
  async get<T>(key: string): Promise<T | null> {
    const raw = uni.getStorageSync(this.prefix + key)
    if (raw === '' || raw == null) return null
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw) as T
      } catch {
        return raw as unknown as T
      }
    }
    return raw as T
  }
  async set(key: string, value: unknown): Promise<void> {
    uni.setStorageSync(this.prefix + key, JSON.stringify(value))
  }
  async remove(key: string): Promise<void> {
    uni.removeStorageSync(this.prefix + key)
  }
}
