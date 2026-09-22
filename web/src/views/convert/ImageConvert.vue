<template>
  <div class="lb-card">
    <ToolHeader
      tool-id="image-convert"
      notice="SVG / 动图 GIF 输出仅取首帧画面；PNG、WEBP 保留透明背景，JPG/BMP/GIF 以白底合成。"
    />
    <FileDrop v-model="files" :accept="accept" hint="支持 JPG、PNG、WEBP、GIF、BMP、SVG，可批量" />

    <div class="lb-row lb-section" style="margin-top: 16px">
      <span>目标格式</span>
      <el-select v-model="params.format" style="width: 120px">
        <el-option label="JPG" value="jpg" />
        <el-option label="PNG" value="png" />
        <el-option label="WEBP" value="webp" />
        <el-option label="GIF" value="gif" />
        <el-option label="BMP" value="bmp" />
        <el-option label="SVG" value="svg" />
      </el-select>
      <span>质量 {{ params.quality }}%</span>
      <el-slider v-model="params.quality" :min="10" :max="100" style="width: 160px" />
    </div>
    <div class="lb-row lb-section">
      <el-checkbox v-model="resizeOn">自定义分辨率</el-checkbox>
      <template v-if="resizeOn">
        <el-input-number v-model="params.width" :min="1" :max="20000" placeholder="宽" controls-position="right" style="width: 120px" />
        <span>×</span>
        <el-input-number v-model="params.height" :min="1" :max="20000" placeholder="高" controls-position="right" style="width: 120px" />
        <el-checkbox v-model="params.keepRatio">等比缩放</el-checkbox>
      </template>
      <el-checkbox v-model="params.stripExif">清除 EXIF 信息</el-checkbox>
    </div>
    <div class="lb-row lb-section">
      <el-button type="primary" :disabled="!files.length" :loading="running" @click="runConvert">开始转换</el-button>
      <el-button :disabled="!files.length" :loading="running" @click="runCompress">无损压缩</el-button>
      <el-button v-if="results.length" @click="downloadAll">打包下载 ZIP</el-button>
    </div>

    <ProgressBar :visible="running || results.length > 0" :done="done" :total="total" :label="label" :running="running" :status="barStatus" />

    <div v-if="results.length" class="lb-preview-grid">
      <div v-for="r in results.slice(0, 24)" :key="r.name">
        <img v-if="!r.name.endsWith('.svg')" :src="urlOf(r)" :alt="r.name" />
        <div class="lb-preview-name">{{ r.name }}（{{ formatBytes(r.blob.size) }}）</div>
        <el-button link type="primary" size="small" @click="saveOne(r)">下载</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import ToolHeader from '../../components/ToolHeader.vue'
import FileDrop from '../../components/FileDrop.vue'
import ProgressBar from '../../components/ProgressBar.vue'
import { formatBytes, saveBlob, saveBlobs, TaskQueue } from '@localbox/core/index'
import { convertImage, compressImages } from '@localbox/core/convert/image'
import { useToolHistory, useToolParams } from '../../composables/useTool'
import type { ConvertedFile } from '@localbox/core/index'

const accept = '.jpg,.jpeg,.png,.webp,.gif,.bmp,.svg'
const files = ref<File[]>([])
const results = ref<ConvertedFile[]>([])
const running = ref(false)
const done = ref(0)
const total = ref(0)
const label = ref('')
const barStatus = ref<'' | 'success' | 'exception' | 'warning'>('')
const resizeOn = ref(false)
const urls = new Map<string, string>()

const { params } = useToolParams('image-convert', {
  format: 'png' as 'jpg' | 'png' | 'webp' | 'gif' | 'bmp' | 'svg',
  quality: 90,
  width: undefined as number | undefined,
  height: undefined as number | undefined,
  keepRatio: true,
  stripExif: true,
})
const record = useToolHistory('image-convert')
const queue = new TaskQueue(2)

function urlOf(r: ConvertedFile): string {
  let u = urls.get(r.name)
  if (!u) {
    u = URL.createObjectURL(r.blob)
    urls.set(r.name, u)
  }
  return u
}

async function runConvert(): Promise<void> {
  running.value = true
  barStatus.value = ''
  results.value.forEach((r) => {
    const u = urls.get(r.name)
    if (u) URL.revokeObjectURL(u)
  })
  urls.clear()
  results.value = []
  done.value = 0
  total.value = files.value.length
  const out: ConvertedFile[] = []
  await queue.all(
    files.value.map((f) => async (): Promise<void> => {
      try {
        const r = await convertImage(f, {
          format: params.value.format,
          quality: params.value.quality,
          width: resizeOn.value ? params.value.width ?? null : null,
          height: resizeOn.value ? params.value.height ?? null : null,
          keepRatio: params.value.keepRatio,
          lossless: false,
        })
        // Canvas 重绘天然清除 EXIF；勾选与否结果一致，保留选项供语义明确
        out.push(r)
      } catch (e) {
        ElMessage.error(`${f.name}: ${e instanceof Error ? e.message : String(e)}`)
      } finally {
        done.value += 1
        label.value = `已完成 ${done.value}/${total.value}`
      }
    })
  )
  results.value = out
  running.value = false
  barStatus.value = out.length ? 'success' : 'exception'
  if (out.length) {
    record('图片格式转换', `${out.length} 张 → ${params.value.format.toUpperCase()}${params.value.stripExif ? '（已清EXIF）' : ''}`)
    ElMessage.success(`转换完成，共 ${out.length} 张`)
  }
}

async function runCompress(): Promise<void> {
  running.value = true
  barStatus.value = ''
  try {
    const out = await compressImages(files.value, (p) => {
      done.value = p.done
      total.value = p.total
      label.value = `压缩中：${p.label}`
    })
    results.value = out
    record('图片压缩', `${out.length} 张图片`)
    ElMessage.success('压缩完成')
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : String(e))
  } finally {
    running.value = false
  }
}

async function saveOne(row: ConvertedFile): Promise<void> {
  await saveBlob(row.name, row.blob)
}

async function downloadAll(): Promise<void> {
  await saveBlobs(results.value, `localbox-pics-${Date.now()}.zip`)
}
</script>

<style scoped>
.lb-preview-name {
  font-size: 12px;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 160px;
}
</style>
