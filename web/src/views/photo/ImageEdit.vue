<template>
  <div class="lb-card">
    <ToolHeader tool-id="image-edit" notice="裁剪、缩放、旋转、模糊、文字、水印、去底色，全部 Canvas 本地绘制。" />
    <FileDrop v-model="files" accept=".jpg,.jpeg,.png,.webp,.bmp,.gif" hint="上传一张图片开始编辑" />

    <div v-if="loaded" class="lb-editor">
      <div class="lb-tools">
        <div class="lb-group">
          <div class="lb-glabel">裁剪（像素）</div>
          <div class="lb-row">
            <el-input-number v-model="crop.x" :min="0" size="small" controls-position="right" style="width: 90px" />
            <el-input-number v-model="crop.y" :min="0" size="small" controls-position="right" style="width: 90px" />
            <el-input-number v-model="crop.width" :min="1" size="small" controls-position="right" style="width: 100px" />
            <el-input-number v-model="crop.height" :min="1" size="small" controls-position="right" style="width: 100px" />
            <el-button size="small" @click="doCrop">裁剪</el-button>
          </div>
        </div>
        <div class="lb-group">
          <div class="lb-glabel">缩放 / 旋转</div>
          <div class="lb-row">
            <el-input-number v-model="resize.w" :min="1" size="small" controls-position="right" style="width: 100px" />
            <span>×</span>
            <el-input-number v-model="resize.h" :min="1" size="small" controls-position="right" style="width: 100px" />
            <el-button size="small" @click="doResize">缩放</el-button>
            <el-button size="small" @click="doRotate(-90)">↺90°</el-button>
            <el-button size="small" @click="doRotate(90)">↻90°</el-button>
            <el-button size="small" @click="doRotate(180)">180°</el-button>
          </div>
        </div>
        <div class="lb-group">
          <div class="lb-glabel">模糊</div>
          <div class="lb-row">
            <el-slider v-model="blurRadius" :min="0" :max="20" style="width: 160px" />
            <el-button size="small" @click="doBlur">应用模糊</el-button>
          </div>
        </div>
        <div class="lb-group">
          <div class="lb-glabel">添加文字</div>
          <div class="lb-row">
            <el-input v-model="textStyle.text" size="small" placeholder="文字" style="width: 140px" />
            <el-input-number v-model="textStyle.fontSize" :min="8" :max="200" size="small" controls-position="right" style="width: 100px" />
            <el-color-picker v-model="textStyle.color" size="small" />
            <el-button size="small" @click="doText">添加</el-button>
          </div>
        </div>
        <div class="lb-group">
          <div class="lb-glabel">添加水印</div>
          <div class="lb-row">
            <el-input v-model="wmStyle.text" size="small" placeholder="水印文字" style="width: 140px" />
            <el-slider v-model="wmStyle.opacity" :min="0.05" :max="1" :step="0.05" style="width: 120px" />
            <el-button size="small" @click="doWatermark">平铺水印</el-button>
          </div>
        </div>
        <div class="lb-group">
          <div class="lb-glabel">去除底色（转透明）</div>
          <div class="lb-row">
            <span>容差 {{ tol }}</span>
            <el-slider v-model="tol" :min="20" :max="120" style="width: 140px" />
            <el-button size="small" @click="doRemoveBg">去底色</el-button>
          </div>
        </div>
        <div class="lb-group">
          <el-button size="small" @click="reset" :disabled="!original">重置</el-button>
          <el-button type="primary" size="small" @click="exportPng">导出PNG</el-button>
          <el-button type="primary" size="small" @click="exportJpg">导出JPG</el-button>
        </div>
      </div>
      <div class="lb-canvas-wrap">
        <canvas ref="canvasRef" class="lb-canvas"></canvas>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import ToolHeader from '../../components/ToolHeader.vue'
import FileDrop from '../../components/FileDrop.vue'
import { editorTools, mattingTools, saveBlob, loadImage, canvasToBlob } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useTool'

const files = ref<File[]>([])
const loaded = ref(false)
const canvasRef = ref<HTMLCanvasElement | null>(null)
let original: HTMLCanvasElement | null = null
const crop = reactive({ x: 0, y: 0, width: 300, height: 300 })
const resize = reactive({ w: 300, h: 300 })
const blurRadius = ref(4)
const tol = ref(60)
const textStyle = reactive({ text: 'LocalBox', x: 20, y: 20, fontSize: 28, color: '#F53F3F' })
const wmStyle = reactive({ text: 'LocalBox 本地工具箱', fontSize: 24, color: '#86909C', opacity: 0.25, gap: 40, angle: -30 })
const record = useToolHistory('image-edit')

watch(files, async (v) => {
  if (!v[0]) return
  try {
    const img = await loadImage(v[0])
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    c.getContext('2d')!.drawImage(img, 0, 0)
    original = c
    loadIntoEditor(c)
    loaded.value = true
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : String(e))
  }
})

function loadIntoEditor(source: HTMLCanvasElement): void {
  const canvas = canvasRef.value!
  canvas.width = source.width
  canvas.height = source.height
  canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
  canvas.getContext('2d')!.drawImage(source, 0, 0)
  crop.x = 0
  crop.y = 0
  crop.width = Math.min(source.width, Math.round(source.width / 2))
  crop.height = Math.min(source.height, Math.round(source.height / 2))
  resize.w = source.width
  resize.h = source.height
}

function current(): HTMLCanvasElement {
  return canvasRef.value!
}

function replaceWith(next: HTMLCanvasElement): void {
  const canvas = current()
  canvas.width = next.width
  canvas.height = next.height
  canvas.getContext('2d')!.drawImage(next, 0, 0)
}

function doCrop(): void {
  const w = Math.min(crop.width, current().width - crop.x)
  const h = Math.min(crop.height, current().height - crop.y)
  if (w <= 0 || h <= 0) {
    ElMessage.error('裁剪范围超出图片')
    return
  }
  replaceWith(editorTools.cropImage(current(), { x: crop.x, y: crop.y, width: w, height: h }))
  record('裁剪', `${w}×${h}`)
}

function doResize(): void {
  replaceWith(editorTools.resizeImage(current(), resize.w, resize.h))
  record('缩放', `${resize.w}×${resize.h}`)
}

function doRotate(deg: number): void {
  replaceWith(editorTools.rotateImage(current(), deg))
  record('旋转', `${deg}°`)
}

function doBlur(): void {
  replaceWith(editorTools.blurImage(current(), blurRadius.value))
  record('模糊', `${blurRadius.value}px`)
}

function doText(): void {
  if (!textStyle.text) return
  editorTools.drawText(current(), { ...textStyle, x: textStyle.x, y: textStyle.y })
  record('添加文字', textStyle.text)
}

function doWatermark(): void {
  if (!wmStyle.text) return
  editorTools.drawWatermark(current(), { ...wmStyle })
  record('添加水印', wmStyle.text)
}

function doRemoveBg(): void {
  const canvas = current()
  const ctx = canvas.getContext('2d')!
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const { mask } = mattingTools.matteFromEdge(data, { tolerance: tol.value, feather: 1 })
  const out = mattingTools.removeBackgroundToTransparent(data, mask)
  const next = document.createElement('canvas')
  next.width = canvas.width
  next.height = canvas.height
  next.getContext('2d')!.putImageData(out, 0, 0)
  replaceWith(next)
  record('去除底色', `容差${tol.value}`)
}

function reset(): void {
  if (original) loadIntoEditor(original)
}

async function exportPng(): Promise<void> {
  const blob = await canvasToBlob(current(), 'image/png')
  await saveBlob('edited.png', blob)
  record('导出', 'PNG')
}

async function exportJpg(): Promise<void> {
  const blob = await canvasToBlob(current(), 'image/jpeg', 0.92)
  await saveBlob('edited.jpg', blob)
  record('导出', 'JPG')
}
</script>

<style scoped>
.lb-editor {
  display: flex;
  gap: 20px;
  margin-top: 16px;
}
.lb-tools {
  width: 420px;
  flex-shrink: 0;
}
.lb-group {
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--color-border);
}
.lb-glabel {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}
.lb-canvas-wrap {
  flex: 1;
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 10px;
  background: repeating-conic-gradient(#e5e6eb 0% 25%, #fff 0% 50%) 50% / 20px 20px;
  max-height: 560px;
}
.lb-canvas {
  max-width: 100%;
  display: block;
}
</style>
