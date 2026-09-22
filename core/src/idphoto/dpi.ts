/**
 * 图片 DPI 元数据写入：PNG pHYs 块 / JPEG JFIF 密度，保证导出为 300DPI 高清图片。
 */

function insertPngPhys(bytes: Uint8Array, dpi: number): Uint8Array {
  const ppm = Math.round(dpi * 39.3701) // 像素/米
  const chunk = new Uint8Array(21)
  const view = new DataView(chunk.buffer)
  view.setUint32(0, 9)
  chunk.set([0x70, 0x48, 0x59, 0x73], 4) // pHYs
  view.setUint32(8, ppm)
  view.setUint32(12, ppm)
  chunk[16] = 1 // unit = meter
  const crc = crc32(chunk.subarray(4, 17))
  view.setUint32(17, crc)
  // 插入到 IHDR 之后
  const ihdrEnd = 8 + 4 + 4 + 13 + 4
  const out = new Uint8Array(bytes.length + chunk.length)
  out.set(bytes.subarray(0, ihdrEnd), 0)
  out.set(chunk, ihdrEnd)
  out.set(bytes.subarray(ihdrEnd), ihdrEnd + chunk.length)
  return out
}

let crcTable: Uint32Array | null = null
function crc32(data: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crcTable[n] = c >>> 0
    }
  }
  let crc = 0xffffffff
  for (const b of data) crc = crcTable[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function setJpegDensity(bytes: Uint8Array, dpi: number): Uint8Array {
  // 在 SOI(FFD8) 后插入 APP0 JFIF 段
  const app0 = new Uint8Array(18)
  const view = new DataView(app0.buffer)
  app0[0] = 0xff
  app0[1] = 0xe0
  view.setUint16(2, 16)
  app0.set([0x4a, 0x46, 0x69, 0x66, 0x00], 4) // "JFIF\0"
  app0[9] = 1
  app0[10] = 1 // version 1.1
  app0[11] = 1 // units = inch
  view.setUint16(12, dpi)
  view.setUint16(14, dpi)
  app0[16] = 0
  app0[17] = 0
  const out = new Uint8Array(bytes.length + app0.length)
  out.set(bytes.subarray(0, 2), 0)
  out.set(app0, 2)
  out.set(bytes.subarray(2), 2 + app0.length)
  return out
}

export async function writeDpiToImage(
  blob: Blob,
  dpi: number,
  format: 'png' | 'jpg'
): Promise<Blob> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  try {
    if (format === 'png' && bytes[1] === 0x50) {
      return new Blob([insertPngPhys(bytes, dpi).slice()], { type: 'image/png' })
    }
    if (format === 'jpg' && bytes[0] === 0xff && bytes[1] === 0xd8) {
      return new Blob([setJpegDensity(bytes, dpi).slice()], { type: 'image/jpeg' })
    }
  } catch {
    /* 元数据写入失败不影响图片本身 */
  }
  return blob
}

export function setPngDpi(bytes: Uint8Array, dpi: number): Uint8Array {
  return insertPngPhys(bytes, dpi)
}

export function setJpegDpi(bytes: Uint8Array, dpi: number): Uint8Array {
  return setJpegDensity(bytes, dpi)
}
