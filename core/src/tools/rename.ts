/** 批量文件重命名规则（PRD 3.4） */

export interface RenameOptions {
  /** 前缀 */
  prefix?: string
  /** 后缀（文件名部分，不含扩展名后） */
  suffix?: string
  /** 查找替换 */
  find?: string
  replace?: string
  useRegex?: boolean
  /** 序号起始与步长、位数 */
  numbering?: { start: number; step: number; digits: number; position: 'prefix' | 'suffix' }
  /** 大小写: none | upper | lower */
  casing?: 'none' | 'upper' | 'lower'
  /** 扩展名替换（如 jpg→png），null 保持 */
  extTo?: string | null
}

export interface RenameItem {
  from: string
  to: string
}

function extSplit(name: string): { base: string; ext: string } {
  const i = name.lastIndexOf('.')
  if (i <= 0) return { base: name, ext: '' }
  return { base: name.slice(0, i), ext: name.slice(i + 1) }
}

export function applyRename(files: string[], opts: RenameOptions): RenameItem[] {
  return files.map((from, idx) => {
    const { base, ext } = extSplit(from)
    let name = base
    if (opts.find) {
      if (opts.useRegex) {
        try {
          name = name.replace(new RegExp(opts.find, 'g'), opts.replace ?? '')
        } catch {
          /* 非法正则保持原名 */
        }
      } else {
        name = name.split(opts.find).join(opts.replace ?? '')
      }
    }
    if (opts.casing === 'upper') name = name.toUpperCase()
    else if (opts.casing === 'lower') name = name.toLowerCase()
    if (opts.prefix) name = opts.prefix + name
    if (opts.suffix) name = name + opts.suffix
    if (opts.numbering) {
      const { start, step, digits, position } = opts.numbering
      const num = String(start + idx * step).padStart(digits, '0')
      name = position === 'prefix' ? `${num}_${name}` : `${name}_${num}`
    }
    const newExt = opts.extTo ? `.${opts.extTo.replace(/^\./, '')}` : ext ? `.${ext}` : ''
    return { from, to: `${name}${newExt}` }
  })
}

/** 生成重命名脚本（Windows .bat / *nix .sh），便于本地批量执行 */
export function buildRenameScript(items: RenameItem[], os: 'win' | 'nix'): string {
  const lines = items
    .filter((i) => i.from !== i.to)
    .map((i) =>
      os === 'win'
        ? `ren "${i.from.replace(/"/g, '')}" "${i.to.replace(/"/g, '')}"`
        : `mv -- "${i.from.replace(/"/g, '\\"')}" "${i.to.replace(/"/g, '\\"')}"`
    )
  return os === 'win' ? ['@echo off', ...lines].join('\r\n') : ['#!/bin/sh', ...lines].join('\n')
}
