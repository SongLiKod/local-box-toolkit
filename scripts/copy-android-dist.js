// 将 mobile H5 构建产物复制进 Android WebView 壳的 assets/dist
// 前置条件：npm --prefix mobile run build:h5（输出 mobile/dist/build/h5）
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const dist = path.join(root, 'mobile', 'dist', 'build', 'h5')
const assetsDist = path.join(root, 'android', 'app', 'src', 'main', 'assets', 'dist')

function copyDir(src, dest) {
  fs.rmSync(dest, { recursive: true, force: true })
  fs.mkdirSync(dest, { recursive: true })
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name)
    const d = path.join(dest, name)
    if (fs.statSync(s).isDirectory()) copyDir(s, d)
    else fs.copyFileSync(s, d)
  }
}

if (!fs.existsSync(dist)) {
  console.error('mobile/dist/build/h5 不存在，请先执行 npm --prefix mobile run build:h5')
  process.exit(1)
}
copyDir(dist, assetsDist)
console.log(`已复制 ${dist} -> ${assetsDist}`)
