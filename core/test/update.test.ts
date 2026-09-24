import { describe, expect, it } from 'vitest'
import {
  checkUpdate,
  compareVersion,
  fetchLatestRelease,
  formatReleaseTime,
  formatSize,
  parseCustomRelease,
  parseGitHubRelease,
  pickAsset,
  releaseNotesLines,
  releaseNotesSummary,
} from '../src/update'

const ghRelease = {
  tag_name: 'v2.1.0',
  name: 'v2.1.0',
  body: '## 亮点\n\n- 修复\n- \n# 标题行',
  html_url: 'https://github.com/SongLiKod/local-box-toolkit/releases/tag/v2.1.0',
  published_at: '2026-09-20T08:30:00Z',
  prerelease: false,
  assets: [
    { name: 'LocalBox-2.1.0-debug.apk', browser_download_url: 'https://x/debug.apk', size: 10 },
    { name: 'LocalBox-2.1.0.apk', browser_download_url: 'https://x/app.apk', size: 5_000_000, digest: 'sha256:abc123' },
    { name: 'LocalBox Setup-2.1.0.exe', browser_download_url: 'https://x/setup.exe', size: 9_000_000 },
    { name: 'LocalBox Setup-2.1.0.exe.blockmap', browser_download_url: 'https://x/bm', size: 1 },
  ],
}

describe('版本比较', () => {
  it('按分段数值比较', () => {
    expect(compareVersion('2.1.0', '2.0.9')).toBe(1)
    expect(compareVersion('v1.0.0', '1.0.0')).toBe(0)
    expect(compareVersion('1.0.0', '1.0.1')).toBe(-1)
    expect(compareVersion('1.10', '1.9')).toBe(1)
    expect(compareVersion('2', '1.9.9')).toBe(1)
    expect(compareVersion('1.0', '1.0.0')).toBe(0)
  })
})

describe('Release 解析', () => {
  it('GitHub Release', () => {
    const r = parseGitHubRelease(ghRelease, 'SongLiKod/local-box-toolkit')
    expect(r.version).toBe('2.1.0')
    expect(r.htmlUrl).toContain('/releases/tag/v2.1.0')
    expect(r.publishedAt).toBe('2026-09-20T08:30:00Z')
    expect(r.assets).toHaveLength(4)
    expect(r.assets[1].sha256).toBe('abc123')
    expect(r.prerelease).toBe(false)
  })

  it('GitHub 缺少 tag 报错', () => {
    expect(() => parseGitHubRelease({ tag_name: '' }, 'a/b')).toThrow('缺少版本号')
  })

  it('html_url 缺失时按仓库拼出发布页', () => {
    const r = parseGitHubRelease({ tag_name: 'v1.2.3', assets: [] }, 'owner/repo')
    expect(r.htmlUrl).toBe('https://github.com/owner/repo/releases/tag/v1.2.3')
    expect(r.assets).toEqual([])
  })

  it('自定义 version.json', () => {
    const r = parseCustomRelease({
      version: '3.0.0',
      notes: '内部源',
      url: 'https://cdn.example.com/LocalBox.apk?sig=1',
      sha256: ' deadbeef ',
    })
    expect(r.version).toBe('3.0.0')
    expect(r.assets[0].name).toBe('LocalBox.apk')
    expect(r.assets[0].sha256).toBe('deadbeef')
    expect(r.htmlUrl).toBe('')
    expect(() => parseCustomRelease({ version: '1.0.0' })).toThrow('version 或 url')
  })
})

describe('检查更新', () => {
  it('注入 fetch 解析 GitHub 最新版并判断是否有更新', async () => {
    const fetchImpl = (async () =>
      ({
        status: 200,
        ok: true,
        json: async () => ghRelease,
      }) as unknown as Response) as typeof fetch
    const res = await checkUpdate('2.0.0', { fetchImpl })
    expect(res.hasUpdate).toBe(true)
    expect(res.release.version).toBe('2.1.0')
    expect(res.current).toBe('2.0.0')
    expect(res.checkedAt).toBeGreaterThan(0)

    const same = await checkUpdate('2.1.0', { fetchImpl })
    expect(same.hasUpdate).toBe(false)
  })

  it('错误状态映射为中文提示', async () => {
    const withStatus = (status: number): typeof fetch =>
      (async () =>
        ({ status, ok: status < 400, json: async () => ({}) }) as unknown as Response) as typeof fetch
    await expect(fetchLatestRelease({ fetchImpl: withStatus(404) })).rejects.toThrow('尚未发布任何版本')
    await expect(fetchLatestRelease({ fetchImpl: withStatus(429) })).rejects.toThrow('限流')
    await expect(fetchLatestRelease({ fetchImpl: withStatus(500) })).rejects.toThrow('HTTP 500')
    await expect(
      fetchLatestRelease({ customUrl: 'https://x/v.json', fetchImpl: withStatus(404) })
    ).rejects.toThrow('升级源地址不存在')
  })

  it('自定义升级源覆盖 GitHub', async () => {
    const fetchImpl = (async () =>
      ({
        status: 200,
        ok: true,
        json: async () => ({ version: '9.9.9', notes: 'n', url: 'https://x/a.apk' }),
      }) as unknown as Response) as typeof fetch
    const r = await fetchLatestRelease({ customUrl: 'https://x/v.json', repo: 'a/b', fetchImpl })
    expect(r.version).toBe('9.9.9')
  })
})

describe('安装包挑选与展示', () => {
  const release = parseGitHubRelease(ghRelease, 'a/b')

  it('安卓取正式签名 APK（排除 debug/unsigned）', () => {
    expect(pickAsset(release, 'apk')?.name).toBe('LocalBox-2.1.0.apk')
  })

  it('桌面取 Setup 安装包并排除 blockmap', () => {
    expect(pickAsset(release, 'desktop')?.name).toBe('LocalBox Setup-2.1.0.exe')
  })

  it('无匹配资产返回 null', () => {
    expect(pickAsset({ ...release, assets: [] }, 'apk')).toBeNull()
  })

  it('更新说明拆行并去掉标题符号与空行', () => {
    expect(releaseNotesLines(release.notes)).toEqual(['亮点', '- 修复', '标题行'])
    expect(releaseNotesSummary(release.notes)).toBe('亮点')
    expect(releaseNotesLines('')).toEqual([])
    expect(releaseNotesLines('a\nb\nc', 2)).toEqual(['a', 'b'])
    expect(releaseNotesSummary('x'.repeat(400), 10)).toHaveLength(11)
  })

  it('发布时间与体积格式化', () => {
    const iso = '2026-09-20T08:30:00Z'
    expect(formatReleaseTime(iso)).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
    expect(formatReleaseTime('')).toBe('')
    expect(formatReleaseTime('not-a-date')).toBe('')
    expect(formatSize(0)).toBe('')
    expect(formatSize(1024)).toBe('1 KB')
    expect(formatSize(5_000_000)).toBe('4.8 MB')
    expect(formatSize(512)).toBe('512 B')
  })
})
