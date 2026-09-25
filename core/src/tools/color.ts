/** 颜色取色器与格式转换（PRD 3.4） */

export interface RGB {
  r: number
  g: number
  b: number
}
export interface HSL {
  h: number
  s: number
  l: number
}

export function hexToRgb(hex: string): RGB {
  let h = hex.trim().replace(/^#/, '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error('无效的 HEX 颜色')
  const n = parseInt(h, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function rgbToHex({ r, g, b }: RGB): string {
  const to = (v: number): string => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase()
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  const d = max - min
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0)
        break
      case gn:
        h = (bn - rn) / d + 2
        break
      default:
        h = (rn - gn) / d + 4
    }
    h /= 6
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const sn = s / 100
  const ln = l / 100
  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = ln - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) }
}

export function rgbString({ r, g, b }: RGB): string {
  return `rgb(${r}, ${g}, ${b})`
}

/** 从图片指定坐标取色 */
export function pickPixel(imageData: ImageData, x: number, y: number): RGB {
  const px = Math.max(0, Math.min(imageData.width - 1, Math.floor(x)))
  const py = Math.max(0, Math.min(imageData.height - 1, Math.floor(y)))
  const i = (py * imageData.width + px) * 4
  return { r: imageData.data[i], g: imageData.data[i + 1], b: imageData.data[i + 2] }
}

/** 生成一组明暗色阶 */
export function shades(hex: string, steps = 5): string[] {
  const hsl = rgbToHsl(hexToRgb(hex))
  const out: string[] = []
  for (let i = 0; i < steps; i++) {
    const l = Math.round(10 + (i * 80) / (steps - 1))
    out.push(rgbToHex(hslToRgb({ ...hsl, l })))
  }
  return out
}

/** HSV 颜色模型：h 0~360°，s / v 0~100 */
export interface HSV {
  h: number
  s: number
  v: number
}

/** RGB → HSV（h: 0~360，s/v: 0~100，取整） */
export function rgbToHsv({ r, g, b }: RGB): HSV {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : d / max
  return { h: Math.round(h) % 360, s: Math.round(s * 100), v: Math.round(max * 100) }
}

/** HSV → RGB */
export function hsvToRgb({ h, s, v }: HSV): RGB {
  const hv = ((h % 360) + 360) % 360
  const c = (v / 100) * (s / 100)
  const x = c * (1 - Math.abs(((hv / 60) % 2) - 1))
  const m = v / 100 - c
  let r = 0
  let g = 0
  let b = 0
  if (hv < 60) [r, g, b] = [c, x, 0]
  else if (hv < 120) [r, g, b] = [x, c, 0]
  else if (hv < 180) [r, g, b] = [0, c, x]
  else if (hv < 240) [r, g, b] = [0, x, c]
  else if (hv < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  }
}

/** 校验并规范化 HEX：`#abc` → `#AABBCC`，非法输入抛错 */
export function normalizeHex(hex: string): string {
  return rgbToHex(hexToRgb(hex))
}

/** WCAG 相对亮度 */
function luminance({ r, g, b }: RGB): number {
  const f = (c: number): number => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

/** 两个颜色的 WCAG 对比度（1~21，保留 2 位小数） */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(hexToRgb(a))
  const lb = luminance(hexToRgb(b))
  const hi = Math.max(la, lb)
  const lo = Math.min(la, lb)
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100
}

/** 在该背景色上更清晰的文字色（黑或白） */
export function bestTextOn(bg: string): string {
  return contrastRatio(bg, '#FFFFFF') >= contrastRatio(bg, '#000000') ? '#FFFFFF' : '#000000'
}
