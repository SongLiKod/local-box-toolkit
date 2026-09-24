/**
 * 应用内自升级（仅安卓 WebView 壳内具备安装能力；浏览器预览只可检查）
 *
 * 升级源二选一（见下方常量）：
 *  - 默认 GitHub Releases：tag 作版本号、Release body 作说明、
 *    取 `.apk` 正式资产（排除 debug / unsigned），匿名可访问、CI 自动上传
 *  - 自定义 version.json（支持 CORS 的 HTTPS）：
 *    { "version": "1.2.0", "notes": "…", "url": "https://…/LocalBox.apk", "sha256": "hex" }
 *
 * 安装由原生完成（android/Updater.kt）：首次授权「安装未知应用」→ 静默下载（可选 SHA-256
 * 校验）→ PackageInstaller 提交 → 系统安装确认覆盖在应用上方，点「更新」即完成，不离开应用。
 * 原生事件经 window.__localboxUpdateEvent({ event, data }) 推送：
 *   need-permission | progress(0-100) | staged | success | error
 */

import rootPkg from '../../../package.json'

// 自定义升级源；留空 = 使用 GitHub Releases
export const CUSTOM_VERSION_URL = ''
// GitHub 仓库（owner/repo，需公开可匿名访问）
export const GITHUB_REPO = 'SongLiKod/local-box-toolkit'

/** 构建时内联的版本号（唯一来源 = 仓库根 package.json）；安卓壳内以原生 versionName 为准 */
export const APP_VERSION: string = rootPkg.version

export interface UpgradeInfo {
  version: string
  notes: string
  url: string
  sha256: string
}

export interface UpgradeResult {
  outcome: 'success' | 'canceled' | 'failed' | 'unsupported'
  message: string
}

interface UpgradeBridge {
  getVersion(): string
  canInstall(): boolean
  startUpdate(url: string, sha256: string): void
}

declare global {
  interface Window {
    __localboxUpdateEvent?: (evt: { event: string; data?: unknown }) => void
  }
}

function bridge(): UpgradeBridge | null {
  if (typeof window === 'undefined') return null
  const b = (window as unknown as { AndroidBridge?: UpgradeBridge }).AndroidBridge
  return b && typeof b.startUpdate === 'function' ? b : null
}

/** 当前安装版本（versionName）；非安卓壳返回空串 */
export function currentVersion(): string {
  try {
    return bridge()?.getVersion() ?? ''
  } catch {
    return ''
  }
}

function toParts(v: string): number[] {
  return v.trim().replace(/^v/i, '').split('.').map((n) => Number.parseInt(n, 10) || 0)
}

/** 版本比较：a > b → 1，相等 → 0，a < b → -1（按 . 分段数值比较） */
export function compareVersion(a: string, b: string): number {
  const pa = toParts(a)
  const pb = toParts(b)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0
    const y = pb[i] ?? 0
    if (x !== y) return x > y ? 1 : -1
  }
  return 0
}

async function fetchJson(url: string, notFoundMsg: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (res.status === 404) throw new Error(notFoundMsg)
  if (res.status === 403 || res.status === 429) throw new Error('接口限流，请稍后再试')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as Record<string, unknown>
}

interface GhAsset {
  name: string
  browser_download_url: string
  digest?: string | null
}

async function fetchGitHubLatest(): Promise<UpgradeInfo> {
  const data = await fetchJson(
    `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
    '尚未发布任何版本'
  )
  const version = String(data.tag_name ?? '').replace(/^v/i, '')
  if (!version) throw new Error('Release 缺少版本号（tag）')
  const assets = (Array.isArray(data.assets) ? data.assets : []) as GhAsset[]
  // 只取正式签名包：debug 包与未签名包无法覆盖安装
  const apk = assets.find((a) => a.name.endsWith('.apk') && !/debug|unsigned/i.test(a.name))
  if (!apk) throw new Error('Release 中没有可安装的正式 APK')
  const digest =
    typeof apk.digest === 'string' && apk.digest.startsWith('sha256:') ? apk.digest.slice(7) : ''
  return {
    version,
    notes: String(data.body ?? data.name ?? ''),
    url: apk.browser_download_url,
    sha256: digest,
  }
}

async function fetchCustomLatest(): Promise<UpgradeInfo> {
  const data = await fetchJson(CUSTOM_VERSION_URL, '升级源地址不存在（404）')
  const version = String(data.version ?? '').replace(/^v/i, '')
  const url = String(data.url ?? '')
  if (!version || !url) throw new Error('version.json 缺少 version 或 url')
  return {
    version,
    notes: String(data.notes ?? ''),
    url,
    sha256: String(data.sha256 ?? '').trim(),
  }
}

/** 检查更新：有新版本返回信息，已是最新返回 null，网络/数据源错误抛异常 */
export async function checkForUpdate(current?: string): Promise<UpgradeInfo | null> {
  const cur = current || currentVersion() || '0.0.0'
  const info = CUSTOM_VERSION_URL ? await fetchCustomLatest() : await fetchGitHubLatest()
  return compareVersion(info.version, cur) > 0 ? info : null
}

// 是否有升级流程进行中（防止启动提醒与设置页并发触发）
let running = false

/**
 * 执行升级（仅安卓壳内；浏览器返回 unsupported）。终态 resolve、不抛异常。
 * 首次会先弹授权说明 → 系统设置授权返回后原生自动继续；
 * 下载进度经 showLoading 展示，[onStatus] 同步回传文字（设置页可内联展示）。
 */
export function runUpgrade(
  info: UpgradeInfo,
  onStatus?: (text: string) => void
): Promise<UpgradeResult> {
  return new Promise((resolve) => {
    const b = bridge()
    if (!b) {
      const msg = '请在安卓 App 内完成升级'
      onStatus?.(msg)
      resolve({ outcome: 'unsupported', message: msg })
      return
    }
    if (running) {
      resolve({ outcome: 'failed', message: '正在升级中，请稍候' })
      return
    }
    running = true

    let settled = false
    const settle = (outcome: UpgradeResult['outcome'], message: string) => {
      if (settled) return
      settled = true
      running = false
      window.__localboxUpdateEvent = undefined
      uni.hideLoading()
      onStatus?.(message)
      resolve({ outcome, message })
    }

    window.__localboxUpdateEvent = (evt) => {
      switch (evt.event) {
        case 'need-permission':
          uni.showLoading({ title: '等待系统授权…', mask: true })
          onStatus?.('等待授权：允许安装未知应用后返回，自动继续')
          break
        case 'progress': {
          const pct = Math.min(100, Math.max(0, Number(evt.data ?? 0)))
          uni.showLoading({ title: `下载中 ${pct}%`, mask: true })
          onStatus?.(`下载中 ${pct}%`)
          break
        }
        case 'staged':
          uni.hideLoading()
          onStatus?.('已唤起系统安装确认，请点击「更新」')
          uni.showToast({ title: '请在系统弹窗中点击「更新」', icon: 'none' })
          break
        case 'success':
          settle('success', '升级完成，应用将自动重启')
          break
        case 'error':
        default: {
          const msg = String(evt.data ?? '升级失败')
          settle(/取消/.test(msg) ? 'canceled' : 'failed', msg)
          break
        }
      }
    }

    const begin = () => {
      uni.showLoading({ title: '准备升级…', mask: true })
      onStatus?.('准备下载…')
      b.startUpdate(info.url, info.sha256)
    }

    if (b.canInstall()) {
      begin()
      return
    }
    uni.showModal({
      title: '首次升级需授权',
      content:
        '升级前需允许本应用「安装未知应用」（仅此一次）。在系统设置中开启后返回，将自动继续升级。',
      confirmText: '去授权',
      cancelText: '取消',
      success: (r) => {
        if (r.confirm) begin()
        else settle('canceled', '已取消升级')
      },
      fail: () => settle('failed', '无法发起升级'),
    })
  })
}

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000
const CHECK_AT_KEY = 'localbox:upgrade-last-check'
const DISMISSED_KEY = 'localbox:upgrade-dismissed'

/**
 * 启动时静默检查（仅安卓壳内）：6 小时节流、网络失败静默、
 * 同一版本点过「暂不」后不再打扰；确认升级直接走 [runUpgrade]。
 */
export async function autoCheckUpgrade(): Promise<void> {
  try {
    if (!bridge()) return
    const last = Number(uni.getStorageSync(CHECK_AT_KEY) || 0)
    if (Date.now() - last < CHECK_INTERVAL_MS) return
    uni.setStorageSync(CHECK_AT_KEY, String(Date.now()))
    const info = await checkForUpdate()
    if (!info) return
    if (String(uni.getStorageSync(DISMISSED_KEY) || '') === info.version) return
    uni.showModal({
      title: `发现新版本 v${info.version}`,
      content: (info.notes || '修复与体验优化').slice(0, 300),
      confirmText: '立即升级',
      cancelText: '暂不',
      success: (r) => {
        if (r.confirm) {
          void runUpgrade(info).then((res) => {
            if (res.outcome === 'failed' || res.outcome === 'unsupported') {
              uni.showToast({ title: res.message, icon: 'none' })
            }
          })
        } else {
          uni.setStorageSync(DISMISSED_KEY, info.version)
        }
      },
    })
  } catch {
    /* 启动静默检查失败不打扰用户 */
  }
}
