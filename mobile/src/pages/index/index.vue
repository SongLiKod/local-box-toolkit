<template>
  <view :class="['lb-page', themeClass]" :style="themeStyle">
    <view class="lb-card lb-hero">
      <view class="lb-hero-title">LocalBox 本地工具箱</view>
      <view class="lb-desc lb-hero-desc">全部运算本地执行 · 文件不上传 · 无广告 · 基础功能无次数限制</view>
    </view>

    <view v-for="cat in CATEGORIES" :key="cat.id" class="lb-card">
      <view class="lb-cat"><text class="lb-cat-icon">{{ cat.icon }}</text>{{ cat.name }}</view>
      <view v-for="t in toolsOf(cat.id)" :key="t.id" class="lb-item" @click="go(t.route)">
        <text class="lb-item-icon">{{ t.icon }}</text>
        <view class="lb-item-main">
          <view class="lb-item-name">{{ t.name }}</view>
          <view class="lb-item-desc">{{ t.desc }}</view>
        </view>
      </view>
    </view>

    <view class="lb-card">
      <view class="lb-cat">其他</view>
      <view class="lb-item" @click="go('/pages/history')">
        <text class="lb-item-icon">🕘</text>
        <view class="lb-item-main">
          <view class="lb-item-name">操作历史</view>
          <view class="lb-item-desc">查看本机操作记录</view>
        </view>
      </view>
      <view class="lb-item" @click="go('/pages/settings')">
        <text class="lb-item-icon">⚙️</text>
        <view class="lb-item-main">
          <view class="lb-item-name">设置</view>
          <view class="lb-item-desc">外观主题与本地数据</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { CATEGORIES, TOOLS, type ToolMeta } from '../../registry'
import { themeClass, themeStyle } from '../../composables/useTheme'

function toolsOf(cat: string): ToolMeta[] {
  return TOOLS.filter((t) => t.category === cat)
}
function go(route: string): void {
  uni.navigateTo({ url: route })
}
</script>

<style scoped>
.lb-hero-title {
  font-size: 40rpx;
  font-weight: 700;
}
.lb-hero-desc {
  margin-bottom: 0;
}
.lb-cat {
  display: flex;
  align-items: center;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 8rpx;
}
.lb-cat-icon {
  margin-right: 12rpx;
  font-size: 30rpx;
}
</style>
