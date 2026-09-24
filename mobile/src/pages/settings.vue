<template>
  <view :class="['lb-page', themeClass]" :style="themeStyle">
    <view class="lb-card">
      <view class="lb-title">外观</view>
      <view class="lb-desc">主题与配色即时生效，保存在本机。</view>
      <view class="lb-label">显示模式</view>
      <view class="lb-chip-row">
        <view
          v-for="m in modes"
          :key="m.value"
          class="lb-chip"
          :class="{ active: themeMode === m.value }"
          @click="pickTheme(m.value)"
        >
          {{ m.label }}
        </view>
      </view>
      <view class="lb-label">主题配色</view>
      <view class="lb-chip-row">
        <view
          v-for="p in palettes"
          :key="p.id"
          class="lb-chip"
          :class="{ active: themePalette === p.id }"
          @click="pickPalette(p.id)"
        >
          {{ p.name }}
        </view>
      </view>
    </view>

    <view class="lb-card">
      <view class="lb-title">本地数据</view>
      <view class="lb-desc">配置保存在本机。可导出备份，换设备时手动导入。</view>
      <button class="lb-btn" @click="exportBak">导出备份</button>
      <button class="lb-btn lb-btn-plain" @click="clearHist">清空操作历史</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import {
  themeClass,
  themeStyle,
  themeMode,
  themePalette,
  setThemeMode,
  setThemePalette,
} from '../composables/useTheme'
import { THEME_PRESETS, type ThemeMode, type ThemePaletteId } from '@localbox/core/index'
import { store } from '../store'
import { saveTextAs } from '../utils/files'

const modes: Array<{ value: ThemeMode; label: string }> = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟随系统' },
]
const palettes = THEME_PRESETS

function pickTheme(m: ThemeMode): void {
  void setThemeMode(m)
}
function pickPalette(id: ThemePaletteId): void {
  void setThemePalette(id)
}

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
