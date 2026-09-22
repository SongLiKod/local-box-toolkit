import type { KVAdapter } from './adapter'
import { getNative } from '../env'

/**
 * Electron 端适配器：本地 JSON 配置文件（AppData / userData 目录），
 * 通过 preload 暴露的 localboxNative.configGet/configSet 读写。
 */
export class NativeJsonAdapter implements KVAdapter {
  async get<T>(key: string): Promise<T | null> {
    const native = getNative()
    if (!native) return null
    const raw = await native.configGet(key)
    if (raw == null) return null
    try {
      return JSON.parse(raw) as T
    } catch {
      return raw as unknown as T
    }
  }

  async set(key: string, value: unknown): Promise<void> {
    const native = getNative()
    if (!native) return
    await native.configSet(key, JSON.stringify(value))
  }

  async remove(key: string): Promise<void> {
    const native = getNative()
    if (!native) return
    await native.configSet(key, '')
  }
}

/** localStorage 同步适配器（主题等轻量配置，Web 端） */
export class LocalStorageAdapter implements KVAdapter {
  private prefix: string
  constructor(prefix = 'localbox:') {
    this.prefix = prefix
  }
  async get<T>(key: string): Promise<T | null> {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(this.prefix + key)
    if (raw == null) return null
    try {
      return JSON.parse(raw) as T
    } catch {
      return raw as unknown as T
    }
  }
  async set(key: string, value: unknown): Promise<void> {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(this.prefix + key, JSON.stringify(value))
  }
  async remove(key: string): Promise<void> {
    if (typeof localStorage === 'undefined') return
    localStorage.removeItem(this.prefix + key)
  }
}
