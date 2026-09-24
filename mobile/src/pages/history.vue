<template>
  <view :class="['lb-page', themeClass]" :style="themeStyle">
    <view class="lb-card">
      <view class="lb-title">操作历史记录</view>
      <view class="lb-desc">保存在本机，不上传。UUID 记录可点开查看当时生成的内容。</view>
      <view class="lb-row">
        <button class="lb-btn lb-btn-plain" @click="load">刷新</button>
        <button class="lb-btn lb-btn-plain" :disabled="!rows.length" @click="clear">清空</button>
      </view>
    </view>
    <view v-if="!rows.length" class="lb-card">
      <view class="lb-desc lb-empty">暂无操作记录，去首页选个工具试试吧</view>
    </view>
    <view v-else class="lb-card">
      <view v-for="h in rows" :key="h.id" class="lb-hist" @click="open(h)">
        <view class="lb-hist-top">
          <text class="lb-hist-name">{{ h.toolName }} · {{ h.action }}</text>
          <text class="lb-hist-time">{{ formatTime(h.time) }}</text>
        </view>
        <view v-if="h.detail" class="lb-hist-detail">{{ h.detail }}</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { store } from '../store'
import { themeClass, themeStyle } from '../composables/useTheme'
import { uuidTools, type HistoryItem } from '@localbox/core/index'

const rows = ref<HistoryItem[]>([])

async function load(): Promise<void> {
  rows.value = await store.getHistory()
}

async function clear(): Promise<void> {
  await store.clearHistory()
  rows.value = []
}

function open(h: HistoryItem): void {
  if (h.toolId !== 'uuid' || h.action !== '生成UUID') return
  const payload = uuidTools.parseUuidHistory(h)
  if (!payload) {
    uni.showToast({ title: '该条记录未保存 UUID 内容', icon: 'none' })
    return
  }
  const text = payload.uuids.join('\n')
  uni.showModal({
    title: `UUID ${payload.version} × ${payload.count}`,
    content: text.length > 800 ? `${text.slice(0, 800)}\n…` : text,
    confirmText: '复制全部',
    success: (res) => {
      if (res.confirm) uni.setClipboardData({ data: payload.uuids.join('\n') })
    },
  })
}

function formatTime(t: number): string {
  const d = new Date(t)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

onMounted(() => {
  void load()
})
</script>

<style scoped>
.lb-empty {
  text-align: center;
  margin: 0;
  padding: 16rpx 0;
}
.lb-hist {
  padding: 20rpx 0;
  border-bottom: 1px solid var(--color-border);
  transition: opacity 120ms ease;
}
.lb-hist:last-child {
  border-bottom: none;
}
.lb-hist:active {
  opacity: 0.7;
}
.lb-hist-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.lb-hist-name {
  font-size: 28rpx;
  font-weight: 600;
  min-width: 0;
}
.lb-hist-time {
  font-size: 22rpx;
  color: var(--color-text-secondary);
  flex-shrink: 0;
  margin-left: 16rpx;
  white-space: nowrap;
}
.lb-hist-detail {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  margin-top: 6rpx;
  word-break: break-all;
  line-height: 1.5;
}
</style>
