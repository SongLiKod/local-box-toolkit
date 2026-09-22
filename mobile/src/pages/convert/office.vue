<template>
  <ToolPage tool-id="office-convert" notice="旧二进制格式 doc/xls/ppt 本地解析兼容性有限，建议另存为 docx/xlsx/pptx。">
    <view class="lb-card">
      <button class="lb-btn lb-btn-plain" @click="pick">选择文件（可多选）</button>
      <view v-for="(f, i) in files" :key="i" class="lb-file">{{ f.name }}（{{ size(f.size) }}）</view>
      <view class="lb-label">转换目标</view>
      <view class="lb-row">
        <view class="lb-chip" :class="{ active: target === 'pdf' }" @click="target = 'pdf'">PDF</view>
        <view class="lb-chip" :class="{ active: target === 'txt' }" @click="target = 'txt'">TXT</view>
      </view>
      <button class="lb-btn" @click="run">开始转换</button>
      <view v-if="running" class="lb-output">处理中…</view>
      <view v-for="r in results" :key="r.name" class="lb-file">
        {{ r.name }}
        <text class="lb-save" @click="save(r)">保存</text>
      </view>
      <button v-if="results.length > 1" class="lb-btn lb-btn-plain" @click="saveAll">打包保存全部</button>
    </view>
  </ToolPage>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import { formatBytes, saveBlobs, extOf, type ConvertedFile } from '@localbox/core/index'
import { convertOffice } from '@localbox/core/convert/office2pdf'
import { chooseFiles, saveBlobAs } from '../../utils/files'
import { useToolHistory } from '../../composables/useHistory'

const files = ref<File[]>([])
const results = ref<ConvertedFile[]>([])
const target = ref<'pdf' | 'txt'>('pdf')
const running = ref(false)
const record = useToolHistory('office-convert')

async function pick(): Promise<void> {
  try {
    files.value = await chooseFiles('.docx,.doc,.xlsx,.xls,.pptx,.ppt,.pdf,.txt')
  } catch {
    /* 取消 */
  }
}

function size(n: number): string {
  return formatBytes(n)
}

async function run(): Promise<void> {
  if (!files.value.length) {
    uni.showToast({ title: '请先选择文件', icon: 'none' })
    return
  }
  running.value = true
  results.value = []
  const out: ConvertedFile[] = []
  for (const f of files.value) {
    try {
      out.push(await convertOffice(f, target.value))
    } catch (e) {
      uni.showToast({ title: `${f.name}: ${e instanceof Error ? e.message : String(e)}`, icon: 'none' })
    }
  }
  results.value = out
  running.value = false
  if (out.length) record('Office互转', `${out.length} 个 → ${target.value.toUpperCase()}`)
}

function save(r: ConvertedFile): void {
  saveBlobAs(r.name, r.blob)
}
async function saveAll(): Promise<void> {
  await saveBlobs(results.value, `localbox-office-${Date.now()}.zip`)
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
