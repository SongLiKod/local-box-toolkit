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

  it('配色方案与自定义主题可持久化，并兼容旧版 mode', async () => {
    const s = mk()
    expect(await s.getThemePreference()).toEqual({ mode: 'light', palette: 'azure' })
    await s.setThemePreference({
      mode: 'dark',
      palette: 'custom',
      custom: { dark: { primary: '#9B8CFF' } },
    })
    const pref = await s.getThemePreference()
    expect(pref.palette).toBe('custom')
    expect(pref.custom?.dark?.primary).toBe('#9B8CFF')
    const adapter = new MemoryAdapter()
    await adapter.set('themeMode', 'system')
    const legacy = new LocalStore(adapter)
    expect(await legacy.getThemePreference()).toEqual({ mode: 'system', palette: 'azure' })
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

  it('历史记录可保存 payload', async () => {
    const s = mk()
    const saved = await s.addHistory({
      toolId: 'uuid',
      toolName: 'UUID生成器',
      action: '生成UUID',
      detail: 'v4 × 2 · a b',
      payload: { version: 'v4', count: 2, uuids: ['a', 'b'] },
    })
    const list = await s.getHistory()
    expect(list[0].id).toBe(saved.id)
    expect(list[0].payload).toEqual({ version: 'v4', count: 2, uuids: ['a', 'b'] })
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

  it('便签增改删', async () => {
    const s = mk()
    const n = await s.upsertNote({ title: 'ideas', body: 'hello' })
    expect((await s.getNotes())[0].body).toBe('hello')
    await s.upsertNote({ id: n.id, title: 'ideas', body: 'world' })
    expect((await s.getNotes())[0].body).toBe('world')
    await s.deleteNote(n.id)
    expect(await s.getNotes()).toEqual([])
  })

  it('备份导出导入可合并', async () => {
    const a = mk()
    await a.setThemeMode('dark')
    await a.toggleFavorite('uuid')
    await a.upsertNote({ title: 'n1', body: 'b1' })
    const bak = await a.exportBackup()
    const b = mk()
    await b.toggleFavorite('hash')
    await b.importBackup(bak, 'merge')
    expect(await b.getThemeMode()).toBe('dark')
    const favs = await b.getFavorites()
    expect(favs.map((f) => f.toolId).sort()).toEqual(['hash', 'uuid'])
    expect((await b.getNotes())[0].title).toBe('n1')
  })
})
