import * as pdfjs from 'pdfjs-dist'
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { PDFDict, PDFDocument, PDFName } from 'pdf-lib'
import { bytesToBlob, canvasToBlob, readAsArrayBuffer } from '../files'
import type { ConvertedFile, ProgressCb } from '../types'

pdfjs.GlobalWorkerOptions.workerSrc = PdfWorker

export interface PdfDoc {
  numPages: number
  doc: pdfjs.PDFDocumentProxy
}

export async function openPdf(file: File | Blob): Promise<PdfDoc> {
  const data = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise
  return { numPages: doc.numPages, doc }
}

/** PDF → TXT：本地逐页提取文本 */
export async function pdfToText(file: File): Promise<string> {
  const { doc, numPages } = await openPdf(file)
  try {
    const parts: string[] = []
    for (let p = 1; p <= numPages; p++) {
      const page = await doc.getPage(p)
      const content = await page.getTextContent()
      let lastY: number | null = null
      let line = ''
      const lines: string[] = []
      for (const item of content.items) {
        if (!('str' in item)) continue
        const y = item.transform[5]
        if (lastY !== null && Math.abs(y - lastY) > 2) {
          lines.push(line)
          line = ''
        }
        line += item.str
        if (item.hasEOL) {
          lines.push(line)
          line = ''
        }
        lastY = y
      }
      if (line) lines.push(line)
      parts.push(lines.join('\n'))
      page.cleanup()
    }
    return parts.join('\n\n')
  } finally {
    await doc.destroy()
  }
}

/** PDF 渲染单页到 Canvas（DPI 控制缩放） */
export async function renderPdfPageToCanvas(
  doc: pdfjs.PDFDocumentProxy,
  pageNumber: number,
  dpi: number,
  grayscale: boolean
): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageNumber)
  const scale = dpi / 72
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.floor(viewport.width))
  canvas.height = Math.max(1, Math.floor(viewport.height))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建Canvas上下文')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvasContext: ctx, viewport }).promise
  if (grayscale) {
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const d = data.data
    for (let i = 0; i < d.length; i += 4) {
      const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])
      d[i] = g
      d[i + 1] = g
      d[i + 2] = g
    }
    ctx.putImageData(data, 0, 0)
  }
  page.cleanup()
  return canvas
}

/** PDF 合并 */
export async function mergePdfs(files: File[]): Promise<Blob> {
  if (files.length < 2) throw new Error('合并至少需要两个PDF文件')
  const out = await PDFDocument.create()
  for (const f of files) {
    const src = await PDFDocument.load(await readAsArrayBuffer(f), { ignoreEncryption: true })
    const pages = await out.copyPages(src, src.getPageIndices())
    pages.forEach((p) => out.addPage(p))
  }
  return bytesToBlob(await out.save(), 'application/pdf')
}

/** PDF 拆分：每页一个文件 */
export async function splitPdf(file: File): Promise<ConvertedFile[]> {
  const src = await PDFDocument.load(await readAsArrayBuffer(file), { ignoreEncryption: true })
  const results: ConvertedFile[] = []
  const stem = file.name.replace(/\.pdf$/i, '')
  for (let i = 0; i < src.getPageCount(); i++) {
    const one = await PDFDocument.create()
    const [page] = await one.copyPages(src, [i])
    one.addPage(page)
    const bytes = await one.save()
    results.push({
      name: `${stem}_第${i + 1}页.pdf`,
      blob: bytesToBlob(bytes, 'application/pdf'),
    })
  }
  return results
}

export interface PdfCompressOptions {
  /** strong=true 时逐页栅格化重压缩（有损，体积更小） */
  strong: boolean
  dpi?: number
  onProgress?: ProgressCb
}

/** PDF 压缩：结构优化（无损）或栅格化强压缩 */
export async function compressPdf(file: File, opts: PdfCompressOptions): Promise<Blob> {
  const bytes = await readAsArrayBuffer(file)
  if (!opts.strong) {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
    doc.setProducer('LocalBox')
    doc.setCreator('LocalBox')
    const saved = await doc.save({ useObjectStreams: true })
    if (saved.byteLength < bytes.byteLength) {
      return bytesToBlob(saved, 'application/pdf')
    }
    return new Blob([bytes], { type: 'application/pdf' })
  }
  const { doc, numPages } = await openPdf(file)
  try {
    const out = await PDFDocument.create()
    const dpi = opts.dpi ?? 150
    for (let p = 1; p <= numPages; p++) {
      const canvas = await renderPdfPageToCanvas(doc, p, dpi, false)
      const jpg = await canvasToBlob(canvas, 'image/jpeg', 0.72)
      const img = await out.embedJpg(await jpg.arrayBuffer())
      const wPt = (canvas.width * 72) / dpi
      const hPt = (canvas.height * 72) / dpi
      const page = out.addPage([wPt, hPt])
      page.drawImage(img, { x: 0, y: 0, width: wPt, height: hPt })
      canvas.width = 0
      canvas.height = 0
      opts.onProgress?.({ done: p, total: numPages, label: file.name })
    }
    return bytesToBlob(await out.save({ useObjectStreams: true }), 'application/pdf')
  } finally {
    await doc.destroy()
  }
}

export interface WatermarkRemoveResult {
  blob: Blob
  removedAnnotations: number
  removedXObjects: number
}

/**
 * PDF 去水印（尽力而为，全部本地处理）：
 * 1. 移除页面注释层（Annotation）；
 * 2. 移除资源中名称含 watermark/stamp/shuiyin 的图片 XObject。
 */
export async function removeWatermark(file: File): Promise<WatermarkRemoveResult> {
  const bytes = await readAsArrayBuffer(file)
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const ctx = doc.context
  let removedAnnotations = 0
  let removedXObjects = 0

  for (const page of doc.getPages()) {
    if (page.node.get(PDFName.of('Annots'))) {
      page.node.delete(PDFName.of('Annots'))
      removedAnnotations += 1
    }
    const resRaw = page.node.Resources()
    const resDict = resRaw ? ctx.lookup(resRaw, PDFDict) : undefined
    if (!(resDict instanceof PDFDict)) continue
    const xoDict = resDict.lookup(PDFName.of('XObject'), PDFDict)
    if (!(xoDict instanceof PDFDict)) continue
    const toDelete: PDFName[] = []
    for (const [name] of xoDict.entries()) {
      const n = name instanceof PDFName ? name.decodeText().toLowerCase() : ''
      if (/watermark|stamp|shuiyin|yin.?zhang/.test(n)) toDelete.push(name)
    }
    for (const name of toDelete) {
      xoDict.delete(name)
      removedXObjects += 1
    }
  }
  const saved = await doc.save({ useObjectStreams: true })
  return {
    blob: bytesToBlob(saved, 'application/pdf'),
    removedAnnotations,
    removedXObjects,
  }
}
