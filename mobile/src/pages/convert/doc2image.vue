<template>
  <ToolPage tool-id="doc2image" notice="Word保留段落表格图片，Excel保留边框，PPT还原页面；本地渲染。">
    <view class="lb-card">
      <button class="lb-btn lb-btn-plain" @click="pick">选择文档</button>
      <view v-for="(f, i) in files" :key="i" class="lb-file">{{ f.name }}</view>
      <view class="lb-label">输出格式</view>
      <view class="lb-row">
        <view v-for="x in formats" :key="x" class="lb-chip" :class="{ active: format === x }" @click="format = x">
          {{ x.toUpperCase() }}
        </view>
      </view>
      <view class="lb-label">DPI</view>
      <view class="lb-row">
        <view v-for="d in [72, 150, 300]" :key="d" class="lb-chip" :class="{ active: dpi === d }" @click="dpi = d">
          {{ d }}
        </view>
      </view>
      <view class="lb-label">色彩 / 导出</view>
      <view class="lb-row">
        <view class="lb-chip" :class="{ active: color === 'color' }" @click="color = 'color'">彩色</view>
        <view class="lb-chip" :class="{ active: color === 'gray' }" @click="color = 'gray'">灰度</view>
        <view class="lb-chip" :class="{ active: mode === 'pages' }" @click="mode = 'pages'">分页</view>
        <view class="lb-chip" :class="{ active: mode === 'long' }" @click="mode = 'long'">长图</view>
      </view>
      <view class="lb-label">质量 {{ quality }}%</view>
      <slider v-model="quality" :min="30" :max="100" show-value />
      <button class="lb-btn" @click="run">开始转换</button>
      <view v-if="running" class="lb-output">{{ label }}</view>
      <view v-for="r in results" :key="r.name" class="lb-file">
        {{ r.name }}
        <text class="lb-save" @click="saveBlobAs(r.name, r.blob)">保存</text>
      </view>
      <button v-if="results.length > 1" class="lb-btn lb-btn-plain" @click="saveAll">打包保存全部</button>
    </view>
  </ToolPage>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import { saveBlobs, type ConvertedFile } from '@localbox/core/index'
import { fileToImages } from '@localbox/core/convert/toImage'
import { chooseFiles, saveBlobAs } from '../../utils/files'
import { useToolHistory } from '../../composables/useHistory'

const files = ref<File[]>([])
const results = ref<ConvertedFile[]>([])
const formats = ['jpg', 'png', 'webp', 'tiff'] as const
const format = ref<'jpg' | 'png' | 'webp' | 'tiff'>('jpg')
const dpi = ref<72 | 150 | 300>(150)
const color = ref<'color' | 'gray'>('color')
const mode = ref<'pages' | 'long'>('pages')
const quality = ref(90)
const running = ref(false)
const label = ref('')
const record = useToolHistory('doc2image')

async function pick(): Promise<void> {
  try {
    files.value = await chooseFiles('.docx,.xlsx,.xls,.pptx,.pdf')
  } catch {
    /* 取消 */
  }
}

async function run(): Promise<void> {
  if (!files.value.length) {
    uni.showToast({ title: '请先选择文档', icon: 'none' })
    return
  }
  running.value = true
  results.value = []
  const out: ConvertedFile[] = []
  for (const f of files.value) {
    try {
      label.value = `转换中：${f.name}`
      out.push(...(await fileToImages(f, {
        dpi: dpi.value,
        color: color.value,
        format: format.value,
        mode: mode.value,
        quality: quality.value,
      })))
    } catch (e) {
      uni.showToast({ title: `${f.name}: ${e instanceof Error ? e.message : String(e)}`, icon: 'none' })
    }
  }
  results.value = out
  running.value = false
  if (out.length) record('转图片', `${out.length} 张 @${dpi.value}DPI`)
}

async function saveAll(): Promise<void> {
  await saveBlobs(results.value, `localbox-images-${Date.now()}.zip`)
}
</script>

<style scoped>
.lb-file {
  font-size: 24rpx;
  padding: 12rpx 0;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
}
.lb-save {
  color: var(--color-primary);
}
</style>
