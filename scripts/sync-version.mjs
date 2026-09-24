/**
 * 版本号唯一来源 = 仓库根 package.json 的 version。
 * 本脚本把它同步到所有"版本落点"：
 *   web / mobile / electron 的 package.json 与 package-lock.json（保持与 lock 成对，npm ci 不会失配）
 *   mobile/src/manifest.json（uni app-plus 的 versionName/versionCode，versionCode 与
 *   android/app/build.gradle 同公式：主*10000 + 次*100 + 修订）
 * 构建时自动执行（web prebuild、mobile prebuild:h5、electron dist），也可手动：npm run version:sync
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const rootPkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const version = rootPkg.version
if (!version) {
  console.error('[sync-version] 根 package.json 缺少 version 字段')
  process.exit(1)
}

// 与 android/app/build.gradle 保持同一公式
const nums = version.split('.').map((s) => parseInt(s.replace(/[^0-9]/g, ''), 10) || 0)
while (nums.length < 3) nums.push(0)
const versionCode = nums[0] * 10000 + nums[1] * 100 + nums[2]

/** 按原文件换行符写回；内容无变化则不落盘，避免整文件 diff */
function sync(rel, apply) {
  const file = join(root, rel)
  const before = readFileSync(file, 'utf8')
  const data = JSON.parse(before)
  if (!apply(data)) {
    console.log(`[sync-version] ${rel} 已是 ${version}`)
    return
  }
  const eol = before.includes('\r\n') ? '\r\n' : '\n'
  writeFileSync(file, JSON.stringify(data, null, 2).replace(/\n/g, eol) + eol)
  console.log(`[sync-version] ${rel} -> v${version}`)
}

function setPkg(d) {
  if (d.version === version) return false
  d.version = version
  return true
}

function setLock(d) {
  let changed = false
  if (d.version !== version) {
    d.version = version
    changed = true
  }
  if (d.packages && d.packages[''] && d.packages[''].version !== version) {
    d.packages[''].version = version
    changed = true
  }
  return changed
}

function setManifest(d) {
  let changed = false
  if (d.versionName !== version) {
    d.versionName = version
    changed = true
  }
  if (d.versionCode !== String(versionCode)) {
    d.versionCode = String(versionCode)
    changed = true
  }
  return changed
}

sync('web/package.json', setPkg)
sync('web/package-lock.json', setLock)
sync('mobile/package.json', setPkg)
sync('mobile/package-lock.json', setLock)
sync('electron/package.json', setPkg)
sync('electron/package-lock.json', setLock)
sync('mobile/src/manifest.json', setManifest)

console.log(`[sync-version] 完成：v${version}（versionCode ${versionCode}）`)
