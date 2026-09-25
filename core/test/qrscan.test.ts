import { describe, expect, it } from 'vitest'
import { create } from 'qrcode'
import { decodeQr, describeQrContent, parseWifiQr, renderQr } from '../src/tools/qrscan'

function noise(width: number, height: number): { data: Uint8ClampedArray; width: number; height: number } {
  const data = new Uint8ClampedArray(width * height * 4)
  let seed = 7
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 1103515245 + 12345) % 2147483648
    data[i] = seed % 256
  }
  return { data, width, height }
}

function flat(width: number, height: number, v: number): {
  data: Uint8ClampedArray
  width: number
  height: number
} {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i + 1] = data[i + 2] = v
    data[i + 3] = 255
  }
  return { data, width, height }
}

function invert(img: ReturnType<typeof renderQr>): ReturnType<typeof renderQr> {
  const data = new Uint8ClampedArray(img.data)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i]
    data[i + 1] = 255 - data[i + 1]
    data[i + 2] = 255 - data[i + 2]
  }
  return { data, width: img.width, height: img.height }
}

describe('二维码离线识别', () => {
  it('renderQr 按 scale 与静默区生成像素图', () => {
    const scale = 4
    const quiet = 4
    const img = renderQr('HELLO', { scale, quietZone: quiet })
    const size = create('HELLO').modules.size
    expect(img.width).toBe((size + quiet * 2) * scale)
    expect(img.height).toBe(img.width)
    expect(img.data.length).toBe(img.width * img.height * 4)
    // 静默区必须是白色
    expect(img.data[0]).toBe(255)
    expect(img.data[3]).toBe(255)
  })

  it('文本 → 渲染 → 识别往返成功', () => {
    const text = 'https://localbox.dev/tools?q=1&x=中文'
    const img = renderQr(text)
    const hit = decodeQr(img)
    expect(hit).not.toBeNull()
    expect(hit!.text).toBe(text)
    expect(hit!.corners).toHaveLength(4)
    for (const c of hit!.corners) {
      expect(c.x).toBeGreaterThanOrEqual(0)
      expect(c.x).toBeLessThanOrEqual(img.width)
      expect(c.y).toBeGreaterThanOrEqual(0)
      expect(c.y).toBeLessThanOrEqual(img.height)
    }
  })

  it('反色（黑底白码）也能识别', () => {
    const text = 'WIFI:T:WPA;S:mynet;P:secret;;'
    const hit = decodeQr(invert(renderQr(text, { scale: 6 })))
    expect(hit?.text).toBe(text)
  })

  it('小缩放比与多行文本仍可识别', () => {
    const text = 'line1\nline2\nline3'
    expect(decodeQr(renderQr(text, { scale: 2, quietZone: 6 }))?.text).toBe(text)
  })

  it('无码图与噪声图返回 null 而不抛错', () => {
    expect(decodeQr(flat(64, 64, 255))).toBeNull()
    expect(decodeQr(flat(64, 64, 0))).toBeNull()
    expect(decodeQr(noise(64, 64))).toBeNull()
    expect(decodeQr({ data: new Uint8ClampedArray(4), width: 0, height: 0 })).toBeNull()
    expect(decodeQr({ data: new Uint8ClampedArray(2), width: 4, height: 4 })).toBeNull()
  })

  it('内容类型识别', () => {
    expect(describeQrContent('https://a.b/c')).toEqual({
      kind: 'url',
      label: '网址',
      action: '打开链接',
    })
    expect(describeQrContent('http://a.b').kind).toBe('url')
    expect(describeQrContent('WIFI:T:WPA;S:x;;')).toEqual({ kind: 'wifi', label: '无线网络' })
    expect(describeQrContent('tel:+8613800000000')).toEqual({
      kind: 'tel',
      label: '电话',
      action: '拨打电话',
    })
    expect(describeQrContent('sms:10086').kind).toBe('sms')
    expect(describeQrContent('mailto:a@b.c').kind).toBe('email')
    expect(describeQrContent('geo:39.9,116.4').kind).toBe('geo')
    expect(describeQrContent('随便一段文字').kind).toBe('text')
    expect(describeQrContent('').kind).toBe('text')
  })

  it('WIFI 码解析（含转义与隐藏网络）', () => {
    const r = parseWifiQr('WIFI:T:WPA;S:My\\:Net;P:p\\;1\\;2;H:true;;')
    expect(r).toEqual({ ssid: 'My:Net', password: 'p;1;2', hidden: true })
    expect(parseWifiQr('WIFI:T:WPA;S:open;;')).toEqual({
      ssid: 'open',
      password: undefined,
      hidden: false,
    })
    expect(parseWifiQr('WIFI:T:nopass;')).toBeNull()
    expect(parseWifiQr('https://x.dev')).toBeNull()
    expect(parseWifiQr('')).toBeNull()
  })
})
