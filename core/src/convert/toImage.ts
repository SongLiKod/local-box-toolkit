import { baseName, canvasToBlob, readAsArrayBuffer } from '../files'
import { openPdf, renderPdfPageToCanvas } from './pdf'
import { parseDocx } from './docx'
import { parseWorkbook } from './xlsx'
import { parsePptx } from './pptx'
import {
  docxToPageCanvases,
  htmlToPageCanvases,
  mergeCanvasesVertical,
  textToPageCanvases,
  toGrayscale,
} from './render'
import { encodeTiff } from './tiff'
import type { ConvertedFile, ProgressCb } from '../types'

export type ImageFormat = 'jpg' | 'png' | 'webp' | 'tiff'
export type ExportMode = 'pages' | 'long'
export type ColorMode = 'color' | 'gray'

export interface ToImageOptions {
  dpi: 72 | 150 | 300
  color: ColorMode
  format: ImageFormat
  mode: ExportMode
  quality: number // 0~100
  startPage?: number
  endPage?: number
  onProgress?: ProgressCb
}

export const TO_IMAGE_ACCEPT = '.docx,.xlsx,.xls,.pptx,.pdf'

/** 获取文档总页数（用于 >50 页内存风险提示，PRD 3.1.2） */
export async function getPageCount(file: File): Promise<number | null> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') {
    const { numPages, doc } = await openPdf(file)
    await doc.destroy()
    return numPages
  }
  if (ext === 'pptx') {
    const parsed = await parsePptx(file)
    return parsed.slideCount
  }
  if (ext === 'txt') return null
  return null // docx/xlsx 本地无法精确预知页数，按文件大小估计
}

/** 转换前预览页面缩略图 */
export async function previewThumbnails(file: File, maxPages = 20): Promise<string[]> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const urls: string[] = []
  if (ext === 'pdf') {
    const { doc, numPages } = await openPdf(file)
    try {
      for (let p = 1; p <= Math.min(numPages, maxPages); p++) {
        const canvas = await renderPdfPageToCanvas(doc, p, 24, false)
        urls.push(canvas.toDataURL('image/jpeg', 0.7))
        canvas.width = 0
        canvas.height = 0
      }
    } finally {
      await doc.destroy()
    }
    return urls
  }
  if (ext === 'pptx') {
    const parsed = await parsePptx(file)
    const canvases = await parsed.render(72)
    for (const c of canvases.slice(0, maxPages)) {
      urls.push(c.toDataURL('image/jpeg', 0.7))
      c.width = 0
      c.height = 0
    }
    return urls
  }
  const pages = await documentToCanvases(file, 72, false)
  for (const c of pages.slice(0, maxPages)) {
    urls.push(c.toDataURL('image/jpeg', 0.7))
    c.width = 0
    c.height = 0
  }
  return urls
}

/** Word/Excel/PPT/TXT → 页面 Canvas（Wasm/JS 本地渲染至 Canvas，TechDoc 4.1.2） */
export async function documentToCanvases(
  file: File,
  dpi: number,
  grayscale: boolean
): Promise<HTMLCanvasElement[]> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'docx') {
    try {
      const buffer = await readAsArrayBuffer(file)
      return await docxToPageCanvases(buffer, { dpi, grayscale })
    } catch {
      const { html } = await parseDocx(file)
      return htmlToPageCanvases(html, { dpi, grayscale })
    }
  }
  if (ext === 'doc') {
    const { html } = await parseDocx(file)
    return htmlToPageCanvases(html, { dpi, grayscale })
  }
  if (ext === 'xlsx' || ext === 'xls') {
    const sheets = await parseWorkbook(file)
    const pages: HTMLCanvasElement[] = []
    for (const s of sheets) {
      const part = `<h3 style="font-size:16px;margin:8px 0">${s.sheetName}</h3>${s.html}`
      pages.push(...(await htmlToPageCanvases(part, { dpi, grayscale })))
    }
    return pages
  }
  if (ext === 'pptx') {
    const parsed = await parsePptx(file)
    const canvases = await parsed.render(dpi)
    return grayscale ? canvases.map(toGrayscale) : canvases
  }
  if (ext === 'txt') {
    const text = await file.text()
    return textToPageCanvases(text, { dpi, grayscale })
  }
  throw new Error(`不支持转图片的文件格式: .${ext}`)
}

async function canvasToFormat(
  canvas: HTMLCanvasElement,
  format: ImageFormat,
  quality: number,
  grayscale: boolean
): Promise<Blob> {
  if (grayscale) toGrayscale(canvas)
  const q = Math.min(1, Math.max(0, quality / 100))
  if (format === 'tiff') {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('无法读取Canvas像素')
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
    return encodeTiff(data, 300, false)
  }
  const mime =
    format === 'jpg' ? 'image/jpeg' : format === 'png' ? 'image/png' : 'image/webp'
  return canvasToBlob(canvas, mime, format === 'png' ? undefined : q)
}

/** Office/PDF 转图片：支持 DPI、色彩模式、页码范围、分页/长图、质量、批量 */
export async function fileToImages(file: File, opts: ToImageOptions): Promise<ConvertedFile[]> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const stem = baseName(file.name)
  const grayscale = opts.color === 'gray'
  let canvases: HTMLCanvasElement[]

  if (ext === 'pdf') {
    const { doc, numPages } = await openPdf(file)
    try {
      const start = Math.max(1, opts.startPage ?? 1)
      const end = Math.min(numPages, opts.endPage ?? numPages)
      canvases = []
      for (let p = start; p <= end; p++) {
        canvases.push(await renderPdfPageToCanvas(doc, p, opts.dpi, grayscale))
        opts.onProgress?.({ done: p - start + 1, total: end - start + 1, label: file.name })
      }
    } finally {
      await doc.destroy()
    }
  } else {
    const all = await documentToCanvases(file, opts.dpi, grayscale)
    const start = Math.max(1, opts.startPage ?? 1)
    const end = Math.min(all.length, opts.endPage ?? all.length)
    canvases = all.slice(start - 1, end)
    opts.onProgress?.({ done: 1, total: 1, label: file.name })
  }

  if (canvases.length === 0) throw new Error('没有可导出的页面')

  if (opts.mode === 'long') {
    const merged = mergeCanvasesVertical(canvases)
    const blob = await canvasToFormat(merged, opts.format, opts.quality, false)
    return [{ name: `${stem}_长图.${opts.format === 'jpg' ? 'jpg' : opts.format}`, blob }]
  }
  const results: ConvertedFile[] = []
  for (let i = 0; i < canvases.length; i++) {
    const blob = await canvasToFormat(canvases[i], opts.format, opts.quality, false)
    results.push({ name: `${stem}_第${i + 1}页.${opts.format}`, blob })
    canvases[i].width = 0
    canvases[i].height = 0
  }
  return results
}
