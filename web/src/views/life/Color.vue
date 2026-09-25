<template>
  <div class="lb-card">
    <ToolHeader tool-id="color" />

    <div class="color-layout">
      <!-- 左：选色区 -->
      <div class="color-main">
        <div class="color-preview" :style="{ background: hex }">
          <div class="cp-body" :style="{ color: textColor }">
            <div class="cp-hex">{{ hex }}</div>
            <div class="cp-meta">{{ rgbStr }} · {{ hslStr }}</div>
            <div class="cp-demo">当前颜色上的文字示例 Aa 0123</div>
          </div>
        </div>

        <div
          class="color-sv"
          :style="svStyle"
          @pointerdown="startDrag('sv', $event)"
          @pointermove="onDrag"
          @pointerup="endDrag"
          @pointercancel="endDrag"
        >
          <span class="color-dot" :style="svDotStyle"></span>
        </div>

        <div
          class="color-hue"
          @pointerdown="startDrag('hue', $event)"
          @pointermove="onDrag"
          @pointerup="endDrag"
          @pointercancel="endDrag"
        >
          <span class="color-hue-dot" :style="hueDotStyle"></span>
        </div>

        <div class="color-fields">
          <div class="color-field">
            <div class="lb-label">HEX</div>
            <el-input v-model="hexInput" placeholder="#1677FF" @input="onHexInput" />
            <div v-if="hexError" class="color-err">{{ hexError }}</div>
          </div>
          <div class="color-field">
            <div class="lb-label">RGB</div>
            <el-input :model-value="rgbStr" readonly>
              <template #append><el-button @click="copy(rgbStr)">复制</el-button></template>
            </el-input>
          </div>
          <div class="color-field">
            <div class="lb-label">HSL</div>
            <el-input :model-value="hslStr" readonly>
              <template #append><el-button @click="copy(hslStr)">复制</el-button></template>
            </el-input>
          </div>
        </div>

        <div class="lb-row">
          <el-button type="primary" @click="copy(hex)">复制 HEX</el-button>
          <el-button @click="openNative">系统取色器</el-button>
          <el-button v-if="hasEyeDropper" @click="pickFromScreen">屏幕取色</el-button>
          <input
            ref="nativeRef"
            type="color"
            class="color-native"
            :value="hex"
            @input="onNative"
          />
        </div>
      </div>

      <!-- 右：色板 / 色阶 / 对比度 / 图片取色 -->
      <div class="color-side">
        <div class="color-panel">
          <div class="color-panel-head">常用色（点击使用）</div>
          <div class="color-swatches">
            <span
              v-for="p in presets"
              :key="p"
              class="color-chip"
              :class="{ active: p === hex }"
              :style="{ background: p }"
              :title="p"
              @click="applyHex(p)"
            ></span>
          </div>
          <div class="color-panel-sub">当前色相的相邻色</div>
          <div class="color-swatches">
            <span
              v-for="p in analogous"
              :key="p"
              class="color-chip"
              :class="{ active: p === hex }"
              :style="{ background: p }"
              :title="p"
              @click="applyHex(p)"
            ></span>
          </div>
        </div>

        <div class="color-panel">
          <div class="color-panel-head">色阶（点击复制）</div>
          <div class="color-shades">
            <div
              v-for="s in shades"
              :key="s"
              class="color-shade"
              :style="{ background: s, color: colorTools.bestTextOn(s) }"
              :title="s"
              @click="copy(s)"
            >
              {{ s }}
            </div>
          </div>
        </div>

        <div class="color-panel">
          <div class="color-panel-head">对比度（WCAG）</div>
          <div class="color-ct" :style="{ background: hex, color: '#FFFFFF' }">
            <span>白字</span>
            <span class="ct-num">{{ ratioWhite }}:1</span>
            <b class="ct-badge">{{ grade(ratioWhite) }}</b>
          </div>
          <div class="color-ct" :style="{ background: hex, color: '#000000' }">
            <span>黑字</span>
            <span class="ct-num">{{ ratioBlack }}:1</span>
            <b class="ct-badge">{{ grade(ratioBlack) }}</b>
          </div>
        </div>

        <div class="color-panel">
          <div class="color-panel-head">图片取色（移动查看像素，点击取色）</div>
          <FileDrop
            v-model="files"
            accept=".jpg,.jpeg,.png,.webp,.bmp"
            hint="上传一张图片，鼠标移动有放大镜，点击任意像素取色"
          />
          <div
            v-if="loaded"
            ref="wrapRef"
            class="color-canvas-wrap"
            @mousemove="onCanvasHover"
            @mouseleave="loupe.show = false"
          >
            <canvas ref="canvasRef" class="color-canvas" @click="pickFromCanvas"></canvas>
            <div
              v-if="loupe.show"
              class="color-loupe"
              :style="{ left: loupe.x + 'px', top: loupe.y + 'px' }"
            >
              <canvas ref="loupeRef" width="72" height="72"></canvas>
              <span>{{ loupe.hex }}</span>
            </div>
          </div>
          <div v-if="picked" class="color-picked">
            <span class="color-chip" :style="{ background: picked }"></span>
            <code>{{ picked }}</code>
            <el-button size="small" type="primary" @click="applyHex(picked)">使用此色</el-button>
            <el-button size="small" @click="copy(picked)">复制</el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import ToolHeader from '../../components/ToolHeader.vue'
import FileDrop from '../../components/FileDrop.vue'
import { colorTools, loadImage, type HSV } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useTool'

const DEFAULT = '#1677FF'
const presets = [
  '#1677FF',
  '#00B42A',
  '#FF7D00',
  '#F53F3F',
  '#F7BA1E',
  '#722ED1',
  '#13C2C2',
  '#2F54EB',
  '#EB2F96',
  '#86909C',
  '#FFFFFF',
  '#000000',
]

const hex = ref(DEFAULT)
const hexInput = ref(DEFAULT)
const hexError = ref('')
const hsv = ref<HSV>(colorTools.rgbToHsv(colorTools.hexToRgb(DEFAULT)))
const files = ref<File[]>([])
const loaded = ref(false)
const picked = ref('')
const canvasRef = ref<HTMLCanvasElement | null>(null)
const loupeRef = ref<HTMLCanvasElement | null>(null)
const wrapRef = ref<HTMLElement | null>(null)
const nativeRef = ref<HTMLInputElement | null>(null)
const loupe = ref({ show: false, x: 0, y: 0, hex: '' })
let imgData: ImageData | null = null
const record = useToolHistory('color')
let lastRec = ''

/* ---------------- 派生展示 ---------------- */
const rgb = computed(() => {
  try {
    return colorTools.hexToRgb(hex.value)
  } catch {
    return { r: 0, g: 0, b: 0 }
  }
})
const rgbStr = computed(() => colorTools.rgbString(rgb.value))
const hslStr = computed(() => {
  const h = colorTools.rgbToHsl(rgb.value)
  return `hsl(${h.h}, ${h.s}%, ${h.l}%)`
})
const shades = computed(() => {
  try {
    return colorTools.shades(hex.value, 6)
  } catch {
    return []
  }
})
/** 预览区文字色：黑白里取对比度更高的 */
const textColor = computed(() => colorTools.bestTextOn(hex.value))
const ratioWhite = computed(() => colorTools.contrastRatio(hex.value, '#FFFFFF'))
const ratioBlack = computed(() => colorTools.contrastRatio(hex.value, '#000000'))
const analogous = computed(() =>
  [-60, -30, 0, 30, 60].map((d) =>
    colorTools.rgbToHex(colorTools.hsvToRgb({ ...hsv.value, h: (hsv.value.h + d + 360) % 360 })),
  ),
)

const svStyle = computed(() => ({
  // 注意：纯颜色不能作为 background-image 的图层（非合法 <image>，整条声明会被浏览器丢弃），
  // 底色必须走 background-color，上面再叠两层渐变
  backgroundColor: `hsl(${hsv.value.h}, 100%, 50%)`,
  backgroundImage:
    'linear-gradient(to top, #000, rgba(0,0,0,0)), linear-gradient(to right, #fff, rgba(255,255,255,0))',
}))
const svDotStyle = computed(() => ({
  left: `${hsv.value.s}%`,
  top: `${100 - hsv.value.v}%`,
  background: hex.value,
}))
const hueDotStyle = computed(() => ({ left: `${hsv.value.h / 3.6}%` }))

function grade(ratio: number): string {
  if (ratio >= 7) return 'AAA'
  if (ratio >= 4.5) return 'AA'
  if (ratio >= 3) return '大字AA'
  return '不足'
}

/* ---------------- 颜色变更 ---------------- */
function rec(c: string): void {
  if (c !== lastRec) {
    lastRec = c
    void record('取色', c)
  }
}

/** 设置 HEX（fromInput = 输入框打字过程中，非法时不回写输入框） */
function applyHex(v: string, fromInput = false): boolean {
  let n = ''
  try {
    n = colorTools.normalizeHex(v)
  } catch {
    return false
  }
  hex.value = n
  hsv.value = colorTools.rgbToHsv(colorTools.hexToRgb(n))
  if (!fromInput) hexInput.value = n
  hexError.value = ''
  rec(n)
  return true
}

/** 设置 HSV（拖拽过程中不写历史，松手时统一记录） */
function applyHsv(next: HSV, commit = false): void {
  hsv.value = { h: Math.round(next.h) % 360, s: next.s, v: next.v }
  const n = colorTools.rgbToHex(colorTools.hsvToRgb(hsv.value))
  hex.value = n
  hexInput.value = n
  hexError.value = ''
  if (commit) rec(n)
}

function onHexInput(): void {
  if (!applyHex(hexInput.value, true)) {
    hexError.value = '无效 HEX，例如 #1677FF'
  }
}

/* ---------------- 拖拽选色 ---------------- */
type DragKind = 'sv' | 'hue'
const dragging = ref<DragKind | null>(null)

function startDrag(kind: DragKind, e: PointerEvent): void {
  dragging.value = kind
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  updateDrag(kind, e)
}

function onDrag(e: PointerEvent): void {
  if (!dragging.value) return
  updateDrag(dragging.value, e)
}

function endDrag(): void {
  if (!dragging.value) return
  dragging.value = null
  rec(hex.value)
}

function updateDrag(kind: DragKind, e: PointerEvent): void {
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const px = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
  const py = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
  if (kind === 'sv') {
    applyHsv({ h: hsv.value.h, s: Math.round(px * 100), v: Math.round((1 - py) * 100) })
  } else {
    applyHsv({ h: Math.round(px * 360), s: hsv.value.s, v: hsv.value.v })
  }
}

/* ---------------- 系统取色 / 屏幕取色 ---------------- */
interface EyeDropperLike {
  open(): Promise<{ sRGBHex: string }>
}
const EyeDropperCtor = (window as unknown as { EyeDropper?: new () => EyeDropperLike })
  .EyeDropper
const hasEyeDropper = Boolean(EyeDropperCtor)

function openNative(): void {
  nativeRef.value?.click()
}

function onNative(e: Event): void {
  applyHex((e.target as HTMLInputElement).value)
}

async function pickFromScreen(): Promise<void> {
  if (!EyeDropperCtor) return
  try {
    const res = await new EyeDropperCtor().open()
    applyHex(res.sRGBHex)
  } catch {
    /* 用户按 Esc 取消 */
  }
}

/* ---------------- 图片取色 ---------------- */
watch(files, async (v) => {
  if (!v[0]) return
  try {
    const img = await loadImage(v[0])
    loaded.value = true
    await nextTick()
    const c = canvasRef.value
    if (!c) return
    const scale = Math.min(1, 480 / img.naturalWidth)
    c.width = Math.round(img.naturalWidth * scale)
    c.height = Math.round(img.naturalHeight * scale)
    const ctx = c.getContext('2d')!
    ctx.drawImage(img, 0, 0, c.width, c.height)
    imgData = ctx.getImageData(0, 0, c.width, c.height)
    loupe.value.show = false
    picked.value = ''
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : String(e))
  }
})

/** 鼠标位置 → 画布像素坐标 */
function canvasPos(e: MouseEvent): { x: number; y: number } | null {
  const canvas = canvasRef.value
  if (!canvas || !imgData) return null
  const rect = canvas.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null
  const x = ((e.clientX - rect.left) / rect.width) * canvas.width
  const y = ((e.clientY - rect.top) / rect.height) * canvas.height
  return { x, y }
}

function onCanvasHover(e: MouseEvent): void {
  const pos = canvasPos(e)
  const lc = loupeRef.value
  const wrap = wrapRef.value
  if (!pos || !imgData || !lc || !wrap) return

  const h = colorTools.rgbToHex(colorTools.pickPixel(imgData, pos.x, pos.y))
  loupe.value.hex = h

  // 放大镜：以光标像素为中心画 12×12 区域
  const ctx = lc.getContext('2d')
  if (ctx) {
    const R = 6
    const cell = 72 / (R * 2)
    ctx.clearRect(0, 0, 72, 72)
    const cx = Math.max(0, Math.min(imgData.width - 1, Math.floor(pos.x)))
    const cy = Math.max(0, Math.min(imgData.height - 1, Math.floor(pos.y)))
    for (let dy = -R; dy < R; dy++) {
      for (let dx = -R; dx < R; dx++) {
        const p = colorTools.pickPixel(imgData, cx + dx, cy + dy)
        ctx.fillStyle = colorTools.rgbToHex(p)
        ctx.fillRect((dx + R) * cell, (dy + R) * cell, cell + 0.5, cell + 0.5)
      }
    }
  }

  const rect = wrap.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  loupe.value.x = Math.min(Math.max(x + 16, 0), Math.max(0, rect.width - 96))
  loupe.value.y = Math.min(Math.max(y + 16, 0), Math.max(0, rect.height - 104))
  loupe.value.show = true
}

function pickFromCanvas(e: MouseEvent): void {
  const pos = canvasPos(e)
  if (!pos || !imgData) return
  const color = colorTools.rgbToHex(colorTools.pickPixel(imgData, pos.x, pos.y))
  picked.value = color
  rec(color)
}

/* ---------------- 复制 ---------------- */
async function copy(s: string): Promise<void> {
  await navigator.clipboard.writeText(s)
  ElMessage.success('已复制')
}
</script>

<style scoped>
.color-layout {
  display: grid;
  grid-template-columns: minmax(420px, 470px) minmax(340px, 1fr);
  gap: 20px;
  align-items: start;
}
.lb-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

/* ---------- 预览 ---------- */
.color-preview {
  height: 132px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  display: flex;
  align-items: flex-end;
  padding: 14px 16px;
  margin-bottom: 14px;
  transition: background-color 120ms ease;
}
.cp-hex {
  font-family: Consolas, Monaco, monospace;
  font-size: 30px;
  font-weight: 700;
  line-height: 1.2;
}
.cp-meta {
  font-size: 13px;
  opacity: 0.9;
}
.cp-demo {
  font-size: 12px;
  opacity: 0.75;
  margin-top: 4px;
}

/* ---------- SV 面 / 色相条 ---------- */
.color-sv {
  position: relative;
  height: 200px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  cursor: crosshair;
  touch-action: none;
  background-repeat: no-repeat;
}
.color-dot {
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.35),
    0 1px 3px rgba(0, 0, 0, 0.4);
  transform: translate(-50%, -50%);
  pointer-events: none;
}
.color-hue {
  position: relative;
  height: 18px;
  border-radius: 999px;
  margin-top: 12px;
  border: 1px solid var(--color-border);
  touch-action: none;
  cursor: pointer;
  background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
}
.color-hue-dot {
  position: absolute;
  top: 50%;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.45),
    0 1px 3px rgba(0, 0, 0, 0.35);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

/* ---------- 输入 ---------- */
.color-fields {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}
.color-err {
  font-size: 12px;
  color: var(--color-error);
  margin-top: 4px;
}
.color-native {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

/* ---------- 右侧面板 ---------- */
.color-panel {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 14px;
}
.color-panel-head {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 10px;
}
.color-panel-sub {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}
.color-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.color-chip {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.14);
  cursor: pointer;
  display: inline-block;
  transition:
    transform 120ms ease,
    box-shadow 120ms ease;
}
.color-chip:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px var(--color-shadow);
}
.color-chip.active {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.color-shades {
  display: flex;
  border-radius: 8px;
  overflow: hidden;
}
.color-shade {
  flex: 1;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: Consolas, Monaco, monospace;
  font-size: 10px;
  cursor: pointer;
  transition: filter 120ms ease;
}
.color-shade:hover {
  filter: brightness(1.08);
}
.color-ct {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 8px;
}
.color-ct:last-child {
  margin-bottom: 0;
}
.ct-num {
  flex: 1;
  text-align: right;
  font-family: Consolas, Monaco, monospace;
}
.ct-badge {
  font-weight: 600;
  font-size: 12px;
  border: 1px solid currentColor;
  border-radius: 4px;
  padding: 1px 6px;
  opacity: 0.9;
}

/* ---------- 图片取色 ---------- */
.color-canvas-wrap {
  position: relative;
  margin-top: 10px;
  display: inline-block;
  max-width: 100%;
}
.color-canvas {
  display: block;
  max-width: 100%;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: crosshair;
}
.color-loupe {
  position: absolute;
  width: 72px;
  pointer-events: none;
  z-index: 5;
}
.color-loupe canvas {
  display: block;
  border: 2px solid #fff;
  border-radius: 6px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
  image-rendering: pixelated;
}
.color-loupe span {
  display: block;
  margin-top: 4px;
  background: rgba(0, 0, 0, 0.78);
  color: #fff;
  font-family: Consolas, Monaco, monospace;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  text-align: center;
}
.color-picked {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  font-size: 13px;
}
.color-picked code {
  font-family: Consolas, Monaco, monospace;
}
</style>
