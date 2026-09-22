import { createCanvas } from '../files'

export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

export interface TextStyle {
  text: string
  x: number
  y: number
  fontSize: number
  color: string
  fontFamily?: string
  bold?: boolean
  angle?: number
}

export interface WatermarkStyle {
  text: string
  fontSize: number
  color: string
  opacity: number
  /** 平铺间隔 px */
  gap: number
  angle: number
}

/** 裁剪 */
export function cropImage(source: HTMLCanvasElement | HTMLImageElement, rect: CropRect): HTMLCanvasElement {
  const out = createCanvas(rect.width, rect.height)
  const ctx = out.getContext('2d')
  if (!ctx) throw new Error('无法创建Canvas上下文')
  ctx.drawImage(source, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height)
  return out
}

/** 缩放 */
export function resizeImage(
  source: HTMLCanvasElement | HTMLImageElement,
  width: number,
  height: number
): HTMLCanvasElement {
  const out = createCanvas(width, height)
  const ctx = out.getContext('2d')
  if (!ctx) throw new Error('无法创建Canvas上下文')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, width, height)
  return out
}

/** 旋转（角度，顺时针），自动扩展画布 */
export function rotateImage(source: HTMLCanvasElement | HTMLImageElement, angleDeg: number): HTMLCanvasElement {
  const sw = 'naturalWidth' in source ? source.naturalWidth : source.width
  const sh = 'naturalHeight' in source ? source.naturalHeight : source.height
  const rad = (angleDeg * Math.PI) / 180
  const sin = Math.abs(Math.sin(rad))
  const cos = Math.abs(Math.cos(rad))
  const w = Math.round(sw * cos + sh * sin)
  const h = Math.round(sw * sin + sh * cos)
  const out = createCanvas(w, h)
  const ctx = out.getContext('2d')
  if (!ctx) throw new Error('无法创建Canvas上下文')
  ctx.translate(w / 2, h / 2)
  ctx.rotate(rad)
  ctx.drawImage(source, -sw / 2, -sh / 2)
  return out
}

/** 图片模糊 */
export function blurImage(source: HTMLCanvasElement | HTMLImageElement, radius: number): HTMLCanvasElement {
  const sw = 'naturalWidth' in source ? source.naturalWidth : source.width
  const sh = 'naturalHeight' in source ? source.naturalHeight : source.height
  const out = createCanvas(sw, sh)
  const ctx = out.getContext('2d')
  if (!ctx) throw new Error('无法创建Canvas上下文')
  ctx.filter = `blur(${Math.max(0, radius)}px)`
  ctx.drawImage(source, 0, 0)
  ctx.filter = 'none'
  return out
}

/** 添加文字 */
export function drawText(canvas: HTMLCanvasElement, style: TextStyle): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建Canvas上下文')
  ctx.save()
  ctx.translate(style.x, style.y)
  if (style.angle) ctx.rotate((style.angle * Math.PI) / 180)
  ctx.font = `${style.bold ? 'bold ' : ''}${style.fontSize}px ${
    style.fontFamily ?? "'Microsoft YaHei','PingFang SC',sans-serif"
  }`
  ctx.fillStyle = style.color
  ctx.textBaseline = 'top'
  ctx.fillText(style.text, 0, 0)
  ctx.restore()
  return canvas
}

/** 添加平铺文字水印 */
export function drawWatermark(canvas: HTMLCanvasElement, style: WatermarkStyle): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建Canvas上下文')
  ctx.save()
  ctx.globalAlpha = Math.min(1, Math.max(0, style.opacity))
  ctx.fillStyle = style.color
  ctx.font = `${style.fontSize}px 'Microsoft YaHei','PingFang SC',sans-serif`
  const textW = ctx.measureText(style.text).width
  const stepX = Math.max(1, textW + style.gap)
  const stepY = Math.max(1, style.fontSize * 2 + style.gap)
  const diag = Math.hypot(canvas.width, canvas.height)
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate(((style.angle ?? -30) * Math.PI) / 180)
  for (let y = -diag; y < diag; y += stepY) {
    for (let x = -diag; x < diag; x += stepX) {
      ctx.fillText(style.text, x, y)
    }
  }
  ctx.restore()
  return canvas
}
