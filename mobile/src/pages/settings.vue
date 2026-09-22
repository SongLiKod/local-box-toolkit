<template>
  <view :class="['lb-page', themeClass]" :style="themeStyle">
    <view class="lb-card">
      <view class="lb-title">设置</view>
      <view class="lb-desc">配置保存在本机。可导出备份，换设备时手动导入。</view>
      <button class="lb-btn" @click="exportBak">导出备份</button>
      <button class="lb-btn lb-btn-plain" @click="clearHist">清空操作历史</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { themeClass, themeStyle } from '../composables/useTheme'
import { store } from '../store'
import { saveTextAs } from '../utils/files'

async function exportBak(): Promise<void> {
  const bak = await store.exportBackup()
  saveTextAs(`localbox-backup-${Date.now()}.json`, JSON.stringify(bak, null, 2))
  uni.showToast({ title: '已导出备份', icon: 'none' })
}

async function clearHist(): Promise<void> {
  await store.clearHistory()
  uni.showToast({ title: '已清空历史', icon: 'none' })
}
</script>
