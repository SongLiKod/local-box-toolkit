import { canvasToBlob, extOf, loadImage } from '../files'

export interface ExifSummary {
  hasExif: boolean
  make?: string
  model?: string
  dateTime?: string
}

/** 扫描 JPEG APP1 段判断是否存在 EXIF（本地读取，不上传） */
export async function hasExif(file: File | Blob): Promise<boolean> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return false
  let i = 2
  while (i + 4 < bytes.length) {
    if (bytes[i] !== 0xff) break
    const marker = bytes[i + 1]
    if (marker === 0xda || marker === 0xd9) break
    const len = (bytes[i + 2] << 8) | bytes[i + 3]
    if (marker === 0xe1) {
      const exifHeader = bytes.subarray(i + 4, i + 10)
      const text = String.fromCharCode(...exifHeader)
      if (text.startsWith('Exif')) return true
    }
    i += 2 + len
  }
  return false
}

/** 解析 EXIF 摘要信息（相机型号、拍摄时间） */
export async function readExifSummary(file: File): Promise<ExifSummary> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const result: ExifSummary = { hasExif: false }
  let i = 2
  while (i + 4 < bytes.length) {
    if (bytes[i] !== 0xff) break
    const marker = bytes[i + 1]
    if (marker === 0xda || marker === 0xd9) break
    const len = (bytes[i + 2] << 8) | bytes[i + 3]
    if (marker === 0xe1 && String.fromCharCode(...bytes.subarray(i + 4, i + 8)) === 'Exif') {
      result.hasExif = true
      const ascii = new TextDecoder('latin1').decode(bytes.subarray(i + 6, i + 6 + len))
      const make = ascii.match(/(?:^|[^\w])([A-Za-z][A-Za-z0-9 .&_-]{1,20})Nikon|Canon|SONY|FUJIFILM|HUAWEI|Xiaomi|OPPO|apple|samsung/i)
      if (make) result.make = make[1]?.trim()
      const dt = ascii.match(/\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}/)
      if (dt) result.dateTime = dt[0]
    }
    i += 2 + len
  }
  return result
}

/**
 * 图片 EXIF 清除：Canvas 重绘后重新编码，元数据全部剥离（PRD 3.4 / 3.1.3）。
 */
export async function stripExif(file: File): Promise<Blob> {
  const ext = extOf(file.name)
  const img = await loadImage(file)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建Canvas上下文')
  if (ext === 'jpg' || ext === 'jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.drawImage(img, 0, 0)
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
  const blob = await canvasToBlob(canvas, mime, mime === 'image/jpeg' ? 0.92 : undefined)
  canvas.width = 0
  canvas.height = 0
  return blob
}
