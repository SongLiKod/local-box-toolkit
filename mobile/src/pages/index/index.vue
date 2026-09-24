<template>
  <view :class="['lb-page', themeClass]" :style="themeStyle">
    <view class="lb-card lb-hero">
      <view class="lb-hero-title">LocalBox 本地工具箱</view>
      <view class="lb-desc">全部运算本地执行 · 文件不上传 · 无广告 · 基础功能无次数限制</view>
      <view class="lb-theme-row">
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
      <view class="lb-theme-row">
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

    <view v-for="cat in CATEGORIES" :key="cat.id" class="lb-card">
      <view class="lb-cat">{{ cat.name }}</view>
      <view
        v-for="t in toolsOf(cat.id)"
        :key="t.id"
        class="lb-item"
        @click="go(t.route)"
      >
        <view class="lb-item-name">{{ t.name }}</view>
        <view class="lb-item-desc">{{ t.desc }}</view>
      </view>
    </view>

    <view class="lb-card">
      <view class="lb-cat">其他</view>
      <view class="lb-item" @click="go('/pages/history')">
        <view class="lb-item-name">操作历史</view>
        <view class="lb-item-desc">查看本机操作记录</view>
      </view>
      <view class="lb-item" @click="go('/pages/settings')">
        <view class="lb-item-name">设置</view>
        <view class="lb-item-desc">主题与本地数据</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { CATEGORIES, TOOLS, type ToolMeta } from '../../registry'
import { themeClass, themeStyle, themeMode, themePalette, setThemeMode, setThemePalette } from '../../composables/useTheme'
import { THEME_PRESETS, type ThemeMode, type ThemePaletteId } from '@localbox/core/index'

const modes: Array<{ value: ThemeMode; label: string }> = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟随系统' },
]
const palettes = THEME_PRESETS

function toolsOf(cat: string): ToolMeta[] {
  return TOOLS.filter((t) => t.category === cat)
}
function go(route: string): void {
  uni.navigateTo({ url: route })
}
function pickTheme(m: ThemeMode): void {
  void setThemeMode(m)
}
function pickPalette(id: ThemePaletteId): void {
  void setThemePalette(id)
}
</script>

<style scoped>
.lb-hero-title {
  font-size: 40rpx;
  font-weight: 700;
}
.lb-theme-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 16rpx;
}
.lb-cat {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 12rpx;
}
.lb-item {
  padding: 20rpx 0;
  border-bottom: 1px solid var(--color-border);
}
.lb-item:last-child {
  border-bottom: none;
}
.lb-item-name {
  font-size: 30rpx;
  font-weight: 500;
}
.lb-item-desc {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  margin-top: 4rpx;
}
</style>
