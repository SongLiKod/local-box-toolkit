<template>
  <ToolPage tool-id="exif" notice="本地 Canvas 重编码剥离全部元数据，图片不上传。">
    <view class="lb-card">
      <button class="lb-btn lb-btn-plain" @click="pick">选择图片（可多选）</button>
      <view v-for="(f, i) in files" :key="i" class="lb-file">{{ f.name }}</view>
      <button class="lb-btn" :disabled="!files.length || running" @click="run">清除 EXIF</button>
      <view v-if="running" class="lb-label">处理中 {{ done }}/{{ total }}…</view>
      <view v-for="(r, i) in results" :key="i" class="lb-file">
        {{ r.name }}（{{ formatBytes(r.blob.size) }}）
        <text class="lb-save" @click="saveBlobAs(r.name, r.blob)">保存</text>
      </view>
      <button v-if="results.length > 1" class="lb-btn lb-btn-plain" @click="saveAll">
        打包保存全部
      </button>
    </view>
  </ToolPage>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import { formatBytes, saveBlobs, type ConvertedFile } from '@localbox/core/index'
import { clearExif } from '@localbox/core/convert/image'
import { chooseFiles, saveBlobAs } from '../../utils/files'
import { useToolHistory } from '../../composables/useHistory'

const files = ref<File[]>([])
const results = ref<ConvertedFile[]>([])
const running = ref(false)
const done = ref(0)
const total = ref(0)
const record = useToolHistory('exif')

async function pick(): Promise<void> {
  try {
    files.value = await chooseFiles('.jpg,.jpeg,.png,.webp')
    results.value = []
  } catch {
    /* 取消选择 */
  }
}

async function run(): Promise<void> {
  if (!files.value.length) {
    uni.showToast({ title: '请先选择图片', icon: 'none' })
    return
  }
  running.value = true
  results.value = []
  done.value = 0
  total.value = files.value.length
  const out: ConvertedFile[] = []
  for (const f of files.value) {
    try {
      out.push(...(await clearExif([f])))
    } catch (e) {
      uni.showToast({ title: `${f.name}: ${e instanceof Error ? e.message : String(e)}`, icon: 'none' })
    } finally {
      done.value += 1
    }
  }
  results.value = out
  running.value = false
  if (out.length) {
    void record('清除EXIF', `${out.length} 张`)
    uni.showToast({ title: `已处理 ${out.length} 张`, icon: 'none' })
  }
}

function saveAll(): void {
  void saveBlobs(results.value, `localbox-exif-${Date.now()}.zip`)
}
</script>
