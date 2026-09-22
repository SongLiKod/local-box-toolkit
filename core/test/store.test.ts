import { describe, expect, it } from 'vitest'
import { LocalStore } from '../src/storage/store'
import { MemoryAdapter } from '../src/storage/memory'

function mk(): LocalStore {
  return new LocalStore(new MemoryAdapter())
}

describe('本地持久化仓库', () => {
  it('主题默认浅色并可持久化', async () => {
    const s = mk()
    expect(await s.getThemeMode()).toBe('light')
    await s.setThemeMode('dark')
    expect(await s.getThemeMode()).toBe('dark')
  })

  it('收藏切换', async () => {
    const s = mk()
    expect(await s.toggleFavorite('uuid')).toBe(true)
    expect(await s.isFavorite('uuid')).toBe(true)
    expect(await s.toggleFavorite('uuid')).toBe(false)
    expect(await s.getFavorites()).toHaveLength(0)
  })

  it('历史记录最新在前且封顶500', async () => {
    const s = mk()
    for (let i = 0; i < 5; i++) {
      await s.addHistory({ toolId: 't', toolName: 'T', action: 'a', detail: `d${i}` })
    }
    const list = await s.getHistory()
    expect(list[0].detail).toBe('d4')
    for (let i = 0; i < 600; i++) {
      await s.addHistory({ toolId: 't', toolName: 'T', action: 'a', detail: `x${i}` })
    }
    expect((await s.getHistory()).length).toBeLessThanOrEqual(500)
  })

  it('清空历史', async () => {
    const s = mk()
    await s.addHistory({ toolId: 't', toolName: 'T', action: 'a', detail: 'd' })
    await s.clearHistory()
    expect(await s.getHistory()).toEqual([])
  })

  it('工具参数配置读写', async () => {
    const s = mk()
    expect(await s.getToolParams('doc2image')).toBeNull()
    await s.setToolParams('doc2image', { dpi: 300, format: 'png' })
    expect(await s.getToolParams<{ dpi: number }>('doc2image')).toEqual({ dpi: 300, format: 'png' })
  })
})
