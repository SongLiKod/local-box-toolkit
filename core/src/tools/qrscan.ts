/**
 * 二维码离线识别：文本 → 矩阵渲染，以及图像 → jsQR 解码。
 * 全部在本机完成，不依赖任何在线接口（PRD 3.2 开发工具）。
 */
import { create, type QRCode } from 'qrcode'
import jsQR from 'jsqr'

/** 与浏览器 ImageData 结构兼容的 RGBA 图像 */
export interface RgbaImage {
  data: Uint8ClampedArray
  width: number
  height: number
}

export interface QrCorner {
  x: number
  y: number
}

export interface QrHit {
  text: string
  /** 顺时针四角：左上、右上、右下、左下，用于在预览上画框 */
  corners: QrCorner[]
}

export interface RenderQrOptions {
  /** 每个模块的像素边长，默认 4 */
  scale?: number
  /** 静默区（空白边框）模块数，默认 4 */
  quietZone?: number
}

export type QrContentKind = 'url' | 'wifi' | 'tel' | 'sms' | 'email' | 'geo' | 'text'

export interface QrContentInfo {
  kind: QrContentKind
  label: string
  /** 可直接执行的动作名，如"打开链接" */
  action?: string
}

export interface WifiCredential {
  ssid: string
  password?: string
  hidden: boolean
}

/** 文本 → 二维码像素图（纯函数：便于单测、也用于生成"识别不了就重画"的兜底图） */
export function renderQr(text: string, opts: RenderQrOptions = {}): RgbaImage {
  const scale = Math.max(1, Math.floor(opts.scale ?? 4))
  const quiet = Math.max(0, Math.floor(opts.quietZone ?? 4))
  const qr: QRCode = create(text, { errorCorrectionLevel: 'M' })
  const size = qr.modules.size
  const matrix = qr.modules.data as unknown as Uint8Array

  const dim = (size + quiet * 2) * scale
  const out = new Uint8ClampedArray(dim * dim * 4)
  for (let y = 0; y < dim; y++) {
    const my = Math.floor(y / scale) - quiet
    for (let x = 0; x < dim; x++) {
      const mx = Math.floor(x / scale) - quiet
      const dark = mx >= 0 && my >= 0 && mx < size && my < size && matrix[my * size + mx] === 1
      const v = dark ? 0 : 255
      const i = (y * dim + x) * 4
      out[i] = v
      out[i + 1] = v
      out[i + 2] = v
      out[i + 3] = 255
    }
  }
  return { data: out, width: dim, height: dim }
}

/** 识别图像中的二维码；失败返回 null（不抛错，UI 走"未识别"分支） */
export function decodeQr(img: RgbaImage): QrHit | null {
  if (!img || img.width <= 0 || img.height <= 0) return null
  if (!img.data || img.data.length < img.width * img.height * 4) return null
  let found
  try {
    found = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' })
  } catch {
    return null
  }
  if (!found) return null
  const l = found.location
  return {
    text: found.data,
    corners: [
      { x: l.topLeftCorner.x, y: l.topLeftCorner.y },
      { x: l.topRightCorner.x, y: l.topRightCorner.y },
      { x: l.bottomRightCorner.x, y: l.bottomRightCorner.y },
      { x: l.bottomLeftCorner.x, y: l.bottomLeftCorner.y },
    ],
  }
}

/** 按内容类型给 UI 出"该做什么动作"的提示 */
export function describeQrContent(text: string): QrContentInfo {
  const t = (text ?? '').trim()
  if (/^https?:\/\//i.test(t)) return { kind: 'url', label: '网址', action: '打开链接' }
  if (/^wifi:/i.test(t)) return { kind: 'wifi', label: '无线网络' }
  if (/^tel:/i.test(t)) return { kind: 'tel', label: '电话', action: '拨打电话' }
  if (/^sms:/i.test(t)) return { kind: 'sms', label: '短信', action: '发短信' }
  if (/^mailto:/i.test(t)) return { kind: 'email', label: '邮件', action: '写邮件' }
  if (/^geo:/i.test(t)) return { kind: 'geo', label: '地理位置' }
  return { kind: 'text', label: '文本' }
}

/** 解析 WIFI: 码，拿到 ssid / 密码 / 是否隐藏网络 */
export function parseWifiQr(text: string): WifiCredential | null {
  const t = (text ?? '').trim()
  if (!/^wifi:/i.test(t)) return null
  const body = t.replace(/^wifi:/i, '').replace(/;;?$/, '')
  const parts: Record<string, string> = {}
  for (const chunk of splitUnescaped(body, ';')) {
    const eq = chunk.indexOf(':')
    if (eq <= 0) continue
    parts[chunk.slice(0, eq).toUpperCase()] = chunk.slice(eq + 1)
  }
  if (parts.S === undefined) return null
  return {
    ssid: unescapeWifi(parts.S),
    password: parts.P !== undefined ? unescapeWifi(parts.P) : undefined,
    hidden: (parts.H ?? '').toUpperCase() === 'TRUE',
  }
}

/** 按分隔符切分，忽略被反斜杠转义的分隔符（转义原样保留给 unescapeWifi） */
function splitUnescaped(s: string, sep: string): string[] {
  const out: string[] = []
  let cur = ''
  let esc = false
  for (const ch of s) {
    if (esc) {
      cur += ch
      esc = false
    } else if (ch === '\\') {
      cur += ch
      esc = true
    } else if (ch === sep) {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out
}

/** WIFI 码里的转义：\:\;\\ → 原字符 */
function unescapeWifi(s: string): string {
  let out = ''
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && i + 1 < s.length) {
      out += s[i + 1]
      i++
    } else {
      out += s[i]
    }
  }
  return out
}
