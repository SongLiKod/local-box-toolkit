<template>
  <el-container class="lb-app">
    <el-aside width="230px" class="lb-aside">
      <div class="lb-logo" @click="router.push('/')">
        <img src="/favicon.svg" alt="logo" />
        <span>LocalBox</span>
      </div>
      <el-scrollbar>
        <nav class="lb-nav">
          <template v-for="cat in CATEGORIES" :key="cat.id">
            <div class="lb-nav-cat">{{ cat.name }}</div>
            <router-link
              v-for="t in toolsOf(cat.id)"
              :key="t.id"
              :to="t.route"
              class="lb-nav-item"
              :class="{ active: route.path === t.route }"
            >
              <span v-if="favorites.has(t.id)" class="lb-star">★</span>
              {{ t.name }}
            </router-link>
          </template>
          <div class="lb-nav-cat">其他</div>
          <router-link to="/favorites" class="lb-nav-item" :class="{ active: route.path === '/favorites' }">我的收藏</router-link>
          <router-link to="/history" class="lb-nav-item" :class="{ active: route.path === '/history' }">操作历史</router-link>
          <router-link to="/settings" class="lb-nav-item" :class="{ active: route.path === '/settings' }">设置</router-link>
        </nav>
      </el-scrollbar>
    </el-aside>
    <el-container>
      <el-header class="lb-header">
        <el-input
          v-model="search"
          class="lb-search"
          placeholder="搜索工具（离线本地）"
          clearable
          @focus="router.push('/')"
        />
        <div class="lb-header-right">
          <el-tag size="small" type="success" effect="plain">纯本地运算 · 无广告</el-tag>
          <ThemeSwitch />
        </div>
      </el-header>
      <el-main class="lb-main">
        <router-view v-slot="{ Component }">
          <component :is="Component" :search="search" />
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ThemeSwitch from './components/ThemeSwitch.vue'
import { CATEGORIES, TOOLS, type ToolMeta } from './registry'
import { favorites, loadFavorites } from './composables/useFavorites'

const route = useRoute()
const router = useRouter()
const search = ref('')

function toolsOf(cat: string): ToolMeta[] {
  return TOOLS.filter((t) => t.category === cat)
}

onMounted(() => {
  void loadFavorites()
})
</script>

<style scoped>
.lb-app {
  min-height: 100vh;
  min-width: 1200px;
}
.lb-aside {
  background: var(--color-bg-card);
  border-right: 1px solid var(--color-border);
  transition: background-color 200ms ease;
}
.lb-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 20px;
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);
  cursor: pointer;
}
.lb-logo img {
  width: 28px;
  height: 28px;
}
.lb-nav {
  padding: 0 10px 20px;
}
.lb-nav-cat {
  font-size: 12px;
  color: var(--color-text-secondary);
  padding: 14px 10px 6px;
}
.lb-nav-item {
  display: block;
  padding: 9px 12px;
  border-radius: 6px;
  color: var(--color-text-primary);
  text-decoration: none;
  font-size: 14px;
  transition: background-color 200ms ease;
}
.lb-nav-item:hover {
  background: var(--color-primary-light);
}
.lb-nav-item.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 600;
}
.lb-star {
  color: var(--color-warning);
  margin-right: 4px;
}
.lb-header {
  background: var(--color-bg-card);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: background-color 200ms ease;
}
.lb-search {
  width: 320px;
}
.lb-header-right {
  display: flex;
  align-items: center;
  gap: 14px;
}
.lb-main {
  background: var(--color-bg-page);
  transition: background-color 200ms ease;
}
</style>
