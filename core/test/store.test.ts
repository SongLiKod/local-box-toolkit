import { describe, expect, it } from 'vitest'
import { LocalStore } from '../src/storage/store'
import { MemoryAdapter } from '../src/storage/memory'
import { sealVault } from '../src/devtools/vault'

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

  it('清空收藏', async () => {
    const s = mk()
    await s.toggleFavorite('uuid')
    await s.toggleFavorite('hash')
    await s.addHistory({ toolId: 't', toolName: 'T', action: 'a', detail: 'd' })
    await s.clearFavorites()
    expect(await s.getFavorites()).toEqual([])
    // 只清收藏，不动历史与主题
    expect(await s.getHistory()).toHaveLength(1)
    expect(await s.getThemeMode()).toBe('light')
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

  it('待办增改删与完成状态', async () => {
    const s = mk()
    const t = await s.upsertTodo({ title: '写周报', repeat: 'daily' })
    expect(await s.getTodos()).toHaveLength(1)
    expect((await s.getTodos())[0].repeat).toBe('daily')

    await s.upsertTodo({ id: t.id, title: '写周报（改）', due: 1700000000000, repeat: 'none' })
    const one = (await s.getTodos())[0]
    expect(one.title).toBe('写周报（改）')
    expect(one.due).toBe(1700000000000)
    expect(one.repeat).toBe('none')

    const done = await s.setTodoDone(t.id, true)
    expect(done?.done).toBe(true)
    expect(done?.doneAt).toBeGreaterThan(0)
    expect((await s.setTodoDone(t.id, false))?.doneAt).toBeUndefined()

    await s.deleteTodo(t.id)
    expect(await s.getTodos()).toEqual([])
    expect(await s.setTodoDone('missing', true)).toBeUndefined()
  })

  it('待办随备份导出并可合并', async () => {
    const a = mk()
    await a.upsertTodo({ title: 't1' })
    const bak = await a.exportBackup()
    expect(bak.todos).toHaveLength(1)
    const b = mk()
    await b.upsertTodo({ title: 't2' })
    await b.importBackup(bak, 'merge')
    expect((await b.getTodos()).map((t) => t.title).sort()).toEqual(['t1', 't2'])
  })

  it('保险箱密文存取与备份导入策略', async () => {
    const a = mk()
    expect(await a.getVaultBlob()).toBeNull()
    const sealed = await sealVault('pw-a', [], 1000)
    await a.setVaultBlob(sealed)
    expect((await a.getVaultBlob())?.ct).toBe(sealed.ct)

    const bak = await a.exportBackup()
    expect(bak.vault?.ct).toBe(sealed.ct)

    // merge：本机已有保险箱 → 绝不覆盖
    const b = mk()
    const mine = await sealVault('pw-b', [], 1000)
    await b.setVaultBlob(mine)
    await b.importBackup(bak, 'merge')
    expect((await b.getVaultBlob())?.ct).toBe(mine.ct)

    // merge：本机没有保险箱 → 才导入
    const c = mk()
    await c.importBackup(bak, 'merge')
    expect((await c.getVaultBlob())?.ct).toBe(sealed.ct)

    // replace：按备份覆盖
    await b.importBackup(bak, 'replace')
    expect((await b.getVaultBlob())?.ct).toBe(sealed.ct)
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
