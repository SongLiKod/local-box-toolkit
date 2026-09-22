/** 三端统一本地存储适配器接口：Web=IndexedDB+localStorage，Electron=AppData JSON，安卓=uni storage */
export interface KVAdapter {
  get<T>(key: string): Promise<T | null>
  set(key: string, value: unknown): Promise<void>
  remove(key: string): Promise<void>
}
