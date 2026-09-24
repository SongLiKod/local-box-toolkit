<template>
  <ToolPage tool-id="image-edit" notice="裁剪、缩放、旋转、模糊、文字、水印、去底色，全部 Canvas 本地绘制。">
    <view class="lb-card">
      <button class="lb-btn lb-btn-plain" @click="pick">选择图片</button>
      <view v-if="lastFile" class="lb-file">{{ lastFile.name }}</view>

      <template v-if="loaded && previewUrl">
        <image :src="previewUrl" mode="widthFix" class="lb-preview" @click="zoom" />

        <view class="lb-group">
          <view class="lb-label">裁剪（像素，当前 {{ curW }}×{{ curH }}）</view>
          <view class="lb-grid4">
            <input v-model="crop.x" type="number" class="lb-input" placeholder="X" />
            <input v-model="crop.y" type="number" class="lb-input" placeholder="Y" />
            <input v-model="crop.width" type="number" class="lb-input" placeholder="宽" />
            <input v-model="crop.height" type="number" class="lb-input" placeholder="高" />
          </view>
          <button class="lb-btn" @click="doCrop">裁剪</button>
        </view>

        <view class="lb-group">
          <view class="lb-label">缩放 / 旋转</view>
          <view class="lb-grid2">
            <input v-model="resize.w" type="number" class="lb-input" placeholder="宽" />
            <input v-model="resize.h" type="number" class="lb-input" placeholder="高" />
          </view>
          <view class="lb-row">
            <button class="lb-btn" @click="doResize">缩放</button>
          </view>
          <view class="lb-row">
            <button class="lb-btn lb-btn-plain" @click="doRotate(-90)">↺90°</button>
            <button class="lb-btn lb-btn-plain" @click="doRotate(90)">↻90°</button>
            <button class="lb-btn lb-btn-plain" @click="doRotate(180)">180°</button>
          </view>
        </view>

        <view class="lb-group">
          <view class="lb-label">模糊半径 {{ blurRadius }}</view>
          <slider v-model="blurRadius" :min="0" :max="20" show-value />
          <button class="lb-btn" @click="doBlur">应用模糊</button>
        </view>

        <view class="lb-group">
          <view class="lb-label">添加文字</view>
          <view class="lb-grid2">
            <input v-model="textStyle.text" class="lb-input" placeholder="文字内容" />
            <input v-model="textStyle.fontSize" type="number" class="lb-input" placeholder="字号" />
          </view>
          <view class="lb-chip-row">
            <view
              v-for="c in textColors"
              :key="c"
              class="lb-chip lb-chip-color"
              :class="{ active: textStyle.color === c }"
              :style="{ background: c }"
              @click="textStyle.color = c"
            ></view>
            <view class="lb-chip" @click="pickColor('text')">调色板</view>
          </view>
          <button class="lb-btn" @click="doText">添加文字</button>
        </view>

        <view class="lb-group">
          <view class="lb-label">平铺水印 · 透明度 {{ Math.round(wmOpacity * 100) }}%</view>
          <input v-model="wmStyle.text" class="lb-input" placeholder="水印文字" />
          <slider v-model="wmOpacity" :min="0.05" :max="1" :step="0.05" show-value />
          <view class="lb-chip-row">
            <view
              v-for="c in wmColors"
              :key="c"
              class="lb-chip lb-chip-color"
              :class="{ active: wmStyle.color === c }"
              :style="{ background: c }"
              @click="wmStyle.color = c"
            ></view>
            <view class="lb-chip" @click="pickColor('wm')">调色板</view>
          </view>
          <button class="lb-btn" @click="doWatermark">平铺水印</button>
        </view>

        <view class="lb-group">
          <view class="lb-label">去除底色（转透明）· 容差 {{ tol }}</view>
          <slider v-model="tol" :min="20" :max="120" show-value />
          <button class="lb-btn" @click="doRemoveBg">去底色</button>
        </view>

        <view class="lb-row">
          <button class="lb-btn lb-btn-plain" :disabled="!original" @click="reset">重置</button>
          <button class="lb-btn" @click="exportPng">导出PNG</button>
        </view>
        <view class="lb-row">
          <button class="lb-btn lb-btn-plain" @click="exportJpg">导出JPG</button>
          <button class="lb-btn lb-btn-plain" @click="zoom">放大预览</button>
        </view>
      </template>
    </view>
  </ToolPage>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import { editorTools, mattingTools, loadImage, canvasToBlob, createCanvas } from '@localbox/core/index'
import { chooseFiles, openColorPicker, saveBlobAs } from '../../utils/files'
import { useToolHistory } from '../../composables/useHistory'

const lastFile = ref<File | null>(null)
const loaded = ref(false)
const previewUrl = ref('')
const curW = ref(0)
const curH = ref(0)
let original: HTMLCanvasElement | null = null
let cur: HTMLCanvasElement | null = null

const crop = reactive({ x: '0', y: '0', width: '300', height: '300' })
const resize = reactive({ w: '300', h: '300' })
const blurRadius = ref(4)
const tol = ref(60)
const wmOpacity = ref(0.25)
const textStyle = reactive({ text: 'LocalBox', fontSize: '28', color: '#F53F3F' })
const wmStyle = reactive({ text: 'LocalBox 本地工具箱', color: '#86909C' })
const textColors = ['#F53F3F', '#1677FF', '#00B42A', '#FF7D00', '#1D2129', '#FFFFFF']
const wmColors = ['#86909C', '#FFFFFF', '#1D2129', '#1677FF']
const record = useToolHistory('image-edit')

function toast(msg: string): void {
  uni.showToast({ title: msg, icon: 'none' })
}
function num(v: string): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
function cloneOf(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = createCanvas(src.width, src.height)
  c.getContext('2d')!.drawImage(src, 0, 0)
  return c
}

/** 预览用 750px 内的 PNG（保留透明），编辑与导出始终在全尺寸画布上进行 */
function refreshPreview(): void {
  if (!cur) return
  const maxW = 750
  const scale = Math.min(1, maxW / cur.width)
  const pw = Math.max(1, Math.round(cur.width * scale))
  const ph = Math.max(1, Math.round(cur.height * scale))
  const pv = createCanvas(pw, ph)
  pv.getContext('2d')!.drawImage(cur, 0, 0, pw, ph)
  previewUrl.value = pv.toDataURL('image/png')
  curW.value = cur.width
  curH.value = cur.height
}

function loadIntoEditor(): void {
  if (!cur) return
  crop.x = '0'
  crop.y = '0'
  crop.width = String(Math.min(cur.width, Math.round(cur.width / 2)))
  crop.height = String(Math.min(cur.height, Math.round(cur.height / 2)))
  resize.w = String(cur.width)
  resize.h = String(cur.height)
  refreshPreview()
}

function replaceWith(next: HTMLCanvasElement): void {
  cur = next
  refreshPreview()
}

async function pick(): Promise<void> {
  let f: File | undefined
  try {
    f = (await chooseFiles('.jpg,.jpeg,.png,.webp,.bmp,.gif', false))[0]
  } catch {
    return
  }
  if (!f) return
  lastFile.value = f
  try {
    const img = await loadImage(f)
    const c = createCanvas(img.naturalWidth, img.naturalHeight)
    c.getContext('2d')!.drawImage(img, 0, 0)
    original = c
    cur = cloneOf(c)
    loadIntoEditor()
    loaded.value = true
  } catch (e) {
    toast(e instanceof Error ? e.message : String(e))
  }
}

function doCrop(): void {
  if (!cur) return
  const x = num(crop.x)
  const y = num(crop.y)
  const w = Math.min(num(crop.width), cur.width - x)
  const h = Math.min(num(crop.height), cur.height - y)
  if (w <= 0 || h <= 0) {
    toast('裁剪范围超出图片')
    return
  }
  replaceWith(editorTools.cropImage(cur, { x, y, width: w, height: h }))
  void record('裁剪', `${w}×${h}`)
}

function doResize(): void {
  if (!cur) return
  const w = Math.max(1, Math.round(num(resize.w)))
  const h = Math.max(1, Math.round(num(resize.h)))
  replaceWith(editorTools.resizeImage(cur, w, h))
  void record('缩放', `${w}×${h}`)
}

function doRotate(deg: number): void {
  if (!cur) return
  replaceWith(editorTools.rotateImage(cur, deg))
  void record('旋转', `${deg}°`)
}

function doBlur(): void {
  if (!cur) return
  replaceWith(editorTools.blurImage(cur, blurRadius.value))
  void record('模糊', `${blurRadius.value}px`)
}

function doText(): void {
  if (!cur || !textStyle.text) return
  editorTools.drawText(cur, {
    text: textStyle.text,
    x: 20,
    y: 20,
    fontSize: Math.max(8, num(textStyle.fontSize) || 28),
    color: textStyle.color,
  })
  refreshPreview()
  void record('添加文字', textStyle.text)
}

function doWatermark(): void {
  if (!cur || !wmStyle.text) return
  editorTools.drawWatermark(cur, {
    text: wmStyle.text,
    fontSize: 24,
    color: wmStyle.color,
    opacity: wmOpacity.value,
    gap: 40,
    angle: -30,
  })
  refreshPreview()
  void record('添加水印', wmStyle.text)
}

function doRemoveBg(): void {
  if (!cur) return
  const ctx = cur.getContext('2d')!
  const data = ctx.getImageData(0, 0, cur.width, cur.height)
  const { mask } = mattingTools.matteFromEdge(data, { tolerance: tol.value, feather: 1 })
  const out = mattingTools.removeBackgroundToTransparent(data, mask)
  const next = createCanvas(cur.width, cur.height)
  next.getContext('2d')!.putImageData(out, 0, 0)
  replaceWith(next)
  void record('去除底色', `容差${tol.value}`)
}

function reset(): void {
  if (!original) return
  cur = cloneOf(original)
  loadIntoEditor()
}

function zoom(): void {
  if (!previewUrl.value) return
  try {
    uni.previewImage({ urls: [previewUrl.value], current: previewUrl.value })
  } catch {
    toast('当前环境不支持放大预览')
  }
}

function pickColor(which: 'text' | 'wm'): void {
  const current = which === 'text' ? textStyle.color : wmStyle.color
  openColorPicker(current, (hex) => {
    if (which === 'text') textStyle.color = hex
    else wmStyle.color = hex
  })
}

async function exportPng(): Promise<void> {
  if (!cur) return
  const blob = await canvasToBlob(cur, 'image/png')
  saveBlobAs('edited.png', blob)
  void record('导出', 'PNG')
}

async function exportJpg(): Promise<void> {
  if (!cur) return
  const blob = await canvasToBlob(cur, 'image/jpeg', 0.92)
  saveBlobAs('edited.jpg', blob)
  void record('导出', 'JPG')
}
</script>

<style scoped>
.lb-preview {
  width: 100%;
  border-radius: 12rpx;
  border: 1px solid var(--color-border);
  background: repeating-conic-gradient(#e5e6eb 0% 25%, #ffffff 0% 50%) 50% / 24rpx 24rpx;
  margin-bottom: 16rpx;
}
.lb-group {
  padding-bottom: 20rpx;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 8rpx;
}
.lb-group:last-child {
  border-bottom: none;
}
.lb-grid4 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12rpx;
  margin-bottom: 12rpx;
}
.lb-grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12rpx;
  margin-bottom: 12rpx;
}
.lb-chip-color {
  width: 64rpx;
  min-height: 64rpx;
  padding: 0;
  border-radius: 999rpx;
  box-sizing: border-box;
}
</style>
