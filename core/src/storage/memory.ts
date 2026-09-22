import type { KVAdapter } from './adapter'

export class MemoryAdapter implements KVAdapter {
  private map = new Map<string, unknown>()
  async get<T>(key: string): Promise<T | null> {
    return (this.map.get(key) as T) ?? null
  }
  async set(key: string, value: unknown): Promise<void> {
    this.map.set(key, JSON.parse(JSON.stringify(value)))
  }
  async remove(key: string): Promise<void> {
    this.map.delete(key)
  }
}
