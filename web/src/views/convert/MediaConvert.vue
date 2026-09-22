<template>
  <div class="lb-card">
    <ToolHeader
      tool-id="media-convert"
      notice="音视频转换基于 FFmpeg WASM，首次使用需加载本地核心组件（无网络请求）。"
    />
    <FileDrop v-model="files" :accept="accept" hint="视频：MP4、AVI、MOV、FLV、MKV；音频：MP3、WAV、FLAC" />

    <div class="lb-row lb-section" style="margin-top: 16px">
      <el-radio-group v-model="params.kind">
        <el-radio-button value="video">视频转换/压缩</el-radio-button>
        <el-radio-button value="audio">音频转换</el-radio-button>
        <el-radio-button value="extractAudio">提取音频</el-radio-button>
      </el-radio-group>
      <el-select v-model="params.format" style="width: 120px">
        <template v-if="params.kind === 'video'">
          <el-option v-for="f in videoFormats" :key="f" :label="f.toUpperCase()" :value="f" />
        </template>
        <template v-else>
          <el-option v-for="f in audioFormats" :key="f" :label="f.toUpperCase()" :value="f" />
        </template>
      </el-select>
      <template v-if="params.kind === 'video'">
        <span>CRF {{ params.crf }}</span>
        <el-slider v-model="params.crf" :min="18" :max="40" style="width: 140px" />
        <el-input-number v-model="params.scaleWidth" :min="0" :max="7680" placeholder="宽(0=原始)" controls-position="right" style="width: 140px" />
      </template>
      <template v-else-if="params.kind === 'audio'">
        <el-select v-model="params.bitrate" style="width: 130px">
          <el-option label="128 kbps" value="128k" />
          <el-option label="192 kbps" value="192k" />
          <el-option label="256 kbps" value="256k" />
          <el-option label="320 kbps" value="320k" />
        </el-select>
      </template>
      <el-button type="primary" :disabled="!files.length" :loading="running" @click="run">
        {{ running ? '处理中…' : '开始转换' }}
      </el-button>
      <el-button v-if="results.length" @click="downloadAll">打包下载 ZIP</el-button>
    </div>

    <ProgressBar :visible="running || results.length > 0" :done="done" :total="total" :label="label" :running="running" :status="barStatus" />

    <el-table v-if="results.length" :data="results" size="small" max-height="320">
      <el-table-column prop="name" label="结果文件" show-overflow-tooltip />
      <el-table-column label="大小" width="140">
        <template #default="{ row }">{{ formatBytes(row.blob.size) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button link type="primary" @click="saveOne(row)">下载</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import ToolHeader from '../../components/ToolHeader.vue'
import FileDrop from '../../components/FileDrop.vue'
import ProgressBar from '../../components/ProgressBar.vue'
import { formatBytes, saveBlob, saveBlobs, TaskQueue } from '@localbox/core/index'
import { convertMedia, getFFmpeg, VIDEO_FORMATS, AUDIO_FORMATS, type MediaJob, type VideoFormat, type AudioFormat } from '@localbox/core/convert/media'
import { useToolHistory, useToolParams } from '../../composables/useTool'
import type { ConvertedFile } from '@localbox/core/index'

const accept = '.mp4,.avi,.mov,.flv,.mkv,.mp3,.wav,.flac'
const videoFormats = VIDEO_FORMATS
const audioFormats = AUDIO_FORMATS
const files = ref<File[]>([])
const results = ref<ConvertedFile[]>([])
const running = ref(false)
const done = ref(0)
const total = ref(0)
const label = ref('')
const barStatus = ref<'' | 'success' | 'exception' | 'warning'>('')

const { params } = useToolParams('media-convert', {
  kind: 'video' as 'video' | 'audio' | 'extractAudio',
  format: 'mp4',
  crf: 26,
  scaleWidth: 0,
  bitrate: '192k',
})
const record = useToolHistory('media-convert')
const queue = new TaskQueue(1)

async function run(): Promise<void> {
  running.value = true
  barStatus.value = ''
  results.value = []
  done.value = 0
  total.value = files.value.length
  label.value = '正在初始化 FFmpeg WASM…'
  try {
    await getFFmpeg()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : String(e))
    running.value = false
    return
  }
  const out: ConvertedFile[] = []
  const kind = params.value.kind
  const fmt = params.value.format
  const job: MediaJob =
    kind === 'video'
      ? { kind: 'video', format: fmt as VideoFormat, crf: params.value.crf, scaleWidth: params.value.scaleWidth > 0 ? params.value.scaleWidth : null }
      : kind === 'audio'
        ? { kind: 'audio', format: fmt as AudioFormat, bitrate: params.value.bitrate }
        : { kind: 'extractAudio', format: fmt as AudioFormat }
  await queue.all(
    files.value.map((f) => async (): Promise<void> => {
      try {
        const r = await convertMedia(f, job, (p) => {
          label.value = `${p.label}：${Math.round((p.done / p.total) * 100)}%`
        })
        out.push(r)
      } catch (e) {
        ElMessage.error(`${f.name}: ${e instanceof Error ? e.message : String(e)}`)
      } finally {
        done.value += 1
      }
    })
  )
  results.value = out
  running.value = false
  barStatus.value = out.length ? 'success' : 'exception'
  if (out.length) {
    record('音视频转换', `${out.length} 个文件 → ${params.value.format.toUpperCase()}`)
    ElMessage.success(`转换完成，共 ${out.length} 个文件`)
  }
}

async function saveOne(row: ConvertedFile): Promise<void> {
  await saveBlob(row.name, row.blob)
}

async function downloadAll(): Promise<void> {
  await saveBlobs(results.value, `localbox-media-${Date.now()}.zip`)
}
</script>
