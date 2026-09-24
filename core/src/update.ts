/**
 * 版本比较与更新源检查（三端共用，纯逻辑无框架依赖）。
 *
 * 更新源二选一：
 *  - GitHub Releases（默认）：tag 作版本号、Release body 作说明、assets 里取安装包
 *  - 自定义 version.json：{ "version", "notes", "url", "sha256" }
 *
 * 这里只负责「查到最新版本」，下载与安装能力由各端实现：
 * 安卓在应用内完成（mobile/src/utils/upgrade.ts + android/Updater.kt），
 * 桌面端打开发布页下载，网页端提示到发布页获取。
 */

/** 默认 GitHub 仓库（owner/repo） */
export const DEFAULT_UPDATE_REPO = 'SongLiKod/local-box-toolkit'

export interface UpdateAsset {
  name: string
  url: string
  /** 资产 SHA-256（hex），GitHub 未提供时为空串 */
  sha256: string
  /** 字节数，未知为 0 */
  size: number
}

export interface UpdateRelease {
  /** 不带 v 前缀的版本号 */
  version: string
  notes: string
  /** Release 页面地址（浏览器打开），自定义源可能为空串 */
  htmlUrl: string
  /** 发布时间（ISO 字符串），未知为空串 */
  publishedAt: string
  prerelease: boolean
  assets: UpdateAsset[]
}

export interface UpdateCheck {
  /** 当前版本 */
  current: string
  release: UpdateRelease
  /** 是否存在更新（latest > current） */
  hasUpdate: boolean
  /** 检查时间戳 */
  checkedAt: number
}

export interface UpdateFetchOptions {
  /** GitHub 仓库 owner/repo，默认 [DEFAULT_UPDATE_REPO] */
  repo?: string
  /** 自定义 version.json 地址（配置后覆盖 GitHub 源） */
  customUrl?: string
  /** 注入 fetch（测试用） */
  fetchImpl?: typeof fetch
}

function toParts(v: string): number[] {
  return v
    .trim()
    .replace(/^v/i, '')
    .split('.')
    .map((n) => Number.parseInt(n, 10) || 0)
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

interface GhAsset {
  name?: unknown
  browser_download_url?: unknown
  size?: unknown
  digest?: unknown
}

/** 解析 GitHub Release 数据（纯函数，便于测试） */
export function parseGitHubRelease(data: Record<string, unknown>, repo: string): UpdateRelease {
  const version = String(data.tag_name ?? '').replace(/^v/i, '')
  if (!version) throw new Error('Release 缺少版本号（tag）')
  const assets = (Array.isArray(data.assets) ? data.assets : []) as GhAsset[]
  return {
    version,
    notes: String(data.body ?? data.name ?? ''),
    htmlUrl:
      String(data.html_url ?? '') ||
      `https://github.com/${repo}/releases/tag/v${version}`,
    publishedAt: String(data.published_at ?? ''),
    prerelease: data.prerelease === true,
    assets: assets
      .map((a) => ({
        name: String(a.name ?? ''),
        url: String(a.browser_download_url ?? ''),
        sha256:
          typeof a.digest === 'string' && a.digest.startsWith('sha256:')
            ? a.digest.slice(7)
            : '',
        size: Number(a.size ?? 0) || 0,
      }))
      .filter((a) => a.name && a.url),
  }
}

/** 解析自定义 version.json（纯函数） */
export function parseCustomRelease(data: Record<string, unknown>): UpdateRelease {
  const version = String(data.version ?? '').replace(/^v/i, '')
  const url = String(data.url ?? '')
  if (!version || !url) throw new Error('version.json 缺少 version 或 url')
  return {
    version,
    notes: String(data.notes ?? ''),
    htmlUrl: String(data.htmlUrl ?? ''),
    publishedAt: String(data.publishedAt ?? ''),
    prerelease: false,
    assets: [
      {
        name: url.split('?')[0].split('/').pop() || 'LocalBox.apk',
        url,
        sha256: String(data.sha256 ?? '').trim(),
        size: 0,
      },
    ],
  }
}

async function fetchJson(
  url: string,
  notFoundMsg: string,
  fetchImpl: typeof fetch
): Promise<Record<string, unknown>> {
  const res = await fetchImpl(url, { headers: { Accept: 'application/json' } })
  if (res.status === 404) throw new Error(notFoundMsg)
  if (res.status === 403 || res.status === 429) throw new Error('接口限流，请稍后再试')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as Record<string, unknown>
}

/** 拉取最新 Release 信息（网络/数据错误抛出中文异常） */
export async function fetchLatestRelease(opts: UpdateFetchOptions = {}): Promise<UpdateRelease> {
  const fetchImpl = opts.fetchImpl ?? (fetch as typeof fetch)
  if (opts.customUrl) {
    return parseCustomRelease(await fetchJson(opts.customUrl, '升级源地址不存在（404）', fetchImpl))
  }
  const repo = opts.repo || DEFAULT_UPDATE_REPO
  const data = await fetchJson(
    `https://api.github.com/repos/${repo}/releases/latest`,
    '尚未发布任何版本',
    fetchImpl
  )
  return parseGitHubRelease(data, repo)
}

/** 检查更新：返回当前版本、最新 Release 与是否有更新 */
export async function checkUpdate(
  current: string,
  opts: UpdateFetchOptions = {}
): Promise<UpdateCheck> {
  const currentVersion = (current || '0.0.0').trim()
  const release = await fetchLatestRelease(opts)
  return {
    current: currentVersion,
    release,
    hasUpdate: compareVersion(release.version, currentVersion) > 0,
    checkedAt: Date.now(),
  }
}

/** 从 Release 资产里挑安装包：apk = 安卓正式签名包，desktop = 桌面安装包 */
export function pickAsset(release: UpdateRelease, kind: 'apk' | 'desktop'): UpdateAsset | null {
  if (kind === 'apk') {
    // debug 包与未签名包无法覆盖安装
    return release.assets.find((a) => /\.apk$/i.test(a.name) && !/debug|unsigned/i.test(a.name)) ?? null
  }
  const installers = release.assets.filter(
    (a) => /\.(exe|dmg|pkg)$/i.test(a.name) && !/blockmap|unpacked/i.test(a.name)
  )
  // Windows 打包器产出的 Setup 包优先，其次 dmg/pkg，最后任意安装包
  return (
    installers.find((a) => /setup/i.test(a.name)) ??
    installers.find((a) => /\.(dmg|pkg)$/i.test(a.name)) ??
    installers[0] ??
    null
  )
}

/** 更新说明拆成行：去空行、去 Markdown 标题符号、限长限行 */
export function releaseNotesLines(notes: string, maxLines = 40): string[] {
  if (!notes.trim()) return []
  const lines = notes
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^#{1,6}\s*/, ''))
    .filter((l) => l.length > 0 && !/^[-*_—•]{1,3}$/.test(l))
    .slice(0, maxLines)
  return lines.map((l) => (l.length > 500 ? `${l.slice(0, 500)}…` : l))
}

/** 更新说明摘要（弹窗等单行场景） */
export function releaseNotesSummary(notes: string, max = 300): string {
  const line = releaseNotesLines(notes, 1)[0] ?? ''
  return line.length > max ? `${line.slice(0, max)}…` : line
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** 发布时间 → 本地「YYYY-MM-DD HH:mm」；无效时间返回空串 */
export function formatReleaseTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`
  )
}

/** 文件大小 → 人类可读（12.3 MB） */
export function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let v = bytes
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  const num = v >= 10 || i === 0 || Number.isInteger(v) ? String(Math.round(v)) : v.toFixed(1)
  return `${num} ${units[i]}`
}
