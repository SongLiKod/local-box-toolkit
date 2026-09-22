import { describe, expect, it } from 'vitest'
import { TaskQueue } from '../src/queue'

describe('批量任务队列', () => {
  it('限制并发数量', async () => {
    const q = new TaskQueue(2)
    let active = 0
    let maxActive = 0
    const tasks = Array.from({ length: 8 }, () => async (): Promise<number> => {
      active += 1
      maxActive = Math.max(maxActive, active)
      await new Promise((r) => setTimeout(r, 5))
      active -= 1
      return 1
    })
    const results = await q.all(tasks)
    expect(maxActive).toBeLessThanOrEqual(2)
    expect(results.filter((r) => r === 1)).toHaveLength(8)
  })

  it('任务失败不影响其他任务', async () => {
    const q = new TaskQueue(2)
    const results = await q.all([
      async () => 'ok',
      async () => {
        throw new Error('boom')
      },
    ])
    expect(results[0]).toBe('ok')
    expect(results[1]).toBeInstanceOf(Error)
  })

  it('push 返回结果与异常', async () => {
    const q = new TaskQueue(1)
    await expect(q.push(async () => 42)).resolves.toBe(42)
    await expect(q.push(async () => {
      throw new Error('x')
    })).rejects.toThrow('x')
  })
})
