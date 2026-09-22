import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

/**
 * 本地 JSON 配置文件存储（AppData / userData 目录）。
 * Web 端对应 IndexedDB+localStorage，安卓端对应 uni storage（PRD 3.5）。
 */
const FILE = (): string => path.join(app.getPath('userData'), 'localbox-config.json')

function readAll(): Record<string, string> {
  try {
    const raw = fs.readFileSync(FILE(), 'utf-8')
    return JSON.parse(raw) as Record<string, string>
  } catch {
    return {}
  }
}

function writeAll(data: Record<string, string>): void {
  const dir = app.getPath('userData')
  fs.mkdirSync(dir, { recursive: true })
  const tmp = path.join(dir, 'localbox-config.tmp')
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8')
  fs.renameSync(tmp, FILE())
}

export function configGet(key: string): string | null {
  const all = readAll()
  const v = all[`localbox:${key}`]
  return v === '' || v === undefined ? null : v
}

export function configSet(key: string, value: string): void {
  const all = readAll()
  all[`localbox:${key}`] = value
  writeAll(all)
}
