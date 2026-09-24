/**
 * LocalBox 统一图标生成器
 * 源设计：品牌蓝 #1677FF 圆角方块 + 四宫格（白/浅蓝交错）—— 与网页端 favicon/左上角 Logo 同一款
 * 输出：Android 启动图标（自适应前景/单色/传统 PNG）、Electron ico/icns/png、各端 favicon/apple-touch/PWA
 * 用法：仓库根目录执行 npm i --no-save sharp && node scripts/gen-icons.mjs
 */
import sharp from 'sharp'
import { mkdirSync, writeFileSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BLUE = '#1677FF'
const LIGHT = '#E8F3FF'
const WHITE = '#FFFFFF'

const head = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'

/** 圆角矩形四宫格（居中，组宽 group，格子 sq，间隙 gap） */
function squares(sq, gap, rx) {
  const start = (64 - (sq * 2 + gap)) / 2
  const p = (x, y, fill) =>
    `<rect x="${x}" y="${y}" width="${sq}" height="${sq}" rx="${rx}" fill="${fill}"/>`
  return (
    p(start, start, WHITE) +
    p(start + sq + gap, start, LIGHT) +
    p(start, start + sq + gap, LIGHT) +
    p(start + sq + gap, start + sq + gap, WHITE)
  )
}

// 主设计（带 9% 透明边距，用于 favicon/hero/logo/icns）
const master = `${head}
  <rect x="6" y="6" width="52" height="52" rx="12" fill="${BLUE}"/>
  ${squares(14, 4, 3)}
</svg>`

// 满版圆角（Windows 图标 / Android 传统 PNG / Linux）
const full = `${head}
  <rect x="0" y="0" width="64" height="64" rx="14" fill="${BLUE}"/>
  ${squares(18, 4, 4)}
</svg>`

// 满版直角（Apple 触摸图标 / PWA maskable，格子缩小到 80% 安全圆内）
const square = `${head}
  <rect x="0" y="0" width="64" height="64" fill="${BLUE}"/>
  ${squares(16, 4, 3.5)}
</svg>`

// 圆形（Android 传统圆形图标）
const round = `${head}
  <circle cx="32" cy="32" r="32" fill="${BLUE}"/>
  ${squares(18, 6, 4)}
</svg>`

// 自适应图标前景 108 画布：组宽 46（四角在 66dp 安全圆内），可见区占比与 favicon 一致
const fg108 = (fillFor) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108">
  <rect x="31" y="31" width="20" height="20" rx="4.5" fill="${fillFor(0)}"/>
  <rect x="57" y="31" width="20" height="20" rx="4.5" fill="${fillFor(1)}"/>
  <rect x="31" y="57" width="20" height="20" rx="4.5" fill="${fillFor(2)}"/>
  <rect x="57" y="57" width="20" height="20" rx="4.5" fill="${fillFor(3)}"/>
</svg>`
const fgColor = fg108((i) => (i === 0 || i === 3 ? WHITE : LIGHT))
const fgMono = fg108(() => WHITE)

async function png(svg, size) {
  return sharp(Buffer.from(svg), { density: 300 }).resize(size, size).png().toBuffer()
}

function buildIco(entries) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(entries.length, 4)
  let offset = 6 + entries.length * 16
  const dirs = []
  const datas = []
  for (const e of entries) {
    const d = Buffer.alloc(16)
    d.writeUInt8(e.size >= 256 ? 0 : e.size, 0)
    d.writeUInt8(e.size >= 256 ? 0 : e.size, 1)
    d.writeUInt16LE(1, 4)
    d.writeUInt16LE(32, 6)
    d.writeUInt32LE(e.png.length, 8)
    d.writeUInt32LE(offset, 12)
    offset += e.png.length
    dirs.push(d)
    datas.push(e.png)
  }
  return Buffer.concat([header, ...dirs, ...datas])
}

function buildIcns(entries) {
  const parts = entries.map((e) => {
    const h = Buffer.alloc(8)
    h.write(e.type, 0, 4, 'ascii')
    h.writeUInt32BE(8 + e.png.length, 4)
    return Buffer.concat([h, e.png])
  })
  const body = Buffer.concat(parts)
  const headBuf = Buffer.alloc(8)
  headBuf.write('icns', 0, 4, 'ascii')
  headBuf.writeUInt32BE(8 + body.length, 4)
  return Buffer.concat([headBuf, body])
}

function put(rel, buf) {
  const p = join(REPO, rel)
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, buf)
  console.log(`  ${rel}  ${(statSync(p).size / 1024).toFixed(1)}KB`)
}

console.log('生成统一图标…')

// —— 网页源 SVG（更新为居中四宫格几何，与所有生成物完全一致）
put('web/public/favicon.svg', master)

// —— Android 自适应前景 + 单色（每个密度 108dp 等效像素）
const densities = [
  ['mdpi', 108],
  ['hdpi', 162],
  ['xhdpi', 216],
  ['xxhdpi', 324],
  ['xxxhdpi', 432],
]
for (const [d, px] of densities) {
  put(`android/app/src/main/res/drawable-${d}/ic_launcher_foreground.png`, await png(fgColor, px))
  put(`android/app/src/main/res/drawable-${d}/ic_monochrome.png`, await png(fgMono, px))
}

// —— Android 传统兜底 PNG（文件管理器/安装包图标）
const legacy = [
  ['mdpi', 48],
  ['hdpi', 72],
  ['xhdpi', 96],
  ['xxhdpi', 144],
  ['xxxhdpi', 192],
]
for (const [d, px] of legacy) {
  put(`android/app/src/main/res/mipmap-${d}/ic_launcher.png`, await png(full, px))
  put(`android/app/src/main/res/mipmap-${d}/ic_launcher_round.png`, await png(round, px))
}

// —— Electron：安装包/可执行文件图标（ico）、mac（icns）、Linux/窗口（png）
const icoSizes = [16, 32, 48, 64, 128, 256]
const icoEntries = []
for (const s of icoSizes) icoEntries.push({ size: s, png: await png(full, s) })
put('electron/build/icon.ico', buildIco(icoEntries))

const icnsSpec = [
  ['icp4', 16],
  ['icp5', 32],
  ['icp6', 64],
  ['ic11', 32],
  ['ic12', 64],
  ['ic07', 128],
  ['ic13', 256],
  ['ic08', 256],
  ['ic14', 512],
  ['ic09', 512],
  ['ic10', 1024],
]
const icnsEntries = []
for (const [type, s] of icnsSpec) icnsEntries.push({ type, png: await png(master, s) })
put('electron/build/icon.icns', buildIcns(icnsEntries))
put('electron/build/icon.png', await png(full, 512))

// —— 网页端 favicon 兜底 / 触摸图标 / PWA
const icoWeb = []
for (const s of [16, 32, 48]) icoWeb.push({ size: s, png: await png(master, s) })
put('web/public/favicon.ico', buildIco(icoWeb))
put('web/public/apple-touch-icon.png', await png(square, 180))
put('web/public/pwa-192.png', await png(square, 192))
put('web/public/pwa-512.png', await png(square, 512))

// —— 移动端 H5：favicon / 触摸图标 / 首页左上角 Logo
const icoMob = []
for (const s of [16, 32, 48]) icoMob.push({ size: s, png: await png(master, s) })
put('mobile/public/favicon.ico', buildIco(icoMob))
put('mobile/public/apple-touch-icon.png', await png(square, 180))
put('mobile/src/assets/logo.png', await png(master, 256))

// —— 回读校验 ICO/ICNS 容器
const icoBack = readFileSync(join(REPO, 'electron/build/icon.ico'))
const icoCount = icoBack.readUInt16LE(4)
const icoOk = icoBack.readUInt16LE(0) === 0 && icoBack.readUInt16LE(2) === 1 && icoCount === icoSizes.length
const icnsBack = readFileSync(join(REPO, 'electron/build/icon.icns'))
const icnsOk =
  icnsBack.toString('ascii', 0, 4) === 'icns' && icnsBack.readUInt32BE(4) === icnsBack.length
console.log(`ICO 校验: ${icoOk ? 'OK' : 'FAIL'} (${icoCount} 尺寸)  ICNS 校验: ${icnsOk ? 'OK' : 'FAIL'}`)
if (!icoOk || !icnsOk) process.exit(1)
console.log('全部图标生成完成')
