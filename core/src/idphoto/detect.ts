export interface FaceBox {
  x: number
  y: number
  width: number
  height: number
  confidence: number
}

function isSkin(r: number, g: number, b: number): boolean {
  // RGB 规则 + YCbCr 色度范围（经典肤色检测，纯本地计算，无网络模型）
  const y = 0.299 * r + 0.587 * g + 0.114 * b
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b
  const rgbRule = r > 95 && g > 40 && b > 20 && r > g && r > b && Math.max(r, g, b) - Math.min(r, g, b) > 15
  const yccRule = cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173 && y > 60
  return rgbRule && yccRule
}

/**
 * 人脸检测（启发式肤色区域定位，本地 Canvas 运算）：
 * 返回人脸/头部大致包围盒，用于证件照自动居中裁剪。
 */
export function detectFace(imageData: ImageData): FaceBox | null {
  const { width, height, data } = imageData
  const step = Math.max(1, Math.round(Math.sqrt((width * height) / 40000)))
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0
  let count = 0
  const colHits = new Map<number, number>()

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4
      if (data[i + 3] < 200) continue
      if (isSkin(data[i], data[i + 1], data[i + 2])) {
        count++
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
        const bucket = Math.floor(x / (step * 8))
        colHits.set(bucket, (colHits.get(bucket) ?? 0) + 1)
      }
    }
  }
  const total = Math.ceil(width / step) * Math.ceil(height / step)
  if (count < total * 0.015) return null

  // 取命中最密集的连续列区间，剔除零散肤色干扰（手部等）
  const bucketW = step * 8
  let bestStart = 0
  let bestScore = -1
  let curStart = 0
  let curScore = 0
  const scores = Array.from({ length: Math.ceil(width / bucketW) }, (_, b) => colHits.get(b) ?? 0)
  for (let b = 0; b < scores.length; b++) {
    if (scores[b] > 0) {
      if (curScore <= 0) curStart = b
      curScore += scores[b]
      if (curScore > bestScore) {
        bestScore = curScore
        bestStart = curStart
      }
    } else curScore = 0
  }
  let end = bestStart
  let acc = 0
  for (let b = bestStart; b < scores.length; b++) {
    acc += scores[b]
    if (scores[b] === 0 && acc > bestScore * 0.8) break
    end = b
  }
  const fx = Math.max(0, Math.min(bestStart * bucketW, width - 1))
  const fw = Math.max(1, Math.min((end - bestStart + 1) * bucketW, width - fx))
  // 纵向：在列区间内重新统计
  let fy = height
  let fBottom = 0
  for (let y = 0; y < height; y += step) {
    let hit = 0
    for (let x = fx; x < fx + fw; x += step) {
      const i = (y * width + x) * 4
      if (data[i + 3] >= 200 && isSkin(data[i], data[i + 1], data[i + 2])) hit++
    }
    if (hit > 0) {
      if (y < fy) fy = y
      if (y > fBottom) fBottom = y
    }
  }
  if (fBottom <= fy) {
    fy = minY
    fBottom = maxY
  }
  return {
    x: fx,
    y: Math.max(0, fy - step * 6),
    width: fw,
    height: Math.max(1, Math.min(fBottom - fy + step * 14, height)),
    confidence: Math.min(1, count / (total * 0.08)),
  }
}
