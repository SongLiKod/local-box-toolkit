import * as XLSX from 'xlsx'
import { readAsArrayBuffer } from '../files'

export interface SheetHtml {
  sheetName: string
  html: string
}

/**
 * xlsx / xls 解析：SheetJS。xls 旧格式兼容性有限，解析失败时报错提示。
 * 输出带单元格边框的表格 HTML（PRD 3.1.2：Excel 保留单元格边框）。
 */
export async function parseWorkbook(file: File): Promise<SheetHtml[]> {
  const data = await readAsArrayBuffer(file)
  let wb: XLSX.WorkBook
  try {
    wb = XLSX.read(data, { type: 'array', cellStyles: true })
  } catch (e) {
    throw new Error(
      `无法解析 ${file.name}（旧二进制格式 xls/xl 兼容性有限，建议另存为 xlsx 后重试）：${
        e instanceof Error ? e.message : String(e)
      }`
    )
  }
  const out: SheetHtml[] = []
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name]
    if (!ws) continue
    const html = XLSX.utils.sheet_to_html(ws, { id: `sheet-${sanitize(name)}`, header: '', footer: '' })
    out.push({ sheetName: name, html: addTableBorders(html) })
  }
  return out
}

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, '_')
}

function addTableBorders(html: string): string {
  return html
    .replace(/<table>/g, '<table style="border-collapse:collapse;width:100%;font-size:12px">')
    .replace(/<td/g, '<td style="border:1px solid #999;padding:2px 6px"')
    .replace(/<th/g, '<th style="border:1px solid #999;padding:2px 6px;background:#eee"')
}

export function workbookToText(file: File): Promise<string> {
  return parseWorkbook(file).then((sheets) =>
    sheets.map((s) => `### ${s.sheetName}\n${stripTags(s.html)}`).join('\n\n')
  )
}

function stripTags(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const rows = Array.from(doc.querySelectorAll('tr'))
  return rows
    .map((tr) =>
      Array.from(tr.querySelectorAll('td,th'))
        .map((td) => (td.textContent ?? '').trim())
        .join('\t')
    )
    .join('\n')
}
