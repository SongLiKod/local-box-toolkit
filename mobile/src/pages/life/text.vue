<template>
  <ToolPage tool-id="text-tool">
    <view class="lb-card">
      <view class="lb-label">输入文本</view>
      <textarea v-model="text" class="lb-input lb-textarea" placeholder="粘贴或输入文本" />
      <view class="lb-label">处理操作</view>
      <view class="lb-chip-row">
        <view v-for="o in ops" :key="o.kind" class="lb-chip" @click="op(o.kind)">{{ o.name }}</view>
        <view class="lb-chip" @click="copy">复制结果</view>
        <view class="lb-chip" @click="revert">还原</view>
      </view>
      <view class="lb-label">处理结果</view>
      <view class="lb-output">{{ result || '—' }}</view>
      <view class="lb-label">字数统计（按结果，无结果时按输入）</view>
      <view class="lb-stats">
        <view class="lb-stat">
          <view class="lb-stat-n">{{ stats.chars }}</view>
          <view class="lb-stat-l">总字符</view>
        </view>
        <view class="lb-stat">
          <view class="lb-stat-n">{{ stats.charsNoSpace }}</view>
          <view class="lb-stat-l">不含空白</view>
        </view>
        <view class="lb-stat">
          <view class="lb-stat-n">{{ stats.lines }}</view>
          <view class="lb-stat-l">行数</view>
        </view>
        <view class="lb-stat">
          <view class="lb-stat-n">{{ stats.cjkChars }}</view>
          <view class="lb-stat-l">中文字数</view>
        </view>
        <view class="lb-stat">
          <view class="lb-stat-n">{{ stats.words - stats.cjkChars }}</view>
          <view class="lb-stat-l">英文单词</view>
        </view>
        <view class="lb-stat">
          <view class="lb-stat-n">{{ stats.words }}</view>
          <view class="lb-stat-l">字词合计</view>
        </view>
      </view>
    </view>
  </ToolPage>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import { textTools } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useHistory'

const text = ref('')
const result = ref('')
const record = useToolHistory('text-tool')

const ops = [
  { kind: 'trimEnd', name: '去行尾空格' },
  { kind: 'trimAll', name: '去所有空格' },
  { kind: 'trimAllNl', name: '去空格+换行' },
  { kind: 'emptyLines', name: '去空行' },
  { kind: 'joinLines', name: '合并为一行' },
  { kind: 'trimEach', name: '去每行首尾空白' },
  { kind: 'dedupe', name: '折叠多余空格' },
] as const

const stats = computed(() => textTools.countText(result.value || text.value))

function op(kind: string): void {
  const src = result.value || text.value
  if (!src) {
    uni.showToast({ title: '请先输入文本', icon: 'none' })
    return
  }
  switch (kind) {
    case 'trimEnd':
      result.value = textTools.trimTrailingSpaces(src)
      break
    case 'trimAll':
      result.value = textTools.removeAllSpaces(src, false)
      break
    case 'trimAllNl':
      result.value = textTools.removeAllSpaces(src, true)
      break
    case 'emptyLines':
      result.value = textTools.removeEmptyLines(src)
      break
    case 'joinLines':
      result.value = textTools.joinLines(src, ' ')
      break
    case 'trimEach':
      result.value = textTools.trimEachLine(src)
      break
    case 'dedupe':
      result.value = textTools.dedupeSpaces(src)
      break
  }
  void record('文本处理', kind)
}

function revert(): void {
  result.value = ''
}

function copy(): void {
  const data = result.value || text.value
  if (!data) {
    uni.showToast({ title: '没有可复制的内容', icon: 'none' })
    return
  }
  uni.setClipboardData({ data, success: () => uni.showToast({ title: '已复制', icon: 'none' }) })
}
</script>

<style scoped>
.lb-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.lb-stat {
  flex: 0 0 calc(33.333% - 8rpx);
  box-sizing: border-box;
  background: var(--color-bg-page);
  border: 1px solid var(--color-border);
  border-radius: 12rpx;
  padding: 16rpx 8rpx;
  text-align: center;
}
.lb-stat-n {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--color-primary);
}
.lb-stat-l {
  font-size: 22rpx;
  color: var(--color-text-secondary);
  margin-top: 4rpx;
}
</style>
