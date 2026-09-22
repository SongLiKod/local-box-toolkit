export type DiffKind = 'eq' | 'add' | 'del'

export interface DiffLine {
  kind: DiffKind
  text: string
  leftNo?: number
  rightNo?: number
}

function lcsMatrix(a: string[], b: string[]): number[][] {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  return dp
}

export function diffLines(left: string, right: string): DiffLine[] {
  const a = left.split(/\r\n|\r|\n/)
  const b = right.split(/\r\n|\r|\n/)
  if (a.length === 1 && a[0] === '' && b.length === 1 && b[0] === '') return []
  const dp = lcsMatrix(a, b)
  const out: DiffLine[] = []
  let i = 0
  let j = 0
  let ln = 1
  let rn = 1
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ kind: 'eq', text: a[i], leftNo: ln++, rightNo: rn++ })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ kind: 'del', text: a[i], leftNo: ln++ })
      i++
    } else {
      out.push({ kind: 'add', text: b[j], rightNo: rn++ })
      j++
    }
  }
  while (i < a.length) out.push({ kind: 'del', text: a[i++], leftNo: ln++ })
  while (j < b.length) out.push({ kind: 'add', text: b[j++], rightNo: rn++ })
  return out
}

export function diffStats(lines: DiffLine[]): { added: number; removed: number; same: number } {
  let added = 0
  let removed = 0
  let same = 0
  for (const l of lines) {
    if (l.kind === 'add') added += 1
    else if (l.kind === 'del') removed += 1
    else same += 1
  }
  return { added, removed, same }
}
