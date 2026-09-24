<template>
  <ToolPage tool-id="media-convert" notice="基于 FFmpeg WASM 本地转换，首次加载核心组件。">
    <view class="lb-card">
      <button class="lb-btn lb-btn-plain" @click="pick">选择音视频文件</button>
      <view v-for="(f, i) in files" :key="i" class="lb-file">{{ f.name }}</view>
      <view class="lb-label">任务</view>
      <view class="lb-row">
        <view class="lb-chip" :class="{ active: kind === 'video' }" @click="kind = 'video'">视频转换</view>
        <view class="lb-chip" :class="{ active: kind === 'audio' }" @click="kind = 'audio'">音频转换</view>
        <view class="lb-chip" :class="{ active: kind === 'extractAudio' }" @click="kind = 'extractAudio'">提取音频</view>
      </view>
      <view class="lb-label">输出格式</view>
      <view class="lb-row">
        <view v-for="x in currentFormats" :key="x" class="lb-chip" :class="{ active: format === x }" @click="format = x">
          {{ x.toUpperCase() }}
        </view>
      </view>
      <view v-if="kind === 'video'" class="lb-label">CRF {{ crf }}（越小越清晰）</view>
      <slider v-if="kind === 'video'" v-model="crf" :min="18" :max="40" show-value />
      <button class="lb-btn" @click="run">开始转换</button>
      <view v-if="running" class="lb-output">{{ label }}</view>
      <view v-for="r in results" :key="r.name" class="lb-file">
        {{ r.name }}
        <text class="lb-save" @click="saveBlobAs(r.name, r.blob)">保存</text>
      </view>
    </view>
  </ToolPage>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import type { ConvertedFile } from '@localbox/core/index'
import { convertMedia, getFFmpeg, VIDEO_FORMATS, AUDIO_FORMATS, type MediaJob } from '@localbox/core/convert/media'
import { chooseFiles, saveBlobAs } from '../../utils/files'
import { useToolHistory } from '../../composables/useHistory'

const files = ref<File[]>([])
const results = ref<ConvertedFile[]>([])
const kind = ref<'video' | 'audio' | 'extractAudio'>('video')
const format = ref('mp4')
const crf = ref(26)
const running = ref(false)
const label = ref('')
const record = useToolHistory('media-convert')

const currentFormats = computed(() => (kind.value === 'video' ? [...VIDEO_FORMATS] : [...AUDIO_FORMATS]))

async function pick(): Promise<void> {
  try {
    files.value = await chooseFiles('.mp4,.avi,.mov,.flv,.mkv,.mp3,.wav,.flac')
  } catch {
    /* 取消 */
  }
}

async function run(): Promise<void> {
  if (!files.value.length) {
    uni.showToast({ title: '请先选择文件', icon: 'none' })
    return
  }
  running.value = true
  results.value = []
  label.value = '初始化 FFmpeg WASM…'
  try {
    await getFFmpeg()
    const job: MediaJob =
      kind.value === 'video'
        ? { kind: 'video', format: format.value as 'mp4', crf: crf.value, scaleWidth: null }
        : kind.value === 'audio'
          ? { kind: 'audio', format: format.value as 'mp3', bitrate: '192k' }
          : { kind: 'extractAudio', format: format.value as 'mp3' }
    for (const f of files.value) {
      label.value = `转换中：${f.name}`
      results.value.push(await convertMedia(f, job, (p) => {
        label.value = `${p.label}：${Math.round((p.done / p.total) * 100)}%`
      }))
    }
    record('音视频转换', `${results.value.length} 个`)
  } catch (e) {
    uni.showToast({ title: e instanceof Error ? e.message : String(e), icon: 'none' })
  } finally {
    running.value = false
    label.value = ''
  }
}
</script>


