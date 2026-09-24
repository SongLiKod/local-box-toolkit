/**
 * 应用内自升级（仅安卓 WebView 壳内具备安装能力；浏览器预览只可检查）
 *
 * 升级源二选一（源解析、版本比较复用 core/src/update.ts，见下方常量）：
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
import { updateTools } from '@localbox/core/index'

// 自定义升级源；留空 = 使用 GitHub Releases（源解析与版本比较统一在 core/update）
export const CUSTOM_VERSION_URL = ''
// GitHub 仓库（owner/repo，需公开可匿名访问）
export const GITHUB_REPO = updateTools.DEFAULT_UPDATE_REPO

/** 构建时内联的版本号（唯一来源 = 仓库根 package.json）；安卓壳内以原生 versionName 为准 */
export const APP_VERSION: string = rootPkg.version

export interface UpgradeInfo {
  version: string
  notes: string
  /** APK 直链（安装用） */
  url: string
  sha256: string
  /** Release 页面地址（浏览器打开），自定义源可能为空串 */
  htmlUrl: string
  /** 发布时间（ISO），未知为空串 */
  publishedAt: string
}

export interface UpgradeResult {
  outcome: 'success' | 'canceled' | 'failed' | 'unsupported'
  message: string
}

interface UpgradeBridge {
  getVersion(): string
  canInstall(): boolean
  startUpdate(url: string, sha256: string): void
  /** 用系统浏览器打开外部地址（发布页等） */
  openUrl?(url: string): void
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

/** 版本比较（委托 core/update，保留导出兼容旧引用） */
export const compareVersion = updateTools.compareVersion

function toUpgradeInfo(release: updateTools.UpdateRelease): UpgradeInfo {
  // 只取正式签名包：debug 包与未签名包无法覆盖安装
  const apk = updateTools.pickAsset(release, 'apk')
  if (!apk) throw new Error('Release 中没有可安装的正式 APK')
  return {
    version: release.version,
    notes: release.notes,
    url: apk.url,
    sha256: apk.sha256,
    htmlUrl: release.htmlUrl,
    publishedAt: release.publishedAt,
  }
}

/** 检查更新：有新版本返回信息，已是最新返回 null，网络/数据源错误抛异常 */
export async function checkForUpdate(current?: string): Promise<UpgradeInfo | null> {
  const cur = current || currentVersion() || '0.0.0'
  const res = await updateTools.checkUpdate(cur, {
    repo: GITHUB_REPO,
    ...(CUSTOM_VERSION_URL ? { customUrl: CUSTOM_VERSION_URL } : {}),
    // 发布 tag 不等于包内版本号：装过这一版就不再提醒
    installedRelease: String(uni.getStorageSync(INSTALLED_KEY) || ''),
  })
  if (!res.hasUpdate) return null
  return toUpgradeInfo(res.release)
}

/**
 * 用系统浏览器打开外部地址（Release 页面等）。
 * 安卓壳走原生 openUrl；网页预览直接 window.open。
 */
export function openExternalUrl(url: string): void {
  if (!/^https?:\/\//i.test(url)) return
  const b = bridge()
  if (b?.openUrl) {
    b.openUrl(url)
    return
  }
  if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener')
}

// 是否有升级流程进行中（防止启动提醒与设置页并发触发）
let running = false

/** 本机已安装过的发布版本（Release tag 去 v）：tag 与包内 versionName 解耦后靠它去重 */
const INSTALLED_KEY = 'localbox:upgrade-installed'

/**
 * 执行升级（仅安卓壳内；浏览器返回 unsupported）。终态 resolve、不抛异常。
 * 首次会先弹授权说明 → 系统设置授权返回后原生自动继续；
 * 下载进度经 showLoading 展示，[onStatus] 回传文字、[onProgress] 回传百分比
 * （设置页据此渲染内联进度条）。
 */
export function runUpgrade(
  info: UpgradeInfo,
  onStatus?: (text: string) => void,
  onProgress?: (percent: number) => void
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
      // 安装成功即记下这一版：包内 versionName 不随 tag 变，避免下次检查又提示同一版
      if (outcome === 'success') {
        try {
          uni.setStorageSync(INSTALLED_KEY, info.version)
        } catch {
          /* 存储失败不影响升级结果 */
        }
      }
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
          onProgress?.(pct)
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
