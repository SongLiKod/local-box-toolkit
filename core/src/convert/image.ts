import { GIFEncoder, quantize, applyPalette } from 'gifenc'
import { baseName, canvasToBlob, createCanvas, extOf, loadImage } from '../files'
import { encodeBmp } from './tiff'
import { hasExif } from '../utils/exif'
import type { ConvertedFile, ProgressCb } from '../types'

export type ImageOutFormat = 'jpg' | 'png' | 'webp' | 'gif' | 'bmp' | 'svg'

export const IMAGE_ACCEPT = '.jpg,.jpeg,.png,.webp,.gif,.bmp,.svg'

export interface ImageConvertOptions {
  format: ImageOutFormat
  quality: number // 0~100
  /** 自定义分辨率；null 保持原尺寸 */
  width?: number | null
  height?: number | null
  keepRatio: boolean
  /** 无损压缩模式（png/gif 优化、jpeg 高质量重编码） */
  lossless: boolean
  onProgress?: ProgressCb
}

function mimeOf(format: ImageOutFormat): string {
  switch (format) {
    case 'jpg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    case 'gif':
      return 'image/gif'
    case 'bmp':
      return 'image/bmp'
    case 'svg':
      return 'image/svg+xml'
  }
}

/**
 * 图片格式互转：Canvas 本地重绘，天然清除 EXIF 信息（PRD 3.1.3 / 3.4）。
 * JPG 输出以白底填充，PNG/WEBP 保留透明背景；GIF/BMP 不支持透明则白底合成。
 */
export async function convertImage(file: File, opts: ImageConvertOptions): Promise<ConvertedFile> {
  const img = await loadImage(file)
  let w = opts.width && opts.width > 0 ? Math.round(opts.width) : img.naturalWidth
  let h = opts.height && opts.height > 0 ? Math.round(opts.height) : img.naturalHeight
  if (opts.keepRatio) {
    const ratio = img.naturalWidth / img.naturalHeight
    if (opts.width && opts.width > 0 && !(opts.height && opts.height > 0)) h = Math.round(w / ratio)
    else if (opts.height && opts.height > 0 && !(opts.width && opts.width > 0)) w = Math.round(h * ratio)
  }
  const canvas = createCanvas(w, h)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建Canvas上下文')
  const needOpaque = opts.format === 'jpg' || opts.format === 'bmp' || opts.format === 'gif'
  if (needOpaque) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
  }
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, w, h)

  const q = Math.min(1, Math.max(0, opts.quality / 100))
  const stem = baseName(file.name)
  let blob: Blob

  if (opts.format === 'gif') {
    const data = ctx.getImageData(0, 0, w, h)
    const palette = quantize(data.data, 256)
    const indexed = applyPalette(data.data, palette)
    const enc = GIFEncoder()
    enc.writeFrame(indexed, w, h, { palette })
    enc.finish()
    blob = new Blob([new Uint8Array(enc.bytes())], { type: 'image/gif' })
  } else if (opts.format === 'bmp') {
    const data = ctx.getImageData(0, 0, w, h)
    blob = encodeBmp(data)
  } else if (opts.format === 'svg') {
    const png = await canvasToBlob(canvas, 'image/png')
    const dataUrl = await blobToDataUrlLocal(png)
    blob = new Blob(
      [
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
          `width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
          `<image width="${w}" height="${h}" xlink:href="${dataUrl}" href="${dataUrl}"/></svg>`,
      ],
      { type: 'image/svg+xml' }
    )
  } else {
    blob = await canvasToBlob(canvas, mimeOf(opts.format), opts.format === 'png' ? undefined : q)
  }
  canvas.width = 0
  canvas.height = 0
  return { name: `${stem}.${opts.format === 'jpg' ? 'jpg' : opts.format}`, blob }
}

async function blobToDataUrlLocal(blob: Blob): Promise<string> {
  const { blobToDataUrl } = await import('../files')
  return blobToDataUrl(blob)
}

/** 图片无损压缩：png/gif 重编码去冗余元数据；jpeg/webp 高质量重编码 */
export async function compressImages(
  files: File[],
  onProgress?: ProgressCb
): Promise<ConvertedFile[]> {
  const out: ConvertedFile[] = []
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    const ext = extOf(f.name)
    const format: ImageOutFormat = ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : ext === 'gif' ? 'gif' : 'jpg'
    const r = await convertImage(f, {
      format,
      quality: format === 'png' || format === 'gif' ? 100 : 82,
      keepRatio: true,
      lossless: true,
    })
    out.push({ name: `${baseName(f.name)}_压缩.${format}`, blob: r.blob })
    onProgress?.({ done: i + 1, total: files.length, label: f.name })
  }
  return out
}

/** 仅清除 EXIF 信息，保持原格式与尺寸 */
export async function clearExif(files: File[], onProgress?: ProgressCb): Promise<ConvertedFile[]> {
  const out: ConvertedFile[] = []
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    const ext = extOf(f.name)
    const hadExif = ext === 'jpg' || ext === 'jpeg' ? await hasExif(f) : false
    const format: ImageOutFormat =
      ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : ext === 'gif' ? 'gif' : ext === 'bmp' ? 'bmp' : 'jpg'
    const r = await convertImage(f, {
      format,
      quality: 92,
      keepRatio: true,
      lossless: false,
    })
    out.push({ name: `${baseName(f.name)}_无EXIF.${format}`, blob: r.blob })
    void hadExif
    onProgress?.({ done: i + 1, total: files.length, label: f.name })
  }
  return out
}
