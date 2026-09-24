import { createCanvas } from '../files'

/** A4 @96dpi 像素尺寸 */
export const A4_W = 794
export const A4_H = 1123

export interface PageRenderOptions {
  /** 目标 DPI：72 / 150 / 300 */
  dpi: number
  /** 灰度黑白模式 */
  grayscale: boolean
}

export function toGrayscale(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = data.data
  for (let i = 0; i < d.length; i += 4) {
    const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])
    d[i] = g
    d[i + 1] = g
    d[i + 2] = g
  }
  ctx.putImageData(data, 0, 0)
  return canvas
}

/**
 * Word(docx) 按原始版式渲染：docx-preview 解析 OOXML 中的页面尺寸、样式表、字体、
 * 段落间距、表格、页眉页脚与分页符，逐页光栅化为 Canvas，最大程度还原 Word 排版。
 * 失败时由调用方回退到 mammoth + HTML 渲染。
 */
export async function docxToPageCanvases(
  data: ArrayBuffer,
  opts: PageRenderOptions
): Promise<HTMLCanvasElement[]> {
  const [{ renderAsync }, { default: html2canvas }] = await Promise.all([
    import('docx-preview'),
    import('html2canvas'),
  ])
  const host = document.createElement('div')
  host.setAttribute('data-localbox-docx', '')
  host.setAttribute('style', 'position:fixed;left:-100000px;top:0;background:#ffffff;')
  document.body.appendChild(host)
  try {
    await renderAsync(data, host, host, {
      className: 'docx',
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      ignoreFonts: false,
      breakPages: true,
      ignoreLastRenderedPageBreak: false,
      experimental: true,
      useBase64URL: true,
      renderHeaders: true,
      renderFooters: true,
      renderFootnotes: true,
      renderEndnotes: true,
    })
    const pages = Array.from(host.querySelectorAll<HTMLElement>('section.docx'))
    if (pages.length === 0) throw new Error('docx 版式渲染结果为空')
    const scale = opts.dpi / 96
    const canvases: HTMLCanvasElement[] = []
    for (const page of pages) {
      const canvas = await html2canvas(page, {
        scale,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      })
      canvases.push(opts.grayscale ? toGrayscale(canvas) : canvas)
    }
    return canvases
  } finally {
    host.remove()
  }
}

/**
 * 将 HTML 片段离屏渲染并按 A4 分页切分为 Canvas 页。
 * 保留段落、表格、内嵌图片（PRD 3.1.2），表格边框由调用方 HTML 内联样式提供。
 */
export async function htmlToPageCanvases(
  html: string,
  opts: PageRenderOptions,
  widthPx = A4_W
): Promise<HTMLCanvasElement[]> {
  const { default: html2canvas } = await import('html2canvas')
  const container = document.createElement('div')
  container.className = 'localbox-render-doc'
  container.setAttribute(
    'style',
    `position:fixed;left:-100000px;top:0;width:${widthPx}px;background:#ffffff;color:#1D2129;` +
      `font-family:'Microsoft YaHei','PingFang SC',Inter,sans-serif;font-size:14px;line-height:1.7;padding:24px;box-sizing:border-box;`
  )
  container.innerHTML = html
  document.body.appendChild(container)
  try {
    const scale = opts.dpi / 96
    const rendered = await html2canvas(container, {
      scale,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    })
    const pageH = Math.round((A4_H / A4_W) * rendered.width)
    return sliceCanvas(rendered, pageH, opts.grayscale)
  } finally {
    container.remove()
  }
}

/** 将长 Canvas 按页高切分为多页（可选灰度） */
export function sliceCanvas(
  source: HTMLCanvasElement,
  pageHeight: number,
  grayscale: boolean
): HTMLCanvasElement[] {
  const pages: HTMLCanvasElement[] = []
  const ctx = source.getContext('2d')
  if (!ctx) return pages
  let y = 0
  while (y < source.height) {
    const h = Math.min(pageHeight, source.height - y)
    const page = createCanvas(source.width, h)
    const pctx = page.getContext('2d')
    if (!pctx) break
    pctx.fillStyle = '#ffffff'
    pctx.fillRect(0, 0, page.width, page.height)
    pctx.drawImage(source, 0, y, source.width, h, 0, 0, source.width, h)
    pages.push(grayscale ? toGrayscale(page) : page)
    y += h
  }
  if (pages.length === 0) {
    const page = createCanvas(source.width, pageHeight)
    const pctx = page.getContext('2d')
    if (pctx) {
      pctx.fillStyle = '#ffffff'
      pctx.fillRect(0, 0, page.width, page.height)
    }
    pages.push(grayscale ? toGrayscale(page) : page)
  }
  return pages
}

/** 纯文本按行排版分页（TXT→PDF / TXT 预览） */
export function textToPageCanvases(text: string, opts: PageRenderOptions): HTMLCanvasElement[] {
  const scale = opts.dpi / 96
  const w = Math.round(A4_W * scale)
  const h = Math.round(A4_H * scale)
  const fontSize = Math.round(14 * scale)
  const lineH = Math.round(fontSize * 1.7)
  const margin = Math.round(24 * scale)
  const maxW = w - margin * 2

  const tmp = createCanvas(1, 1)
  const tctx = tmp.getContext('2d')
  if (!tctx) return []
  tctx.font = `${fontSize}px "Microsoft YaHei","PingFang SC",monospace`

  const lines: string[] = []
  for (const raw of text.split(/\r\n|\r|\n/)) {
    if (raw.length === 0) {
      lines.push('')
      continue
    }
    let cur = ''
    for (const ch of raw) {
      if (tctx.measureText(cur + ch).width > maxW && cur.length > 0) {
        lines.push(cur)
        cur = ch
      } else cur += ch
    }
    lines.push(cur)
  }

  const perPage = Math.max(1, Math.floor((h - margin * 2) / lineH))
  const pageCount = Math.max(1, Math.ceil(lines.length / perPage))
  const pages: HTMLCanvasElement[] = []
  for (let p = 0; p < pageCount; p++) {
    const canvas = createCanvas(w, h)
    const ctx = canvas.getContext('2d')
    if (!ctx) break
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.font = `${fontSize}px "Microsoft YaHei","PingFang SC",monospace`
    ctx.fillStyle = '#1D2129'
    ctx.textBaseline = 'top'
    const slice = lines.slice(p * perPage, (p + 1) * perPage)
    slice.forEach((line, i) => ctx.fillText(line, margin, margin + i * lineH))
    pages.push(opts.grayscale ? toGrayscale(canvas) : canvas)
  }
  return pages
}

/** 纵向长图合并（PRD 3.1.2 导出模式） */
export function mergeCanvasesVertical(
  canvases: HTMLCanvasElement[],
  gapRatio = 0.01
): HTMLCanvasElement {
  if (canvases.length === 1) return canvases[0]
  const width = Math.max(...canvases.map((c) => c.width))
  const gap = Math.round(width * gapRatio)
  const height = canvases.reduce((s, c) => s + c.height, 0) + gap * (canvases.length - 1)
  const out = createCanvas(width, height)
  const ctx = out.getContext('2d')
  if (!ctx) return canvases[0]
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  let y = 0
  for (const c of canvases) {
    ctx.drawImage(c, 0, y)
    y += c.height + gap
  }
  return out
}
