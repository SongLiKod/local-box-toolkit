<template>
  <ToolPage tool-id="image-convert" notice="SVG/GIF输出取首帧；PNG/WEBP保留透明背景；自动清除EXIF。">
    <view class="lb-card">
      <button class="lb-btn lb-btn-plain" @click="pick">选择图片（可多选）</button>
      <view v-for="(f, i) in files" :key="i" class="lb-file">{{ f.name }}</view>
      <view class="lb-label">目标格式</view>
      <view class="lb-row">
        <view v-for="x in formats" :key="x" class="lb-chip" :class="{ active: format === x }" @click="format = x">
          {{ x.toUpperCase() }}
        </view>
      </view>
      <view class="lb-label">质量 {{ quality }}%</view>
      <slider v-model="quality" :min="30" :max="100" show-value />
      <button class="lb-btn" @click="run">转换</button>
      <button class="lb-btn lb-btn-plain" @click="runCompress">无损压缩</button>
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
import { convertImage, compressImages } from '@localbox/core/convert/image'
import { chooseFiles, saveBlobAs } from '../../utils/files'
import { useToolHistory } from '../../composables/useHistory'

const files = ref<File[]>([])
const results = ref<ConvertedFile[]>([])
const formats = ['jpg', 'png', 'webp', 'gif', 'bmp', 'svg'] as const
const format = ref<'jpg' | 'png' | 'webp' | 'gif' | 'bmp' | 'svg'>('png')
const quality = ref(90)
const record = useToolHistory('image-convert')

async function pick(): Promise<void> {
  try {
    const picked = await chooseFiles('.jpg,.jpeg,.png,.webp,.gif,.bmp,.svg')
    files.value = picked
    uni.showToast({
      title: picked.length ? `已选择 ${picked.length} 个文件` : '未选择文件',
      icon: 'none',
    })
  } catch {
    /* 取消 */
  }
}

async function run(): Promise<void> {
  results.value = []
  for (const f of files.value) {
    try {
      results.value.push(await convertImage(f, { format: format.value, quality: quality.value, keepRatio: true, lossless: false }))
    } catch (e) {
      uni.showToast({ title: `${f.name}: ${e instanceof Error ? e.message : String(e)}`, icon: 'none' })
    }
  }
  if (results.value.length) record('图片转换', `${results.value.length} 张 → ${format.value}`)
}

async function runCompress(): Promise<void> {
  try {
    results.value = await compressImages(files.value)
    record('图片压缩', `${results.value.length} 张`)
  } catch (e) {
    uni.showToast({ title: e instanceof Error ? e.message : String(e), icon: 'none' })
  }
}

async function saveAll(): Promise<void> {
  await saveBlobs(results.value, `localbox-pics-${Date.now()}.zip`)
}
</script>
