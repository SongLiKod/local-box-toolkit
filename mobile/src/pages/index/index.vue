<template>
  <view :class="['lb-page', themeClass]" :style="themeStyle">
    <view class="lb-card lb-hero">
      <view class="lb-hero-head">
        <image class="lb-hero-logo" :src="logoUrl" mode="aspectFit" />
        <view class="lb-hero-title">LocalBox 本地工具箱</view>
      </view>
      <view class="lb-desc lb-hero-desc">全部运算本地执行 · 文件不上传 · 无广告 · 基础功能无次数限制</view>
    </view>

    <view v-for="cat in CATEGORIES" :key="cat.id" class="lb-card">
      <view class="lb-cat lb-cat-head" @click="toggle(cat.id)">
        <text class="lb-cat-icon">{{ cat.icon }}</text>
        <text>{{ cat.name }}</text>
        <text class="lb-cat-count">{{ toolsOf(cat.id).length }} 个工具</text>
        <text class="lb-chev" :class="{ closed: isClosed(cat.id) }">▾</text>
      </view>
      <template v-if="!isClosed(cat.id)">
        <view v-for="t in toolsOf(cat.id)" :key="t.id" class="lb-item" @click="go(t.route)">
          <text class="lb-item-icon">{{ t.icon }}</text>
          <view class="lb-item-main">
            <view class="lb-item-name">{{ t.name }}</view>
            <view class="lb-item-desc">{{ t.desc }}</view>
          </view>
        </view>
      </template>
    </view>

    <view class="lb-card">
      <view class="lb-cat lb-cat-head" @click="toggle('other')">
        <text class="lb-cat-icon">📋</text>
        <text>其他</text>
        <text class="lb-cat-count">3 项</text>
        <text class="lb-chev" :class="{ closed: isClosed('other') }">▾</text>
      </view>
      <template v-if="!isClosed('other')">
        <view class="lb-item" @click="go('/pages/favorites')">
          <text class="lb-item-icon">⭐</text>
          <view class="lb-item-main">
            <view class="lb-item-name">我的收藏</view>
            <view class="lb-item-desc">收藏的工具直达</view>
          </view>
        </view>
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
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { CATEGORIES, TOOLS, type ToolMeta } from '../../registry'
import { themeClass, themeStyle } from '../../composables/useTheme'
import logoUrl from '../../assets/logo.png'

const COLLAPSE_KEY = 'localbox:collapse'

function readClosed(): Record<string, boolean> {
  try {
    const v = uni.getStorageSync(COLLAPSE_KEY)
    if (!v) return {}
    return typeof v === 'string' ? (JSON.parse(v) as Record<string, boolean>) : (v as Record<string, boolean>)
  } catch {
    return {}
  }
}

/** 分类模块折叠状态（true = 已折叠），持久化到本机存储 */
const closed = ref<Record<string, boolean>>(readClosed())

function isClosed(id: string): boolean {
  return !!closed.value[id]
}
function toggle(id: string): void {
  const next = { ...closed.value, [id]: !closed.value[id] }
  closed.value = next
  try {
    uni.setStorageSync(COLLAPSE_KEY, next)
  } catch {
    /* 存储失败不影响本次会话内的折叠 */
  }
}

function toolsOf(cat: string): ToolMeta[] {
  return TOOLS.filter((t) => t.category === cat)
}
function go(route: string): void {
  uni.navigateTo({ url: route })
}
</script>

<style scoped>
.lb-hero-head {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
}
.lb-hero-logo {
  width: 64rpx;
  height: 64rpx;
  flex-shrink: 0;
  margin-right: 16rpx;
}
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
/* 分类标题整行可点击：折叠/展开该模块 */
.lb-cat-head {
  min-height: 72rpx;
  padding-top: 4rpx;
  margin-bottom: 4rpx;
  transition: opacity 120ms ease;
}
.lb-cat-head:active {
  opacity: 0.6;
}
.lb-cat-count {
  margin-left: auto;
  font-size: 22rpx;
  font-weight: 400;
  color: var(--color-text-secondary);
}
.lb-chev {
  margin-left: 10rpx;
  font-size: 24rpx;
  color: var(--color-text-secondary);
  transition: transform 180ms ease;
}
.lb-chev.closed {
  transform: rotate(-90deg);
}
</style>
