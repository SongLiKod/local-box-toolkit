import JSZip from 'jszip'
import { createCanvas, loadImage } from '../files'

const EMU_PER_INCH = 914400

export interface PptxParsed {
  slideCount: number
  widthEmu: number
  heightEmu: number
  render: (dpi: number) => Promise<HTMLCanvasElement[]>
}

function localEls(node: Element, name: string): Element[] {
  const out: Element[] = []
  const walk = (n: Element): void => {
    for (let i = 0; i < n.children.length; i++) {
      const c = n.children[i]
      if (c.localName === name) out.push(c)
      walk(c)
    }
  }
  walk(node)
  return out
}

function directEls(node: Element, name: string): Element[] {
  return Array.from(node.children).filter((c) => c.localName === name)
}

function solidColor(spPr: Element | undefined): string | null {
  if (!spPr) return null
  const fills = localEls(spPr, 'solidFill')
  for (const f of fills) {
    const srgb = localEls(f, 'srgbClr')[0]
    if (srgb) {
      const v = srgb.getAttribute('val')
      if (v && /^[0-9a-fA-F]{6}$/.test(v)) return `#${v}`
    }
  }
  return null
}

interface SlideShape {
  x: number
  y: number
  w: number
  h: number
  fill: string | null
  paragraphs: Array<{ text: string; sizePt: number; bold: boolean; color: string | null }>
  imageRel?: string
}

function parseSlide(xml: Document): SlideShape[] {
  const shapes: SlideShape[] = []
  const sps = Array.from(xml.getElementsByTagName('*')).filter((e) => e.localName === 'sp')
  const pics = Array.from(xml.getElementsByTagName('*')).filter((e) => e.localName === 'pic')

  for (const sp of sps) {
    const spPr = directEls(sp, 'spPr')[0]
    const xfrm = spPr ? localEls(spPr, 'xfrm')[0] : undefined
    const off = xfrm ? localEls(xfrm, 'off')[0] : undefined
    const ext = xfrm ? localEls(xfrm, 'ext')[0] : undefined
    const txBody = directEls(sp, 'txBody')[0]
    if (!off || !ext || !txBody) continue
    const paragraphs: SlideShape['paragraphs'] = []
    for (const p of directEls(txBody, 'p')) {
      let text = ''
      let sizePt = 18
      let bold = false
      let color: string | null = null
      for (const r of Array.from(p.children)) {
        if (r.localName === 'br') {
          text += '\n'
          continue
        }
        if (r.localName !== 'r') continue
        const rPr = directEls(r, 'rPr')[0]
        if (rPr) {
          const sz = rPr.getAttribute('sz')
          if (sz) sizePt = parseInt(sz, 10) / 100
          const b = rPr.getAttribute('b')
          if (b === '1') bold = true
          const sf = localEls(rPr, 'solidFill')[0]
          if (sf) {
            const srgb = localEls(sf, 'srgbClr')[0]
            if (srgb) {
              const v = srgb.getAttribute('val')
              if (v && /^[0-9a-fA-F]{6}$/.test(v)) color = `#${v}`
            }
          }
        }
        for (const t of localEls(r, 't')) text += t.textContent ?? ''
      }
      if (text.trim().length > 0) paragraphs.push({ text, sizePt, bold, color })
    }
    if (paragraphs.length === 0 && !solidColor(spPr)) continue
    shapes.push({
      x: parseInt(off.getAttribute('x') ?? '0', 10),
      y: parseInt(off.getAttribute('y') ?? '0', 10),
      w: parseInt(ext.getAttribute('cx') ?? '0', 10),
      h: parseInt(ext.getAttribute('cy') ?? '0', 10),
      fill: solidColor(spPr),
      paragraphs,
    })
  }

  for (const pic of pics) {
    const spPr = directEls(pic, 'spPr')[0]
    const xfrm = spPr ? localEls(spPr, 'xfrm')[0] : undefined
    const off = xfrm ? localEls(xfrm, 'off')[0] : undefined
    const ext = xfrm ? localEls(xfrm, 'ext')[0] : undefined
    const blip = localEls(pic, 'blip')[0]
    if (!off || !ext || !blip) continue
    const embed =
      blip.getAttribute('r:embed') ||
      blip.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed')
    if (!embed) continue
    shapes.push({
      x: parseInt(off.getAttribute('x') ?? '0', 10),
      y: parseInt(off.getAttribute('y') ?? '0', 10),
      w: parseInt(ext.getAttribute('cx') ?? '0', 10),
      h: parseInt(ext.getAttribute('cy') ?? '0', 10),
      fill: null,
      paragraphs: [],
      imageRel: embed,
    })
  }
  return shapes
}

/**
 * pptx 解析与渲染：本地解析 OOXML（JSZip + DOMParser），还原幻灯片页面到 Canvas。
 * ppt 旧二进制格式兼容性有限，直接给出提示（PRD 3.1.1 备注）。
 */
export async function parsePptx(file: File): Promise<PptxParsed> {
  if (file.name.toLowerCase().endsWith('.ppt')) {
    throw new Error('旧二进制格式 .ppt 前端本地解析兼容性有限，请在 Office/WPS 中另存为 .pptx 后重试')
  }
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const presXml = zip.file('ppt/presentation.xml')
  if (!presXml) throw new Error('无效的 pptx 文件：缺少 presentation.xml')
  const presDoc = new DOMParser().parseFromString(await presXml.async('string'), 'application/xml')
  const sldSz = localEls(presDoc.documentElement, 'sldSz')[0]
  const widthEmu = parseInt(sldSz?.getAttribute('cx') ?? String(10 * EMU_PER_INCH), 10)
  const heightEmu = parseInt(sldSz?.getAttribute('cy') ?? String(7.5 * EMU_PER_INCH), 10)

  const slideNames = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => parseInt(a.match(/\d+/)?.[0] ?? '0', 10) - parseInt(b.match(/\d+/)?.[0] ?? '0', 10))
  if (slideNames.length === 0) throw new Error('无效的 pptx 文件：没有幻灯片')

  const slides: SlideShape[][] = []
  const relsList: Array<Record<string, string>> = []
  for (const name of slideNames) {
    const doc = new DOMParser().parseFromString(await zip.file(name)!.async('string'), 'application/xml')
    slides.push(parseSlide(doc))
    const rel: Record<string, string> = {}
    const relsPath = `ppt/slides/_rels/${name.split('/').pop()}.rels`
    const relsFile = zip.file(relsPath)
    if (relsFile) {
      const rdoc = new DOMParser().parseFromString(await relsFile.async('string'), 'application/xml')
      for (const r of Array.from(rdoc.getElementsByTagName('*')).filter((e) => e.localName === 'Relationship')) {
        const id = r.getAttribute('Id')
        const target = r.getAttribute('Target')
        if (id && target) rel[id] = target.replace(/^\.\.\//, 'ppt/')
      }
    }
    relsList.push(rel)
  }

  const render = async (dpi: number): Promise<HTMLCanvasElement[]> => {
    const scale = dpi / EMU_PER_INCH
    const out: HTMLCanvasElement[] = []
    for (let i = 0; i < slides.length; i++) {
      const canvas = createCanvas(widthEmu * scale, heightEmu * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('无法创建Canvas上下文')
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      for (const shape of slides[i]) {
        const x = shape.x * scale
        const y = shape.y * scale
        const w = shape.w * scale
        const h = shape.h * scale
        if (shape.fill) {
          ctx.fillStyle = shape.fill
          ctx.fillRect(x, y, w, h)
        }
        if (shape.imageRel) {
          const target = relsList[i][shape.imageRel]
          const mf = target ? zip.file(target) : null
          if (mf) {
            try {
              const blob = await mf.async('blob')
              const img = await loadImage(blob)
              ctx.drawImage(img, x, y, w, h)
              continue
            } catch {
              /* 图片解码失败则跳过 */
            }
          }
        }
        if (shape.paragraphs.length > 0) {
          let ty = y + h * 0.12
          for (const para of shape.paragraphs) {
            const px = (para.sizePt * dpi) / 72
            ctx.font = `${para.bold ? 'bold ' : ''}${px}px "Microsoft YaHei", "PingFang SC", sans-serif`
            ctx.fillStyle = para.color ?? '#1D2129'
            const lines = wrapText(ctx, para.text, Math.max(w - px * 0.5, px))
            for (const line of lines) {
              if (ty > y + h) break
              ctx.fillText(line, x + px * 0.25, ty)
              ty += px * 1.25
            }
          }
        }
      }
      out.push(canvas)
    }
    return out
  }

  return { slideCount: slides.length, widthEmu, heightEmu, render }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const result: string[] = []
  for (const hard of text.split('\n')) {
    let line = ''
    for (const ch of hard) {
      if (ctx.measureText(line + ch).width > maxWidth && line.length > 0) {
        result.push(line)
        line = ch
      } else line += ch
    }
    result.push(line)
  }
  return result
}
