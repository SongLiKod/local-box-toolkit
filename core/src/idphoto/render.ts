import { createCanvas } from '../files'
import { specPixelSize, type PhotoSpec, BG_COLORS } from './specs'
import { detectFace, type FaceBox } from './detect'
import { matteFromEdge, compositeBackground } from './matting'
import { writeDpiToImage } from './dpi'

export interface IdPhotoOptions {
  spec: PhotoSpec
  background: keyof typeof BG_COLORS | 'original'
  /** 人脸在画面高度中的目标占比（头顶留白自动计算） */
  faceRatio?: number
  /** 手动偏移（相对自动居中，-1~1） */
  offsetRatioX?: number
  offsetRatioY?: number
  zoom?: number
  tolerance?: number
}

/**
 * 证件照制作：人脸检测 → 按标准尺寸比例裁剪（人脸居中偏上）→
 * 智能抠图换背景（白/蓝/红）→ 300DPI 高清导出，本地无水印。
 */
export async function makeIdPhoto(
  source: HTMLImageElement,
  opts: IdPhotoOptions
): Promise<{ canvas: HTMLCanvasElement; face: FaceBox | null }> {
  const { width: sw, height: sh } = { width: source.naturalWidth, height: source.naturalHeight }
  const full = createCanvas(sw, sh)
  const fctx = full.getContext('2d')
  if (!fctx) throw new Error('无法创建Canvas上下文')
  fctx.drawImage(source, 0, 0)
  const face = detectFace(fctx.getImageData(0, 0, sw, sh))

  const target = specPixelSize(opts.spec, 300)
  const ratio = target.width / target.height
  const zoom = Math.min(3, Math.max(0.5, opts.zoom ?? 1))

  let cropW: number
  let cropH: number
  if (sw / sh > ratio) {
    cropH = sh
    cropW = sh * ratio
  } else {
    cropW = sw
    cropH = sw / ratio
  }
  let cx = sw / 2
  let cy = sh / 2
  if (face) {
    cx = face.x + face.width / 2
    const faceRatio = opts.faceRatio ?? 0.55
    const scale = face.height / (cropH * faceRatio)
    cropW *= scale
    cropH *= scale
    if (cropW > sw) {
      const k = sw / cropW
      cropW *= k
      cropH *= k
    }
    if (cropH > sh) {
      const k = sh / cropH
      cropW *= k
      cropH *= k
    }
    cy = face.y + face.height / 2 - face.height * 0.12
  }
  cropW = Math.max(16, cropW / zoom)
  cropH = Math.max(16, cropH / zoom)
  cx += (opts.offsetRatioX ?? 0) * cropW
  cy += (opts.offsetRatioY ?? 0) * cropH
  cx = Math.min(Math.max(cx, cropW / 2), sw - cropW / 2)
  cy = Math.min(Math.max(cy, cropH / 2), sh - cropH / 2)

  const cropped = createCanvas(target.width, target.height)
  const ctx = cropped.getContext('2d')
  if (!ctx) throw new Error('无法创建Canvas上下文')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, cx - cropW / 2, cy - cropH / 2, cropW, cropH, 0, 0, target.width, target.height)

  if (opts.background !== 'original') {
    const bg = BG_COLORS[opts.background].rgb
    const imgData = ctx.getImageData(0, 0, cropped.width, cropped.height)
    const { mask } = matteFromEdge(imgData, {
      tolerance: opts.tolerance ?? 60,
      feather: Math.max(1, Math.round(cropped.width / 400)),
    })
    const composited = compositeBackground(imgData, mask, bg)
    ctx.putImageData(composited, 0, 0)
  }
  return { canvas: cropped, face }
}

/** 证件照导出：PNG/JPG，写入 300DPI 元数据，无水印 */
export async function exportIdPhoto(
  canvas: HTMLCanvasElement,
  format: 'png' | 'jpg',
  dpi = 300
): Promise<Blob> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('导出失败'))),
      format === 'png' ? 'image/png' : 'image/jpeg',
      format === 'jpg' ? 0.95 : undefined
    )
  })
  if (format === 'png') return writeDpiToImage(blob, dpi, 'png')
  return writeDpiToImage(blob, dpi, 'jpg')
}
