export type QueueListener = (active: number, waiting: number, done: number, failed: number) => void

/**
 * 批量任务队列：限制并发数量，防止内存溢出（TechDoc 7.3）。
 * 任务全部本地异步执行，不阻塞页面主流程（配合进度回调）。
 */
export class TaskQueue {
  private pending: Array<() => void> = []
  private active = 0
  private doneCount = 0
  private failedCount = 0
  private listener: QueueListener | null = null

  constructor(public concurrency = 2) {}

  onProgress(fn: QueueListener): void {
    this.listener = fn
  }

  private emit(): void {
    this.listener?.(this.active, this.pending.length, this.doneCount, this.failedCount)
  }

  push<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = async (): Promise<void> => {
        this.active += 1
        this.emit()
        try {
          const r = await task()
          this.doneCount += 1
          resolve(r)
        } catch (e) {
          this.failedCount += 1
          reject(e)
        } finally {
          this.active -= 1
          this.emit()
          this.pending.shift()?.()
        }
      }
      if (this.active < this.concurrency) void run()
      else this.pending.push(() => void run())
    })
  }

  async all<T>(tasks: Array<() => Promise<T>>): Promise<Array<T | Error>> {
    return Promise.all(
      tasks.map((t) =>
        this.push(t).catch((e: unknown) => (e instanceof Error ? e : new Error(String(e))))
      )
    )
  }
}
