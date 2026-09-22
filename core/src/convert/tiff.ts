/**
 * 基线 TIFF 编码器（未压缩 RGB/灰度，小端），用于文档转图片输出 TIFF。
 */
export function encodeTiff(imageData: ImageData, dpi: number, grayscale: boolean): Blob {
  const { width, height } = imageData
  const channels = grayscale ? 1 : 3
  const px = imageData.data
  const pixelBytes = width * height * channels
  const rationalsOffset = 8 + 14 * 12 + 2 // header + ifd entries + next(0)
  const bitsOffset = rationalsOffset + 16
  const dataOffset = bitsOffset + (grayscale ? 2 : 6)

  const total = dataOffset + pixelBytes
  const buf = new ArrayBuffer(total)
  const view = new DataView(buf)
  const u8 = new Uint8Array(buf)

  let o = 2
  const u16 = (v: number): void => {
    view.setUint16(o, v, true)
    o += 2
  }
  const u32 = (v: number): void => {
    view.setUint32(o, v, true)
    o += 4
  }

  // Header
  u8[0] = 0x49
  u8[1] = 0x49 // little endian
  u16(42)
  u32(8) // IFD offset

  const entries = 12
  u16(entries)
  const entry = (tag: number, type: number, count: number, value: number): void => {
    u16(tag)
    u16(type)
    u32(count)
    u32(value)
  }
  const SHORT = 3
  const LONG = 4
  const RATIONAL = 5

  entry(256, LONG, 1, width) // ImageWidth
  entry(257, LONG, 1, height) // ImageLength
  entry(258, SHORT, channels, bitsOffset) // BitsPerSample
  entry(259, SHORT, 1, 1) // Compression = none
  entry(262, SHORT, 1, grayscale ? 1 : 2) // Photometric
  entry(273, LONG, 1, dataOffset) // StripOffsets
  entry(277, SHORT, 1, channels) // SamplesPerPixel
  entry(278, LONG, 1, height) // RowsPerStrip
  entry(279, LONG, 1, pixelBytes) // StripByteCounts
  entry(282, RATIONAL, 1, rationalsOffset) // XResolution
  entry(283, RATIONAL, 1, rationalsOffset + 8) // YResolution
  entry(296, SHORT, 1, 2) // ResolutionUnit = inch

  u16(0) // next IFD

  // Rationals
  let r = rationalsOffset
  view.setUint32(r, dpi, true)
  view.setUint32(r + 4, 1, true)
  view.setUint32(r + 8, dpi, true)
  view.setUint32(r + 12, 1, true)

  // BitsPerSample
  let b = bitsOffset
  for (let i = 0; i < channels; i++) {
    view.setUint16(b, 8, true)
    b += 2
  }

  // Pixel data
  let d = dataOffset
  if (grayscale) {
    for (let i = 0; i < px.length; i += 4) u8[d++] = px[i]
  } else {
    for (let i = 0; i < px.length; i += 4) {
      u8[d++] = px[i]
      u8[d++] = px[i + 1]
      u8[d++] = px[i + 2]
    }
  }
  return new Blob([buf], { type: 'image/tiff' })
}

/**
 * 24bit BMP 编码器（自底向上）。
 */
export function encodeBmp(imageData: ImageData): Blob {
  const { width, height } = imageData
  const px = imageData.data
  const rowBytes = width * 3
  const pad = (4 - (rowBytes % 4)) % 4
  const dataSize = (rowBytes + pad) * height
  const total = 54 + dataSize
  const buf = new ArrayBuffer(total)
  const view = new DataView(buf)
  const u8 = new Uint8Array(buf)

  u8[0] = 0x42
  u8[1] = 0x4d // "BM"
  view.setUint32(2, total, true)
  view.setUint32(10, 54, true)
  view.setUint32(14, 40, true)
  view.setInt32(18, width, true)
  view.setInt32(22, height, true)
  view.setUint16(26, 1, true)
  view.setUint16(28, 24, true)
  view.setUint32(34, dataSize, true)
  view.setInt32(38, 2835, true)
  view.setInt32(42, 2835, true)

  let o = 54
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      u8[o++] = px[i + 2]
      u8[o++] = px[i + 1]
      u8[o++] = px[i]
    }
    o += pad
  }
  return new Blob([buf], { type: 'image/bmp' })
}
