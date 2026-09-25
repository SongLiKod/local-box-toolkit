<template>
  <ToolPage tool-id="color">
    <view class="lb-card">
      <view class="color-preview" :style="{ background: hex }">
        <view class="cp-hex" :style="{ color: textColor }">{{ hex }}</view>
        <view class="cp-meta" :style="{ color: textColor }">{{ rgbStr }}</view>
        <view class="cp-demo" :style="{ color: textColor }">当前颜色上的文字示例 Aa 0123</view>
      </view>

      <view class="lb-label">HEX</view>
      <input v-model="hexInput" class="lb-input" placeholder="#1677FF" @blur="onHex" />

      <!-- uni 的 slider 是双参数 emit：emit('change', 拖拽事件, { value })，
           值在第二个参数里，因此这里显式接两个形参 -->
      <view class="lb-label">色相 H {{ hsv.h }}°</view>
      <slider
        class="lb-slider"
        :min="0"
        :max="360"
        :value="hsv.h"
        active-color="#f00"
        @changing="(e, extra) => onSlider('h', e, extra, false)"
        @change="(e, extra) => onSlider('h', e, extra, true)"
      />
      <view class="lb-label">饱和度 S {{ hsv.s }}%</view>
      <slider
        class="lb-slider"
        :min="0"
        :max="100"
        :value="hsv.s"
        :active-color="hex"
        @changing="(e, extra) => onSlider('s', e, extra, false)"
        @change="(e, extra) => onSlider('s', e, extra, true)"
      />
      <view class="lb-label">明度 V {{ hsv.v }}%</view>
      <slider
        class="lb-slider"
        :min="0"
        :max="100"
        :value="hsv.v"
        :active-color="hex"
        @changing="(e, extra) => onSlider('v', e, extra, false)"
        @change="(e, extra) => onSlider('v', e, extra, true)"
      />

      <view class="lb-chip-row">
        <view
          v-for="p in presets"
          :key="p"
          class="lb-chip lb-chip-color"
          :class="{ active: p === hex }"
          :style="{ background: p }"
          @click="setColor(p)"
        ></view>
        <view class="lb-chip" @click="openPalette">调色板</view>
      </view>

      <view class="lb-label">RGB / HSL</view>
      <view class="lb-output lb-out-row">
        <text>{{ rgbStr }}</text>
        <text class="lb-save" @click="copy(rgbStr)">复制</text>
      </view>
      <view class="lb-output lb-out-row">
        <text>{{ hslStr }}</text>
        <text class="lb-save" @click="copy(hslStr)">复制</text>
      </view>

      <view class="lb-label">对比度（WCAG）</view>
      <view class="color-ct" :style="{ background: hex, color: '#FFFFFF' }">
        <text>白字 {{ ratioWhite }}:1</text>
        <text class="ct-badge">{{ grade(ratioWhite) }}</text>
      </view>
      <view class="color-ct" :style="{ background: hex, color: '#000000' }">
        <text>黑字 {{ ratioBlack }}:1</text>
        <text class="ct-badge">{{ grade(ratioBlack) }}</text>
      </view>

      <view class="lb-label">图片取色（点击图片任意位置）</view>
      <button class="lb-btn lb-btn-plain" @click="pickImage">选择图片</button>
      <image v-if="imgUrl" :src="imgUrl" mode="widthFix" class="lb-pick-img" @click="pickFromImg" />
      <view v-if="picked" class="lb-output lb-out-row">
        <text class="lb-swatch-sm" :style="{ background: picked }"></text>
        <text>取色 {{ picked }}</text>
        <text class="lb-save" @click="setColor(picked)">使用此色</text>
      </view>

      <view class="lb-label">色阶（点击复制）</view>
      <view class="lb-shades">
        <view
          v-for="s in shades"
          :key="s"
          class="lb-shade"
          :style="{ background: s, color: colorTools.bestTextOn(s) }"
          @click="copy(s)"
        >
          <text class="lb-shade-t">{{ s.slice(1) }}</text>
        </view>
      </view>
    </view>
  </ToolPage>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import { colorTools, createCanvas, loadImage, type HSV } from '@localbox/core/index'
import { chooseFiles, openColorPicker } from '../../utils/files'
import { useToolHistory } from '../../composables/useHistory'

const DEFAULT = '#1677FF'
const presets = ['#1677FF', '#00B42A', '#FF7D00', '#F53F3F', '#86909C', '#FFFFFF', '#000000']

const hex = ref(DEFAULT)
const hexInput = ref(DEFAULT)
const hsv = ref<HSV>(colorTools.rgbToHsv(colorTools.hexToRgb(DEFAULT)))
const picked = ref('')
const imgUrl = ref('')
const record = useToolHistory('color')
let imgCanvas: HTMLCanvasElement | null = null
let imgData: ImageData | null = null
let lastRec = ''

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
const textColor = computed(() => colorTools.bestTextOn(hex.value))
const ratioWhite = computed(() => colorTools.contrastRatio(hex.value, '#FFFFFF'))
const ratioBlack = computed(() => colorTools.contrastRatio(hex.value, '#000000'))

function grade(ratio: number): string {
  if (ratio >= 7) return 'AAA'
  if (ratio >= 4.5) return 'AA'
  if (ratio >= 3) return '大字AA'
  return '不足'
}

function rec(c: string): void {
  if (c !== lastRec) {
    lastRec = c
    void record('取色', c)
  }
}

function applyHex(c: string, fromInput = false): boolean {
  let n = ''
  try {
    n = colorTools.normalizeHex(c)
  } catch {
    return false
  }
  hex.value = n
  hsv.value = colorTools.rgbToHsv(colorTools.hexToRgb(n))
  if (!fromInput) hexInput.value = n
  rec(n)
  return true
}

function applyHsv(next: HSV, commit = false): void {
  hsv.value = { h: Math.round(next.h) % 360, s: Math.round(next.s), v: Math.round(next.v) }
  const n = colorTools.rgbToHex(colorTools.hsvToRgb(hsv.value))
  hex.value = n
  hexInput.value = n
  if (commit) rec(n)
}

function setColor(c: string): void {
  if (!applyHex(c)) {
    uni.showToast({ title: '无效HEX', icon: 'none' })
  }
}

function onHex(): void {
  if (!applyHex(hexInput.value, true)) {
    uni.showToast({ title: '无效HEX', icon: 'none' })
    return
  }
  hexInput.value = hex.value
}

/** H/S/V 滑杆；changing 过程不写历史，change（松手）时记录 */
function onSlider(part: 'h' | 's' | 'v', e: unknown, extra: unknown, commit: boolean): void {
  const raw = pickSliderValue(e) ?? pickSliderValue(extra)
  if (raw === null) return
  applyHsv({ ...hsv.value, [part]: raw }, commit)
}

/** uni 的 slider 是双参数 emit：emit(name, 拖拽事件, { value })，值在第二参上 */
function pickSliderValue(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (!v || typeof v !== 'object') return null
  const o = v as { detail?: { value?: unknown }; value?: unknown }
  for (const c of [o.detail?.value, o.value]) {
    if (c === null || c === undefined || c === '') continue
    const n = Number(c)
    if (Number.isFinite(n)) return n
  }
  return null
}

function openPalette(): void {
  openColorPicker(hex.value, (v) => {
    applyHex(v)
  })
}

function copy(data: string): void {
  uni.setClipboardData({ data, success: () => uni.showToast({ title: '已复制', icon: 'none' }) })
}

async function pickImage(): Promise<void> {
  let f: File | undefined
  try {
    f = (await chooseFiles('.jpg,.jpeg,.png,.webp,.bmp', false))[0]
  } catch {
    return
  }
  if (!f) return
  try {
    const img = await loadImage(f)
    const scale = Math.min(1, 720 / img.naturalWidth)
    const c = createCanvas(
      Math.max(1, Math.round(img.naturalWidth * scale)),
      Math.max(1, Math.round(img.naturalHeight * scale))
    )
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    imgCanvas = c
    imgData = c.getContext('2d')!.getImageData(0, 0, c.width, c.height)
    imgUrl.value = c.toDataURL('image/png')
    uni.showToast({ title: '已加载，点击图片取色', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: e instanceof Error ? e.message : String(e), icon: 'none' })
  }
}

function pickFromImg(e: Event): void {
  const canvas = imgCanvas
  const data = imgData
  if (!canvas || !data) return
  const ev = e as MouseEvent & { offsetX?: number; offsetY?: number }
  const el = e.currentTarget as HTMLElement | null
  if (!el) return
  const rect = el.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return
  let dx: number | undefined = ev.clientX
  let dy: number | undefined = ev.clientY
  if (typeof dx !== 'number' && typeof ev.offsetX === 'number') {
    dx = ev.offsetX
    dy = ev.offsetY
  }
  if (typeof dx !== 'number' || typeof dy !== 'number') {
    uni.showToast({ title: '当前环境不支持点击取色', icon: 'none' })
    return
  }
  const x = ((dx - rect.left) / rect.width) * canvas.width
  const y = ((dy - rect.top) / rect.height) * canvas.height
  const c = colorTools.rgbToHex(colorTools.pickPixel(data, x, y))
  picked.value = c
  rec(c)
}
</script>

<style scoped>
.color-preview {
  min-height: 140rpx;
  border-radius: 12rpx;
  border: 1px solid var(--color-border);
  padding: 18rpx 20rpx;
  margin-bottom: 14rpx;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.cp-hex {
  font-size: 46rpx;
  font-weight: 700;
  font-family: Consolas, Monaco, monospace;
}
.cp-meta {
  font-size: 24rpx;
  opacity: 0.9;
}
.cp-demo {
  font-size: 22rpx;
  opacity: 0.75;
  margin-top: 6rpx;
}
.lb-slider {
  margin: 0 4rpx 6rpx;
}
.lb-out-row {
  display: flex;
  align-items: center;
}
.lb-chip-color {
  width: 64rpx;
  min-height: 64rpx;
  padding: 0;
  border-radius: 999rpx;
  box-sizing: border-box;
}
.color-ct {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14rpx 18rpx;
  border-radius: 10rpx;
  font-size: 24rpx;
  margin-bottom: 8rpx;
}
.ct-badge {
  font-size: 20rpx;
  font-weight: 600;
  border: 1px solid currentColor;
  border-radius: 6rpx;
  padding: 2rpx 10rpx;
  opacity: 0.9;
}
.lb-pick-img {
  width: 100%;
  border-radius: 12rpx;
  margin-top: 12rpx;
}
.lb-swatch-sm {
  width: 36rpx;
  height: 36rpx;
  border-radius: 8rpx;
  border: 1px solid var(--color-border);
  flex-shrink: 0;
}
.lb-shades {
  display: flex;
  gap: 8rpx;
}
.lb-shade {
  flex: 1;
  height: 88rpx;
  border-radius: 10rpx;
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.lb-shade-t {
  font-size: 20rpx;
}
</style>
