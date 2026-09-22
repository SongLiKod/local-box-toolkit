/** 文本去空格/去换行、字数统计（PRD 3.4） */

export function trimTrailingSpaces(text: string): string {
  return text
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/g, ''))
    .join('\n')
}

export function removeAllSpaces(text: string, includeNewline = false): string {
  return includeNewline ? text.replace(/\s+/g, '') : text.replace(/[ \t\u3000]+/g, '')
}

export function removeEmptyLines(text: string): string {
  return text
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .join('\n')
}

export function joinLines(text: string, separator = ''): string {
  return text.replace(/\r\n|\r|\n/g, separator)
}

export function trimEachLine(text: string): string {
  return text
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
}

export function dedupeSpaces(text: string): string {
  return text.replace(/[ \t]{2,}/g, ' ')
}

export interface TextStats {
  chars: number
  charsNoSpace: number
  words: number
  lines: number
  cjkChars: number
  /** 中文按字、英文按词混合计数 */
  cnWords: number
}

export function countText(text: string): TextStats {
  const chars = [...text].length
  const charsNoSpace = [...text.replace(/\s/g, '')].length
  const enWords = (text.match(/[A-Za-z0-9_'’-]+/g) ?? []).length
  const cjkChars = (text.match(/[\u3400-\u4dbf\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) ?? []).length
  const lines = text.length === 0 ? 0 : text.split(/\r\n|\r|\n/).length
  return {
    chars,
    charsNoSpace,
    words: enWords + cjkChars,
    lines,
    cjkChars,
    cnWords: enWords + cjkChars,
  }
}
