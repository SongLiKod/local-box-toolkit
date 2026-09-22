import { describe, expect, it } from 'vitest'
import { encodeTiff, encodeBmp } from '../src/convert/tiff'

function fakeImageData(w: number, h: number): ImageData {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 10
    data[i + 1] = 120
    data[i + 2] = 240
    data[i + 3] = 255
  }
  return { data, width: w, height: h, colorSpace: 'srgb' } as ImageData
}

describe('TIFF 编码', () => {
  it('小端基线 TIFF 头正确', async () => {
    const blob = encodeTiff(fakeImageData(2, 2), 300, false)
    const buf = new Uint8Array(await blob.arrayBuffer())
    expect(buf[0]).toBe(0x49)
    expect(buf[1]).toBe(0x49)
    const view = new DataView(buf.buffer)
    expect(view.getUint16(2, true)).toBe(42)
    expect(view.getUint32(4, true)).toBe(8)
  })
  it('灰度模式 Photometric=1', async () => {
    const blob = encodeTiff(fakeImageData(2, 2), 300, true)
    const buf = new Uint8Array(await blob.arrayBuffer())
    const view = new DataView(buf.buffer)
    expect(view.getUint16(8, true)).toBe(12)
  })
})

describe('BMP 编码', () => {
  it('BM 头与尺寸', async () => {
    const blob = encodeBmp(fakeImageData(3, 2))
    const buf = new Uint8Array(await blob.arrayBuffer())
    expect(String.fromCharCode(buf[0], buf[1])).toBe('BM')
    const view = new DataView(buf.buffer)
    expect(view.getInt32(18, true)).toBe(3)
    expect(view.getInt32(22, true)).toBe(2)
    expect(view.getUint16(28, true)).toBe(24)
  })
})
