/**
 * 重复文件查找：先按体积分组缩小范围，再用内容哈希精比。
 * 哈希函数由调用方注入（复用 hashTools.hashFile），因此这里全是纯逻辑、可测（PRD 3.4）。
 */

export interface DupFileLike {
  /** 调用方自定义的唯一标识，仅用于区分与回显 */
  id: string
  name: string
  size: number
  /** 相对路径（文件夹导入时有值），仅用于回显 */
  path?: string
}

export interface DupCandidateGroup<T extends DupFileLike> {
  size: number
  items: T[]
}

export interface DupGroup<T extends DupFileLike> {
  size: number
  hash: string
  items: T[]
}

export interface DupProgress {
  done: number
  total: number
  current?: string
}

export interface DupStat {
  groups: number
  files: number
  /** 保留每组一份后可释放的字节数 */
  waste: number
}

export interface RefineOptions {
  /** 返回 true 时中止剩余比对，返回已完成的部分结果 */
  shouldStop?: () => boolean
}

/** 按体积分组：体积相同才可能重复；0 字节文件不参与；大文件优先 */
export function groupBySize<T extends DupFileLike>(files: T[]): DupCandidateGroup<T>[] {
  const map = new Map<number, T[]>()
  for (const f of files) {
    if (!f || f.size <= 0) continue
    const arr = map.get(f.size)
    if (arr) arr.push(f)
    else map.set(f.size, [f])
  }
  const out: DupCandidateGroup<T>[] = []
  for (const [size, items] of map) {
    if (items.length > 1) out.push({ size, items })
  }
  return out.sort((a, b) => b.size - a.size)
}

/** 同体积候选 → 内容哈希精比，只留真正内容一致的组 */
export async function refineGroups<T extends DupFileLike>(
  candidates: DupCandidateGroup<T>[],
  hash: (item: T) => Promise<string>,
  onProgress?: (p: DupProgress) => void,
  opts: RefineOptions = {},
): Promise<DupGroup<T>[]> {
  const total = candidates.reduce((n, c) => n + c.items.length, 0)
  let done = 0
  const out: DupGroup<T>[] = []

  for (const c of candidates) {
    if (opts.shouldStop?.()) break
    const byHash = new Map<string, T[]>()
    for (const item of c.items) {
      if (opts.shouldStop?.()) break
      onProgress?.({ done, total, current: item.name })
      let h = ''
      try {
        h = await hash(item)
      } catch {
        h = '' // 单个文件读取失败不拖垮整体，视为"无法确认重复"
      }
      done++
      if (h) {
        const arr = byHash.get(h)
        if (arr) arr.push(item)
        else byHash.set(h, [item])
      }
      onProgress?.({ done, total })
    }
    for (const [h, items] of byHash) {
      if (items.length > 1) out.push({ size: c.size, hash: h, items })
    }
  }

  // 按"保留一份后能腾出多少空间"降序：先看最值钱的
  return out.sort((a, b) => wasteOf(b) - wasteOf(a))
}

/** 该组保留一份后可释放的字节数 */
export function wasteOf<T extends DupFileLike>(g: DupGroup<T>): number {
  return g.size * (g.items.length - 1)
}

export function statDuplicates<T extends DupFileLike>(groups: DupGroup<T>[]): DupStat {
  return {
    groups: groups.length,
    files: groups.reduce((n, g) => n + g.items.length, 0),
    waste: groups.reduce((n, g) => n + g.size * (g.items.length - 1), 0),
  }
}

/** 导出清单文本：按组列出，含路径与体积 */
export function formatDupList<T extends DupFileLike>(
  groups: DupGroup<T>[],
  title = '重复文件清单',
): string {
  const stat = statDuplicates(groups)
  const lines: string[] = [
    `# ${title}`,
    `共 ${stat.groups} 组重复（${stat.files} 个文件），保留每组一份可释放 ${stat.waste} 字节`,
    '',
  ]
  groups.forEach((g, i) => {
    lines.push(`## 第 ${i + 1} 组 · ${g.size} 字节 × ${g.items.length} · sha256=${g.hash}`)
    for (const it of g.items) lines.push(`${it.path || it.name}\t${it.size}`)
    lines.push('')
  })
  return lines.join('\n')
}
