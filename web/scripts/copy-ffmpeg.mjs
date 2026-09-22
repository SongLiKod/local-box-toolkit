import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dest = join(root, 'public', 'ffmpeg')
mkdirSync(dest, { recursive: true })

const nm = join(root, 'node_modules')
const coreDir = join(nm, '@ffmpeg', 'core', 'dist', 'umd')
const ffDir = join(nm, '@ffmpeg', 'ffmpeg', 'dist', 'umd')

const copied = []
if (existsSync(coreDir)) {
  for (const f of ['ffmpeg-core.js', 'ffmpeg-core.wasm']) {
    const src = join(coreDir, f)
    if (existsSync(src)) {
      cpSync(src, join(dest, f))
      copied.push(f)
    }
  }
} else {
  console.warn('[copy-ffmpeg] @ffmpeg/core dist/umd 不存在，音视频转换需先安装依赖')
}

// ffmpeg worker 分块（文件名带哈希，自动匹配 *.ffmpeg.js）
if (existsSync(ffDir)) {
  const worker = readdirSync(ffDir).find((f) => /\.ffmpeg\.js$/.test(f))
  if (worker) {
    cpSync(join(ffDir, worker), join(dest, 'ffmpeg-worker.js'))
    copied.push('ffmpeg-worker.js')
  }
}

console.log(`[copy-ffmpeg] public/ffmpeg <- ${copied.join(', ') || '(nothing)'}`)
