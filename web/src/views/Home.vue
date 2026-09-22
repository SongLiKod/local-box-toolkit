<template>
  <div>
    <div class="lb-hero">
      <h1>LocalBox 本地工具箱</h1>
      <p>一站式本地工具平台 · 全部运算本地执行 · 文件不上传服务器 · 无广告 · 基础功能无次数限制</p>
    </div>
    <template v-for="cat in CATEGORIES" :key="cat.id">
      <h3 class="lb-cat-title">{{ cat.name }}</h3>
      <div class="lb-grid">
        <div
          v-for="t in filtered(cat.id)"
          :key="t.id"
          class="lb-card lb-tool-card"
          @click="router.push(t.route)"
        >
          <div class="lb-tool-name">
            {{ t.name }}
            <span v-if="favorites.has(t.id)" class="lb-star">★</span>
          </div>
          <div class="lb-tool-desc">{{ t.desc }}</div>
        </div>
      </div>
    </template>
    <el-empty v-if="!hasResult" description="没有匹配的工具" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { CATEGORIES, TOOLS, searchTools, type ToolMeta } from '../registry'
import { favorites } from '../composables/useFavorites'

const props = defineProps<{ search?: string }>()
const router = useRouter()

const result = computed<ToolMeta[]>(() =>
  props.search ? searchTools(props.search) : TOOLS
)
const hasResult = computed(() => result.value.length > 0)

function filtered(cat: string): ToolMeta[] {
  return result.value.filter((t) => t.category === cat)
}
</script>

<style scoped>
.lb-hero {
  margin-bottom: 20px;
}
.lb-hero h1 {
  margin: 0 0 6px;
  font-size: 26px;
}
.lb-hero p {
  margin: 0;
  color: var(--color-text-secondary);
}
.lb-cat-title {
  margin: 22px 0 10px;
  font-size: 15px;
  color: var(--color-text-secondary);
  font-weight: 600;
}
.lb-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}
.lb-tool-card {
  cursor: pointer;
  transition: box-shadow 200ms ease, transform 200ms ease;
}
.lb-tool-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px var(--color-shadow);
  border-color: var(--color-primary);
}
.lb-tool-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 6px;
}
.lb-tool-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}
.lb-star {
  color: var(--color-warning);
  margin-left: 6px;
}
</style>
