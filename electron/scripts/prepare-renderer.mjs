import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const electronRoot = resolve(here, '..')
const webRoot = resolve(electronRoot, '..', 'web')
const webDist = join(webRoot, 'dist')
const target = join(electronRoot, 'renderer')

if (!existsSync(webDist)) {
  console.log('[prepare-renderer] 未找到 web/dist，开始构建 Web 端…')
  execSync('npm run build', { cwd: webRoot, stdio: 'inherit' })
}

if (existsSync(target)) rmSync(target, { recursive: true, force: true })
mkdirSync(target, { recursive: true })
cpSync(webDist, target, { recursive: true })
console.log('[prepare-renderer] Web 产物已复制到 electron/renderer（离线可用）')
