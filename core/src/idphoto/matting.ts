export interface MattingOptions {
  /** 背景色距离容差 0~255 */
  tolerance: number
  /** 边缘羽化半径 px */
  feather: number
}

function dist4(
  d: Uint8ClampedArray,
  i: number,
  r: number,
  g: number,
  b: number
): number {
  const dr = d[i] - r
  const dg = d[i + 1] - g
  const db = d[i + 2] - b
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

/**
 * 智能抠图（本地 Canvas 运算）：
 * 从图像边缘泛洪填充识别连续背景区域，生成前景 alpha 掩码。
 * 适用于纯色/近纯色背景证件照，配合背景替换使用。
 */
export function matteFromEdge(
  imageData: ImageData,
  opts: MattingOptions
): { mask: Uint8Array; backgroundEstimated: [number, number, number] } {
  const { width, height, data } = imageData
  const mask = new Uint8Array(width * height) // 0=背景, 255=前景
  // 边缘平均色作为背景色估计
  let br = 0
  let bg = 0
  let bb = 0
  let bn = 0
  const sampleEdge = (x: number, y: number): void => {
    const i = (y * width + x) * 4
    br += data[i]
    bg += data[i + 1]
    bb += data[i + 2]
    bn++
  }
  for (let x = 0; x < width; x += 2) {
    sampleEdge(x, 0)
    sampleEdge(x, height - 1)
  }
  for (let y = 0; y < height; y += 2) {
    sampleEdge(0, y)
    sampleEdge(width - 1, y)
  }
  const base: [number, number, number] = [br / bn, bg / bn, bb / bn]
  const tol = Math.max(1, opts.tolerance)

  const visited = new Uint8Array(width * height)
  const stack: number[] = []
  const pushIf = (p: number): void => {
    if (p < 0 || p >= width * height || visited[p]) return
    const i = p * 4
    if (data[i + 3] < 10 || dist4(data, i, base[0], base[1], base[2]) <= tol) {
      visited[p] = 1
      mask[p] = 0
      stack.push(p)
    } else {
      visited[p] = 2 // 前景
      mask[p] = 255
    }
  }
  for (let x = 0; x < width; x++) {
    pushIf(x)
    pushIf((height - 1) * width + x)
  }
  for (let y = 0; y < height; y++) {
    pushIf(y * width)
    pushIf(y * width + width - 1)
  }
  while (stack.length > 0) {
    const p = stack.pop() as number
    const x = p % width
    const y = (p - x) / width
    if (x > 0) pushIf(p - 1)
    if (x < width - 1) pushIf(p + 1)
    if (y > 0) pushIf(p - width)
    if (y < height - 1) pushIf(p + width)
  }

  // 羽化：对掩码做简单均值模糊
  const f = Math.max(0, Math.round(opts.feather))
  if (f > 0) {
    let cur = mask
    for (let k = 0; k < f; k++) {
      const next = new Uint8Array(cur.length)
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let s = 0
          let c = 0
          for (let dy = -1; dy <= 1; dy++) {
            const yy = y + dy
            if (yy < 0 || yy >= height) continue
            for (let dx = -1; dx <= 1; dx++) {
              const xx = x + dx
              if (xx < 0 || xx >= width) continue
              s += cur[yy * width + xx]
              c++
            }
          }
          next[y * width + x] = Math.round(s / c)
        }
      }
      cur = next
    }
    mask.set(cur)
  }
  return { mask, backgroundEstimated: base }
}

/** 将前景合成到新背景色上 */
export function compositeBackground(
  imageData: ImageData,
  mask: Uint8Array,
  bg: [number, number, number]
): ImageData {
  const { width, height, data } = imageData
  const out = new ImageData(width, height)
  const d = out.data
  for (let p = 0; p < width * height; p++) {
    const i = p * 4
    const a = mask[p] / 255
    d[i] = Math.round(data[i] * a + bg[0] * (1 - a))
    d[i + 1] = Math.round(data[i + 1] * a + bg[1] * (1 - a))
    d[i + 2] = Math.round(data[i + 2] * a + bg[2] * (1 - a))
    d[i + 3] = 255
  }
  return out
}

/** 去除底色（透明背景输出）：掩码为背景的区域 alpha 置 0 */
export function removeBackgroundToTransparent(imageData: ImageData, mask: Uint8Array): ImageData {
  const out = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height)
  for (let p = 0; p < mask.length; p++) {
    out.data[p * 4 + 3] = mask[p]
  }
  return out
}
