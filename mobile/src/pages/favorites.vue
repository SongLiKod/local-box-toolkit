<template>
  <view :class="['lb-page', themeClass]" :style="themeStyle">
    <view class="lb-card">
      <view class="lb-title">我的收藏</view>
      <view class="lb-desc">收藏保存在本机，点击直达工具。</view>

      <view v-for="t in favTools" :key="t.id" class="lb-item" @click="go(t.route)">
        <text class="lb-item-icon">{{ t.icon }}</text>
        <view class="lb-item-main">
          <view class="lb-item-name">★ {{ t.name }}</view>
          <view class="lb-item-desc">{{ t.desc }}</view>
        </view>
        <text class="lb-fav-off" @click.stop="remove(t.id)">取消</text>
      </view>

      <view v-if="!favTools.length" class="lb-empty">
        还没有收藏工具，在工具页点击 ☆ 收藏
      </view>
      <button class="lb-btn lb-btn-plain" @click="goHome">返回首页</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { TOOLS, type ToolMeta } from '../registry'
import { store } from '../store'
import { themeClass, themeStyle } from '../composables/useTheme'

const favIds = ref<Set<string>>(new Set())

const favTools = computed<ToolMeta[]>(() => TOOLS.filter((t) => favIds.value.has(t.id)))

async function load(): Promise<void> {
  try {
    const list = await store.getFavorites()
    favIds.value = new Set(list.map((f) => f.toolId))
  } catch {
    favIds.value = new Set()
  }
}

async function remove(id: string): Promise<void> {
  await store.toggleFavorite(id)
  await load()
}

function go(route: string): void {
  uni.navigateTo({ url: route })
}
function goHome(): void {
  uni.reLaunch({ url: '/pages/index/index' })
}

void load()
onShow(() => {
  void load()
})
</script>

<style scoped>
.lb-empty {
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 26rpx;
  padding: 48rpx 0 24rpx;
}
.lb-fav-off {
  margin-left: auto;
  flex-shrink: 0;
  color: var(--color-error);
  font-size: 24rpx;
  padding: 8rpx 12rpx;
}
</style>
