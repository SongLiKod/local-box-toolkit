<template>
  <view :class="['lb-page', themeClass]" :style="themeStyle">
    <view class="lb-card">
      <view class="lb-head">
        <text class="lb-head-icon">{{ meta?.icon ?? '🛠️' }}</text>
        <view class="lb-fav" :class="{ on: isFav }" @click="onFav">{{ isFav ? '★ 已收藏' : '☆ 收藏' }}</view>
      </view>
      <view class="lb-desc lb-head-desc">{{ meta?.desc }}</view>
      <view v-if="notice" class="lb-notice">{{ notice }}</view>
    </view>
    <slot />
    <view class="lb-foot">
      <text class="lb-foot-text">🔒 本地处理 · 文件不上传</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toolById } from '../registry'
import { themeClass, themeStyle } from '../composables/useTheme'
import { store } from '../store'

const props = defineProps<{ toolId: string; notice?: string }>()
const meta = computed(() => toolById(props.toolId))
const isFav = ref(false)

async function refresh(): Promise<void> {
  try {
    isFav.value = await store.isFavorite(props.toolId)
  } catch {
    isFav.value = false
  }
}

async function onFav(): Promise<void> {
  await store.toggleFavorite(props.toolId)
  await refresh()
}

onMounted(refresh)
</script>

<style scoped>
.lb-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}
.lb-head-icon {
  font-size: 56rpx;
  line-height: 1.2;
}
.lb-fav {
  font-size: 26rpx;
  color: var(--color-text-secondary);
  /* 触控热区加大（原约 30px，偏难点） */
  padding: 20rpx 30rpx;
  margin-right: -8rpx;
  background: var(--color-bg-page);
  border: 1px solid var(--color-border);
  border-radius: 999rpx;
  transition: opacity 120ms ease;
}
.lb-fav:active {
  opacity: 0.7;
}
.lb-fav.on {
  color: var(--color-warning);
  border-color: var(--color-warning);
  background: transparent;
  font-weight: 600;
}
.lb-head-desc {
  margin-bottom: 0;
}
.lb-foot {
  text-align: center;
  padding: 20rpx 0;
}
.lb-foot-text {
  font-size: 22rpx;
  color: var(--color-text-secondary);
}
</style>
