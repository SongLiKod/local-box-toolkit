import JSZip from 'jszip'
import { getNative } from './env'
import type { ConvertedFile } from './types'

export function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

/** 将 Uint8Array（可能为 SharedArrayBuffer 视图）安全转为 Blob */
export function bytesToBlob(bytes: Uint8Array, mime: string): Blob {
  return new Blob([new Uint8Array(bytes)], { type: mime })
}

export function baseName(name: string): string {
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(0, i) : name
}

export function readAsArrayBuffer(file: File | Blob): Promise<ArrayBuffer> {
  return file.arrayBuffer()
}

export function readAsText(file: File | Blob, encoding = 'utf-8'): Promise<string> {
  return new Response(file).text().then(async (t) => {
    if (encoding.toLowerCase() === 'utf-8') return t
    const buf = await file.arrayBuffer()
    return new TextDecoder(encoding).decode(buf)
  })
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error(`canvas导出失败: ${mime}`))),
      mime,
      quality
    )
  })
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result))
    fr.onerror = () => reject(fr.error)
    fr.readAsDataURL(blob)
  })
}

export function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let bin = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(bin)
}

export async function saveBlob(name: string, blob: Blob): Promise<string | null> {
  const native = getNative()
  if (native) {
    const buf = await blob.arrayBuffer()
    return native.saveFile(name, buf)
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
  return name
}

export async function saveBlobs(files: ConvertedFile[], zipName?: string): Promise<string | null> {
  if (files.length === 1 && !zipName) {
    return saveBlob(files[0].name, files[0].blob)
  }
  const zip = new JSZip()
  for (const f of files) zip.file(f.name, f.blob)
  const blob = await zip.generateAsync({ type: 'blob' })
  return saveBlob(zipName ?? 'localbox-export.zip', blob)
}

export function loadImage(src: string | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = typeof src === 'string' ? src : URL.createObjectURL(src)
    const img = new Image()
    img.onload = () => {
      if (typeof src !== 'string') URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      if (typeof src !== 'string') URL.revokeObjectURL(url)
      reject(new Error('图片加载失败'))
    }
    img.decoding = 'async'
    img.src = url
  })
}

export function createCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  return c
}

export function releaseCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = 0
  canvas.height = 0
}
