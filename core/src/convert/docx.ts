import mammoth from 'mammoth'
import { extOf, readAsArrayBuffer, readAsText } from '../files'

export interface DocxParseResult {
  html: string
  text: string
}

/**
 * docx 解析：mammoth 转 HTML / 纯文本。
 * doc（旧二进制）兼容性有限：尝试按文本抽取，失败给出提示（PRD 3.1.1 备注）。
 */
export async function parseDocx(file: File): Promise<DocxParseResult> {
  const ext = extOf(file.name)
  if (ext === 'doc') {
    const text = await legacyDocToText(file)
    return {
      html: `<pre class="legacy-doc">${escapeHtml(text)}</pre>`,
      text,
    }
  }
  const arrayBuffer = await readAsArrayBuffer(file)
  const [htmlRes, textRes] = await Promise.all([
    mammoth.convertToHtml({ arrayBuffer }),
    mammoth.extractRawText({ arrayBuffer }),
  ])
  return { html: htmlRes.value, text: textRes.value }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function legacyDocToText(file: File): Promise<string> {
  // 旧版 .doc 为二进制复合文档，浏览器本地仅能尽力抽取可见文本
  const buf = new Uint8Array(await readAsArrayBuffer(file))
  const chunks: string[] = []
  let cur: number[] = []
  for (const b of buf) {
    if (b >= 32 && b < 127) cur.push(b)
    else if (b === 10 || b === 13) {
      if (cur.length >= 4) chunks.push(String.fromCharCode(...cur))
      cur = []
    } else if (cur.length >= 8) {
      chunks.push(String.fromCharCode(...cur))
      cur = []
    } else cur = []
  }
  if (cur.length >= 4) chunks.push(String.fromCharCode(...cur))
  return chunks.join('\n')
}

export async function txtToText(file: File): Promise<string> {
  return readAsText(file)
}
