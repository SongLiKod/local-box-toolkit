import { PDFDocument } from 'pdf-lib'
import { baseName, bytesToBlob, canvasToBlob } from '../files'
import { documentToCanvases } from './toImage'
import { textToPageCanvases } from './render'
import { parseDocx, txtToText } from './docx'
import { pdfToText } from './pdf'
import { workbookToText } from './xlsx'
import type { ConvertedFile } from '../types'

/**
 * Office 文档互转（PRD 3.1.1 全部组合）：
 * Word(docx)→PDF/TXT；PDF→TXT；Excel(xlsx)→PDF；PPT(pptx)→PDF；TXT→PDF
 */
export async function convertOffice(
  file: File,
  target: 'pdf' | 'txt'
): Promise<ConvertedFile> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const stem = baseName(file.name)

  if (target === 'txt') {
    if (ext === 'docx' || ext === 'doc') {
      const { text } = await parseDocx(file)
      return { name: `${stem}.txt`, blob: new Blob([text], { type: 'text/plain;charset=utf-8' }) }
    }
    if (ext === 'pdf') {
      const text = await pdfToText(file)
      return { name: `${stem}.txt`, blob: new Blob([text], { type: 'text/plain;charset=utf-8' }) }
    }
    if (ext === 'xlsx' || ext === 'xls') {
      const text = await workbookToText(file)
      return { name: `${stem}.txt`, blob: new Blob([text], { type: 'text/plain;charset=utf-8' }) }
    }
    throw new Error(`不支持 ${ext} → TXT 转换`)
  }

  // target === 'pdf'
  if (ext === 'txt') {
    const text = await txtToText(file)
    const canvases = textToPageCanvases(text, { dpi: 150, grayscale: false })
    const blob = await canvasesToPdf(canvases)
    return { name: `${stem}.pdf`, blob }
  }
  if (['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt'].includes(ext)) {
    const canvases = await documentToCanvases(file, 150, false)
    const blob = await canvasesToPdf(canvases)
    canvases.forEach((c) => {
      c.width = 0
      c.height = 0
    })
    return { name: `${stem}.pdf`, blob }
  }
  throw new Error(`不支持 ${ext} → PDF 转换`)
}

/** Canvas 页列表 → PDF（高清导出） */
export async function canvasesToPdf(
  canvases: HTMLCanvasElement[],
  dpi = 150
): Promise<Blob> {
  const doc = await PDFDocument.create()
  for (const canvas of canvases) {
    const png = await canvasToBlob(canvas, 'image/png')
    const img = await doc.embedPng(await png.arrayBuffer())
    const wPt = (canvas.width * 72) / dpi
    const hPt = (canvas.height * 72) / dpi
    const page = doc.addPage([wPt, hPt])
    page.drawImage(img, { x: 0, y: 0, width: wPt, height: hPt })
  }
  return bytesToBlob(await doc.save({ useObjectStreams: true }), 'application/pdf')
}
