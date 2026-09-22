<template>
  <view :class="['lb-page', themeClass]">
    <view class="lb-card">
      <view class="lb-head">
        <view>
          <view class="lb-title">{{ meta?.name }}</view>
          <view class="lb-desc">{{ meta?.desc }}</view>
        </view>
        <view class="lb-fav" :class="{ on: isFav }" @click="onFav">{{ isFav ? '★' : '☆' }}</view>
      </view>
      <view v-if="notice" class="lb-notice">{{ notice }}</view>
    </view>
    <slot />
    <view class="lb-foot">
      <text class="lb-foot-text">本地处理 · 文件不上传</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toolById } from '../registry'
import { themeClass } from '../composables/useTheme'
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
  align-items: flex-start;
}
.lb-fav {
  font-size: 44rpx;
  color: var(--color-text-secondary);
  padding: 0 10rpx;
}
.lb-fav.on {
  color: var(--color-warning);
}
.lb-notice {
  margin-top: 16rpx;
  font-size: 24rpx;
  color: var(--color-warning);
  background: var(--color-primary-light);
  padding: 16rpx;
  border-radius: 12rpx;
  line-height: 1.6;
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
