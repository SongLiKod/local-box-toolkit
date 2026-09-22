/** 二维码 / 条形码本地生成（PRD 3.2.7） */
import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'
import { createCanvas } from '../files'

export type BarcodeFormat = 'CODE128' | 'CODE39' | 'EAN13' | 'EAN8' | 'UPC' | 'ITF14' | 'pharmacode'

export interface QrOptions {
  size?: number
  margin?: number
  darkColor?: string
  lightColor?: string
  level?: 'L' | 'M' | 'Q' | 'H'
}

/** 二维码 PNG Blob（canvas 本地绘制，无网络请求） */
export async function generateQrBlob(text: string, opts: QrOptions = {}): Promise<Blob> {
  const canvas = createCanvas(opts.size ?? 256, opts.size ?? 256)
  await QRCode.toCanvas(canvas, text, {
    width: opts.size ?? 256,
    margin: opts.margin ?? 2,
    errorCorrectionLevel: opts.level ?? 'M',
    color: {
      dark: opts.darkColor ?? '#1D2129',
      light: opts.lightColor ?? '#FFFFFF',
    },
  })
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('二维码导出失败'))), 'image/png')
  })
}

export async function generateQrDataUrl(text: string, opts: QrOptions = {}): Promise<string> {
  return QRCode.toDataURL(text, {
    width: opts.size ?? 256,
    margin: opts.margin ?? 2,
    errorCorrectionLevel: opts.level ?? 'M',
    color: { dark: opts.darkColor ?? '#1D2129', light: opts.lightColor ?? '#FFFFFF' },
  })
}

/** 条形码 SVG（JsBarcode 本地生成） */
export function generateBarcodeSvg(text: string, format: BarcodeFormat, height = 80): string {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  JsBarcode(svg, text, {
    format,
    height,
    displayValue: true,
    fontSize: 16,
    margin: 10,
    background: '#ffffff',
    lineColor: '#1D2129',
  })
  return new XMLSerializer().serializeToString(svg)
}

export function barcodeHint(format: BarcodeFormat): string {
  switch (format) {
    case 'EAN13':
      return '13位数字（不含校验位可输12位）'
    case 'EAN8':
      return '8位数字'
    case 'UPC':
      return '12位数字'
    case 'ITF14':
      return '14位数字'
    case 'pharmacode':
      return '3-10位数字(3-127)'
    default:
      return '任意ASCII文本'
  }
}
