<template>
  <ToolPage tool-id="pdf-tools">
    <view class="lb-card">
      <button class="lb-btn lb-btn-plain" @click="pick">选择 PDF 文件</button>
      <view v-for="(f, i) in files" :key="i" class="lb-file">{{ f.name }}</view>
      <view class="lb-label">操作</view>
      <view class="lb-row">
        <view v-for="m in modes" :key="m.value" class="lb-chip" :class="{ active: mode === m.value }" @click="mode = m.value">
          {{ m.label }}
        </view>
      </view>
      <button class="lb-btn" @click="run">执行</button>
      <view v-if="running" class="lb-output">处理中…</view>
      <view v-for="r in results" :key="r.name" class="lb-file">
        {{ r.name }}
        <text class="lb-save" @click="saveBlobAs(r.name, r.blob)">保存</text>
      </view>
    </view>
  </ToolPage>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import { saveBlobAs, chooseFiles } from '../../utils/files'
import type { ConvertedFile } from '@localbox/core/index'
import { mergePdfs, splitPdf, compressPdf, removeWatermark } from '@localbox/core/convert/pdf'
import { useToolHistory } from '../../composables/useHistory'

const files = ref<File[]>([])
const results = ref<ConvertedFile[]>([])
const mode = ref<'merge' | 'split' | 'compress' | 'watermark'>('merge')
const running = ref(false)
const record = useToolHistory('pdf-tools')

const modes = [
  { value: 'merge', label: '合并' },
  { value: 'split', label: '拆分' },
  { value: 'compress', label: '压缩' },
  { value: 'watermark', label: '去水印' },
] as const

async function pick(): Promise<void> {
  try {
    files.value = await chooseFiles('.pdf')
  } catch {
    /* 取消 */
  }
}

async function run(): Promise<void> {
  if (!files.value.length) {
    uni.showToast({ title: '请先选择PDF', icon: 'none' })
    return
  }
  running.value = true
  results.value = []
  try {
    if (mode.value === 'merge') {
      const blob = await mergePdfs(files.value)
      results.value = [{ name: '合并结果.pdf', blob }]
    } else {
      for (const f of files.value) {
        if (mode.value === 'split') {
          results.value.push(...(await splitPdf(f)))
        } else if (mode.value === 'compress') {
          const blob = await compressPdf(f, { strong: false })
          results.value.push({ name: f.name.replace(/\.pdf$/i, '_压缩.pdf'), blob })
        } else {
          const r = await removeWatermark(f)
          results.value.push({ name: f.name.replace(/\.pdf$/i, '_去水印.pdf'), blob: r.blob })
        }
      }
    }
    record('PDF工具', mode.value)
  } catch (e) {
    uni.showToast({ title: e instanceof Error ? e.message : String(e), icon: 'none' })
  } finally {
    running.value = false
  }
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
