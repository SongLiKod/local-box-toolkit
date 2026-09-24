<template>
  <div class="lb-card">
    <ToolHeader
      tool-id="idphoto"
      notice="人脸检测、智能抠图、背景替换、导出全部在本地 Canvas 完成，300DPI 高清无水印。"
    />
    <FileDrop v-model="files" accept=".jpg,.jpeg,.png,.webp,.bmp" hint="上传一张人像照片" />

    <div class="lb-row lb-section" style="margin-top: 16px">
      <span>尺寸</span>
      <el-select v-model="params.specId" style="width: 220px">
        <el-option v-for="s in specs" :key="s.id" :label="`${s.name}（${s.widthMm}×${s.heightMm}mm）`" :value="s.id" />
      </el-select>
      <span>背景</span>
      <el-radio-group v-model="params.bg">
        <el-radio-button value="white">白</el-radio-button>
        <el-radio-button value="blue">蓝</el-radio-button>
        <el-radio-button value="red">红</el-radio-button>
        <el-radio-button value="original">原背景</el-radio-button>
      </el-radio-group>
      <el-button type="primary" :disabled="!files.length" :loading="processing" @click="process">生成证件照</el-button>
      <el-button :disabled="!resultUrl" @click="downloadPng">导出PNG(300DPI)</el-button>
      <el-button :disabled="!resultUrl" @click="downloadJpg">导出JPG(300DPI)</el-button>
    </div>
    <div class="lb-row lb-section">
      <span>人脸占比 {{ Math.round((params.faceRatio ?? 0.55) * 100) }}%</span>
      <el-slider v-model="params.faceRatio" :min="0.35" :max="0.75" :step="0.01" style="width: 160px" />
      <span>缩放 {{ params.zoom?.toFixed(2) }}×</span>
      <el-slider v-model="params.zoom" :min="0.6" :max="1.8" :step="0.01" style="width: 140px" />
      <span>抠图容差 {{ params.tolerance }}</span>
      <el-slider v-model="params.tolerance" :min="20" :max="120" style="width: 140px" />
    </div>
    <div class="lb-row lb-section">
      <span>水平微调</span>
      <el-slider v-model="params.offsetRatioX" :min="-0.3" :max="0.3" :step="0.01" style="width: 140px" />
      <span>垂直微调</span>
      <el-slider v-model="params.offsetRatioY" :min="-0.3" :max="0.3" :step="0.01" style="width: 140px" />
    </div>

    <el-row :gutter="20" v-if="resultUrl || files.length">
      <el-col :span="10">
        <div class="lb-label">原图</div>
        <img v-if="sourceUrl" :src="sourceUrl" class="lb-img lb-zoomable" alt="原图" @click="openImageViewer(sourceUrl)" />
      </el-col>
      <el-col :span="10">
        <div class="lb-label">
          证件照预览
          <el-tag v-if="faceDetected" size="small" type="success">人脸已定位</el-tag>
          <el-tag v-else-if="processed" size="small" type="warning">未检测到人脸，已按中心裁剪</el-tag>
        </div>
        <img v-if="resultUrl" :src="resultUrl" class="lb-img lb-zoomable" alt="证件照" @click="openImageViewer(resultUrl)" />
        <div v-if="specInfo" class="lb-spec">{{ specInfo }}</div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import ToolHeader from '../../components/ToolHeader.vue'
import FileDrop from '../../components/FileDrop.vue'
import { photoSpecs, idPhotoTools, saveBlob, loadImage } from '@localbox/core/index'
import { useToolHistory, useToolParams } from '../../composables/useTool'
import { openImageViewer } from '../../composables/useImageViewer'

const specs = photoSpecs.PHOTO_SPECS
const files = ref<File[]>([])
const sourceUrl = ref('')
const resultUrl = ref('')
const processing = ref(false)
const processed = ref(false)
const faceDetected = ref(false)
let resultCanvas: HTMLCanvasElement | null = null

const { params } = useToolParams('idphoto', {
  specId: 'one-inch',
  bg: 'white' as 'white' | 'blue' | 'red' | 'original',
  faceRatio: 0.55,
  zoom: 1,
  tolerance: 60,
  offsetRatioX: 0,
  offsetRatioY: 0,
})
const record = useToolHistory('idphoto')

const specInfo = computed(() => {
  const s = specs.find((x) => x.id === params.value.specId)
  if (!s) return ''
  const px = photoSpecs.specPixelSize(s, 300)
  return `目标 ${px.width}×${px.height}px @300DPI（${s.widthMm}×${s.heightMm}mm）`
})

watch(
  files,
  async (v) => {
    revoke()
    processed.value = false
    resultUrl.value = ''
    if (v[0]) sourceUrl.value = URL.createObjectURL(v[0])
  },
  { deep: true }
)

function revoke(): void {
  if (sourceUrl.value) URL.revokeObjectURL(sourceUrl.value)
  if (resultUrl.value) URL.revokeObjectURL(resultUrl.value)
}

async function process(): Promise<void> {
  if (!files.value[0]) return
  processing.value = true
  try {
    const img = await loadImage(files.value[0])
    const spec = specs.find((s) => s.id === params.value.specId)!
    const { canvas, face } = await idPhotoTools.makeIdPhoto(img, {
      spec,
      background: params.value.bg,
      faceRatio: params.value.faceRatio,
      zoom: params.value.zoom,
      tolerance: params.value.tolerance,
      offsetRatioX: params.value.offsetRatioX,
      offsetRatioY: params.value.offsetRatioY,
    })
    if (resultCanvas) {
      resultCanvas.width = 0
      resultCanvas.height = 0
    }
    resultCanvas = canvas
    if (resultUrl.value) URL.revokeObjectURL(resultUrl.value)
    resultUrl.value = URL.createObjectURL(
      await new Promise<Blob>((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error('预览生成失败'))), 'image/png')
      )
    )
    faceDetected.value = !!face
    processed.value = true
    record('制作证件照', `${spec.name} / ${params.value.bg}底`)
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : String(e))
  } finally {
    processing.value = false
  }
}

async function downloadPng(): Promise<void> {
  if (!resultCanvas) return
  const blob = await idPhotoTools.exportIdPhoto(resultCanvas, 'png', 300)
  await saveBlob(`idphoto-300dpi.png`, blob)
  record('导出证件照', 'PNG 300DPI 无水印')
}

async function downloadJpg(): Promise<void> {
  if (!resultCanvas) return
  const blob = await idPhotoTools.exportIdPhoto(resultCanvas, 'jpg', 300)
  await saveBlob(`idphoto-300dpi.jpg`, blob)
  record('导出证件照', 'JPG 300DPI 无水印')
}

onBeforeUnmount(revoke)
</script>

<style scoped>
.lb-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}
.lb-img {
  max-width: 100%;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: #fff;
}
.lb-spec {
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
}
</style>
