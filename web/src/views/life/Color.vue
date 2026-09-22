<template>
  <div class="lb-card">
    <ToolHeader tool-id="color" />
    <el-row :gutter="24">
      <el-col :span="10">
        <div class="lb-label">颜色选择</div>
        <el-color-picker v-model="hex" size="large" show-alpha="false" @change="onPick" />
        <div class="lb-swatch" :style="{ background: hex }"></div>
        <div class="lb-section" style="margin-top: 14px">
          <div class="lb-label">HEX</div>
          <el-input v-model="hex" @change="onHex" placeholder="#1677FF" />
          <div class="lb-label" style="margin-top: 10px">RGB</div>
          <el-input :model-value="rgbStr" readonly>
            <template #append><el-button @click="copy(rgbStr)">复制</el-button></template>
          </el-input>
          <div class="lb-label" style="margin-top: 10px">HSL</div>
          <el-input :model-value="hslStr" readonly>
            <template #append><el-button @click="copy(hslStr)">复制</el-button></template>
          </el-input>
        </div>
      </el-col>
      <el-col :span="14">
        <div class="lb-label">图片取色（点击图像任意像素）</div>
        <FileDrop v-model="files" accept=".jpg,.jpeg,.png,.webp,.bmp" hint="上传一张图片，点击下方画布取色" />
        <canvas
          v-if="loaded"
          ref="canvasRef"
          class="lb-color-canvas"
          @click="pickFromCanvas"
        ></canvas>
        <div v-if="picked" class="lb-picked">
          <span class="lb-swatch-sm" :style="{ background: picked }"></span>
          取色结果：<code>{{ picked }}</code>
          <el-button link type="primary" size="small" @click="usePicked">使用此色</el-button>
        </div>
        <div class="lb-label" style="margin-top: 16px">色阶生成</div>
        <div class="lb-shades">
          <div v-for="s in shades" :key="s" class="lb-shade" :style="{ background: s }" @click="copy(s)" :title="s">
            <span>{{ s }}</span>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import ToolHeader from '../../components/ToolHeader.vue'
import FileDrop from '../../components/FileDrop.vue'
import { colorTools, loadImage } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useTool'

const hex = ref('#1677FF')
const files = ref<File[]>([])
const loaded = ref(false)
const picked = ref('')
const canvasRef = ref<HTMLCanvasElement | null>(null)
const record = useToolHistory('color')

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

function onPick(v: string | null): void {
  if (v) hex.value = v
  record('取色', hex.value)
}
function onHex(): void {
  try {
    colorTools.hexToRgb(hex.value)
  } catch {
    ElMessage.error('无效HEX')
  }
}

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
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : String(e))
  }
})

function pickFromCanvas(e: MouseEvent): void {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * canvas.width
  const y = ((e.clientY - rect.top) / rect.height) * canvas.height
  const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height)
  picked.value = colorTools.rgbToHex(colorTools.pickPixel(data, x, y))
}

function usePicked(): void {
  hex.value = picked.value
}

async function copy(s: string): Promise<void> {
  await navigator.clipboard.writeText(s)
  ElMessage.success('已复制')
}
</script>

<style scoped>
.lb-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}
.lb-swatch {
  width: 100%;
  height: 60px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  margin-top: 10px;
}
.lb-color-canvas {
  max-width: 100%;
  margin-top: 10px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: crosshair;
}
.lb-picked {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.lb-swatch-sm {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: 1px solid var(--color-border);
}
.lb-shades {
  display: flex;
  border-radius: 8px;
  overflow: hidden;
  margin-top: 6px;
}
.lb-shade {
  flex: 1;
  height: 60px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  cursor: pointer;
  font-size: 10px;
  color: #fff;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.6);
  padding-bottom: 4px;
}
</style>
