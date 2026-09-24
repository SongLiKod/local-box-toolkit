/**
 * 版本比较与更新源检查（三端共用，纯逻辑无框架依赖）。
 *
 * 更新源二选一：
 *  - GitHub Releases（默认）：tag 作版本号、Release body 作说明、assets 里取安装包。
 *    走 `/releases` 列表接口取首个非草稿——**包含 pre-release（beta）**，
 *    因为 `/releases/latest` 只返回正式版，会漏掉 beta 发布。
 *  - 自定义 version.json：{ "version", "notes", "url", "sha256" }
 *
 * 发布 tag 只用于 Release 显示与资产命名，不强制等于根 package.json（即不等于安装版本），
 * 因此支持传入 installedRelease（本机已装过的发布版本）避免同一发布反复提醒。
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
  /** 是否需要提示更新（latest > current 且不是本机已装过的发布） */
  hasUpdate: boolean
  /** latest 与本机已装过的发布版本相同（装完后 tag 与安装版本号可能仍不相等，靠它去重） */
  alreadyInstalled: boolean
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

export interface UpdateCheckOptions extends UpdateFetchOptions {
  /** 本机已安装过的发布版本（Release tag 去 v）；与 latest 相等视为已装，不再提示 */
  installedRelease?: string
}

interface ParsedVersion {
  core: number[]
  /** pre-release 标识（`2.0.1-beta.2` → ['beta','2']）；正式版为 null */
  pre: string[] | null
}

function parseVersion(v: string): ParsedVersion {
  const s = v.trim().replace(/^v/i, '').split('+')[0]
  const dash = s.indexOf('-')
  const core = (dash >= 0 ? s.slice(0, dash) : s)
    .split('.')
    .map((n) => Number.parseInt(n, 10) || 0)
  const pre = dash >= 0 && dash < s.length - 1 ? s.slice(dash + 1).split('.') : null
  return { core, pre }
}

/**
 * 版本比较：a > b → 1，相等 → 0，a < b → -1。
 * 主版本按 `.` 分段数值比较；主版本相同时正式版 > pre-release（2.0.0 > 2.0.0-beta），
 * pre-release 按 semver 规则比较标识（数字段 < 字母段，先比完的更小）。
 */
export function compareVersion(a: string, b: string): number {
  const pa = parseVersion(a)
  const pb = parseVersion(b)
  const len = Math.max(pa.core.length, pb.core.length)
  for (let i = 0; i < len; i++) {
    const x = pa.core[i] ?? 0
    const y = pb.core[i] ?? 0
    if (x !== y) return x > y ? 1 : -1
  }
  if (pa.pre === null && pb.pre === null) return 0
  if (pa.pre === null) return 1
  if (pb.pre === null) return -1
  const m = Math.max(pa.pre.length, pb.pre.length)
  for (let i = 0; i < m; i++) {
    const sa = pa.pre[i]
    const sb = pb.pre[i]
    if (sa === undefined) return -1
    if (sb === undefined) return 1
    if (sa === sb) continue
    const na = /^\d+$/.test(sa)
    const nb = /^\d+$/.test(sb)
    if (na && nb) return Number(sa) > Number(sb) ? 1 : -1
    if (na) return -1
    if (nb) return 1
    return sa > sb ? 1 : -1
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
): Promise<unknown> {
  const res = await fetchImpl(url, { headers: { Accept: 'application/json' } })
  if (res.status === 404) throw new Error(notFoundMsg)
  if (res.status === 403 || res.status === 429) throw new Error('接口限流，请稍后再试')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

/** 拉取最新 Release 信息（网络/数据错误抛出中文异常）；GitHub 含 pre-release */
export async function fetchLatestRelease(opts: UpdateFetchOptions = {}): Promise<UpdateRelease> {
  const fetchImpl = opts.fetchImpl ?? (fetch as typeof fetch)
  if (opts.customUrl) {
    const data = await fetchJson(opts.customUrl, '升级源地址不存在（404）', fetchImpl)
    return parseCustomRelease((data ?? {}) as Record<string, unknown>)
  }
  const repo = opts.repo || DEFAULT_UPDATE_REPO
  // /releases 列表按创建时间倒序且含 pre-release；取首个非草稿 = 最新发布（beta 也能查到）
  const data = await fetchJson(
    `https://api.github.com/repos/${repo}/releases?per_page=20`,
    '尚未发布任何版本',
    fetchImpl
  )
  const list = Array.isArray(data) ? (data as Record<string, unknown>[]) : []
  const latest = list.find((r) => r && typeof r === 'object' && r.draft !== true)
  if (!latest) throw new Error('尚未发布任何版本')
  return parseGitHubRelease(latest, repo)
}

/** 检查更新：返回当前版本、最新 Release、是否需要提示更新 */
export async function checkUpdate(
  current: string,
  opts: UpdateCheckOptions = {}
): Promise<UpdateCheck> {
  const currentVersion = (current || '0.0.0').trim()
  const release = await fetchLatestRelease(opts)
  const installed = (opts.installedRelease ?? '').trim()
  // 发布 tag 不等于安装版本号（见文件头），已装过的发布靠 installedRelease 去重
  const alreadyInstalled = installed !== '' && installed === release.version
  return {
    current: currentVersion,
    release,
    hasUpdate: compareVersion(release.version, currentVersion) > 0 && !alreadyInstalled,
    alreadyInstalled,
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
