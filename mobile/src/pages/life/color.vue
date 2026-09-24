<template>
  <ToolPage tool-id="color">
    <view class="lb-card">
      <view class="lb-label">当前颜色</view>
      <view class="lb-swatch" :style="{ background: validHex ? hex : '#000000' }"></view>
      <view class="lb-label">HEX</view>
      <input v-model="hex" class="lb-input" placeholder="#1677FF" @blur="onHex" />
      <view class="lb-chip-row">
        <view
          v-for="p in presets"
          :key="p"
          class="lb-chip lb-chip-color"
          :class="{ active: normalize(hex) === p }"
          :style="{ background: p }"
          @click="setColor(p)"
        ></view>
        <view class="lb-chip" @click="openPalette">调色板</view>
      </view>

      <view class="lb-label">RGB</view>
      <view class="lb-output lb-out-row">
        <text>{{ rgbStr }}</text>
        <text class="lb-save" @click="copy(rgbStr)">复制</text>
      </view>
      <view class="lb-label">HSL</view>
      <view class="lb-output lb-out-row">
        <text>{{ hslStr }}</text>
        <text class="lb-save" @click="copy(hslStr)">复制</text>
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
          :style="{ background: s }"
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
import { colorTools, createCanvas, loadImage } from '@localbox/core/index'
import { chooseFiles, openColorPicker } from '../../utils/files'
import { useToolHistory } from '../../composables/useHistory'

const hex = ref('#1677FF')
const picked = ref('')
const imgUrl = ref('')
const presets = ['#1677FF', '#00B42A', '#FF7D00', '#F53F3F', '#86909C', '#FFFFFF', '#000000']
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
const validHex = computed(() => {
  try {
    colorTools.hexToRgb(hex.value)
    return true
  } catch {
    return false
  }
})

function normalize(c: string): string {
  return c.trim().toUpperCase()
}

function rec(c: string): void {
  if (c !== lastRec) {
    lastRec = c
    void record('取色', c)
  }
}

function setColor(c: string): void {
  hex.value = c
  rec(c)
}

function onHex(): void {
  if (!validHex.value) {
    uni.showToast({ title: '无效HEX', icon: 'none' })
    return
  }
  hex.value = colorTools.rgbToHex(colorTools.hexToRgb(hex.value))
}

function openPalette(): void {
  openColorPicker(validHex.value ? normalize(hex.value) : '#1677FF', (v) => {
    hex.value = v
    rec(v)
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
  picked.value = colorTools.rgbToHex(colorTools.pickPixel(data, x, y))
  rec(picked.value)
}
</script>

<style scoped>
.lb-swatch {
  height: 100rpx;
  border-radius: 12rpx;
  border: 1px solid var(--color-border);
  margin-bottom: 8rpx;
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
  color: #ffffff;
  text-shadow: 0 1rpx 3rpx rgba(0, 0, 0, 0.6);
}
</style>
