<template>
  <ToolPage tool-id="hash">
    <view class="lb-card">
      <view class="lb-label">文本哈希</view>
      <textarea v-model="text" class="lb-input lb-textarea" placeholder="输入文本" />
      <button class="lb-btn" @click="hashStr">计算文本哈希</button>
      <button class="lb-btn lb-btn-plain" @click="pickFile">选择文件计算哈希</button>
      <view v-for="r in rows" :key="r.target" class="lb-hash">
        <view class="lb-hash-target">{{ r.target }}</view>
        <view class="lb-hash-line">MD5: {{ r.md5 }}</view>
        <view class="lb-hash-line">SHA1: {{ r.sha1 }}</view>
        <view class="lb-hash-line">SHA256: {{ r.sha256 }}</view>
        <button class="lb-btn lb-btn-plain" @click="copy(r.sha256)">复制SHA256</button>
      </view>
    </view>
  </ToolPage>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import { hashTools } from '@localbox/core/index'
import { chooseFiles } from '../../utils/files'
import { useToolHistory } from '../../composables/useHistory'

interface Row {
  target: string
  md5: string
  sha1: string
  sha256: string
}

const text = ref('')
const rows = ref<Row[]>([])
const record = useToolHistory('hash')

function hashStr(): void {
  rows.value = [
    {
      target: `文本（${text.value.length}字符）`,
      md5: hashTools.hashText('md5', text.value),
      sha1: hashTools.hashText('sha1', text.value),
      sha256: hashTools.hashText('sha256', text.value),
    },
  ]
  record('文本哈希', `MD5=${rows.value[0].md5.slice(0, 12)}…`)
}

async function pickFile(): Promise<void> {
  try {
    const files = await chooseFiles('', false)
    if (!files[0]) return
    const f = files[0]
    rows.value = [
      {
        target: f.name,
        md5: await hashTools.hashFile('md5', f),
        sha1: await hashTools.hashFile('sha1', f),
        sha256: await hashTools.hashFile('sha256', f),
      },
    ]
    record('文件哈希', f.name)
  } catch {
    /* 取消 */
  }
}

function copy(s: string): void {
  uni.setClipboardData({ data: s })
}
</script>

<style scoped>
.lb-hash {
  margin-top: 24rpx;
  border-top: 1px solid var(--color-border);
  padding-top: 16rpx;
}
.lb-hash-target {
  font-weight: 600;
  font-size: 28rpx;
  margin-bottom: 8rpx;
}
.lb-hash-line {
  font-size: 22rpx;
  word-break: break-all;
  color: var(--color-text-secondary);
  margin: 4rpx 0;
}
</style>
