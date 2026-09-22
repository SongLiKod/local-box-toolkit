<template>
  <div class="lb-card">
    <h2 class="lb-title">我的收藏</h2>
    <p class="lb-desc">收藏保存在本机，点击卡片直达工具。</p>
    <div class="lb-grid">
      <div v-for="t in favTools" :key="t.id" class="lb-card lb-fav-card" @click="router.push(t.route)">
        <div class="lb-fav-name">★ {{ t.name }}</div>
        <div class="lb-tool-desc">{{ t.desc }}</div>
        <el-button link type="danger" size="small" @click.stop="remove(t.id)">取消收藏</el-button>
      </div>
    </div>
    <el-empty v-if="!favTools.length" description="还没有收藏工具，在工具页点击 ☆ 收藏" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { TOOLS } from '../registry'
import { favorites, toggleFavorite } from '../composables/useFavorites'

const router = useRouter()
const favTools = computed(() => TOOLS.filter((t) => favorites.value.has(t.id)))

async function remove(id: string): Promise<void> {
  await toggleFavorite(id)
}
</script>

<style scoped>
.lb-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}
.lb-fav-card {
  cursor: pointer;
}
.lb-fav-name {
  font-weight: 600;
  color: var(--color-warning);
  margin-bottom: 6px;
}
.lb-tool-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}
</style>
