export interface PhotoSpec {
  id: string
  name: string
  /** 宽 mm */
  widthMm: number
  /** 高 mm */
  heightMm: number
  note?: string
}

/** 内置证件照标准尺寸（PRD 3.3.1）：一寸、二寸、小二寸、身份证、护照、各国签证 */
export const PHOTO_SPECS: PhotoSpec[] = [
  { id: 'one-inch', name: '一寸', widthMm: 25, heightMm: 35, note: '2R 5.5×8.4cm 排版' },
  { id: 'two-inch', name: '二寸', widthMm: 35, heightMm: 49 },
  { id: 'small-two-inch', name: '小二寸', widthMm: 35, heightMm: 45, note: '护照/部分考试通用' },
  { id: 'id-card', name: '身份证', widthMm: 26, heightMm: 32, note: '第二代居民身份证' },
  { id: 'passport-cn', name: '中国护照', widthMm: 33, heightMm: 48 },
  { id: 'visa-us', name: '美国签证', widthMm: 51, heightMm: 51, note: '2×2 英寸' },
  { id: 'visa-schengen', name: '申根签证', widthMm: 35, heightMm: 45 },
  { id: 'visa-jp', name: '日本签证', widthMm: 35, heightMm: 45 },
  { id: 'visa-kr', name: '韩国签证', widthMm: 35, heightMm: 45 },
  { id: 'visa-uk', name: '英国签证', widthMm: 35, heightMm: 45 },
  { id: 'visa-ca', name: '加拿大签证', widthMm: 50, heightMm: 70 },
  { id: 'visa-au', name: '澳大利亚签证', widthMm: 35, heightMm: 45 },
  { id: 'social-insurance', name: '社保卡', widthMm: 26, heightMm: 32 },
  { id: 'driver-license', name: '驾驶证', widthMm: 22, heightMm: 32 },
  { id: 'exam-cn', name: '四六级/研究生报名', widthMm: 33, heightMm: 48 },
]

export const DPI_HIGH = 300

/** 毫米 → 像素（按指定 DPI） */
export function mmToPx(mm: number, dpi: number): number {
  return Math.round((mm / 25.4) * dpi)
}

export function specPixelSize(spec: PhotoSpec, dpi = DPI_HIGH): { width: number; height: number } {
  return {
    width: mmToPx(spec.widthMm, dpi),
    height: mmToPx(spec.heightMm, dpi),
  }
}

export const BG_COLORS: Record<string, { name: string; rgb: [number, number, number] }> = {
  white: { name: '白色', rgb: [255, 255, 255] },
  blue: { name: '蓝色', rgb: [67, 139, 220] },
  red: { name: '红色', rgb: [215, 38, 26] },
}
