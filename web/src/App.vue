<template>
  <el-container class="lb-app">
    <el-aside :width="asideWidth" class="lb-aside" :class="{ collapsed: navCollapsed }">
      <div class="lb-logo-row">
        <div class="lb-logo" @click="router.push('/')">
          <img src="/favicon.svg" alt="logo" />
          <span v-show="!navCollapsed">LocalBox</span>
        </div>
      </div>
      <el-scrollbar v-show="!navCollapsed">
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
        <div class="lb-header-left">
          <button
            type="button"
            class="lb-fold-btn header"
            :title="navCollapsed ? '展开导航' : '折叠导航'"
            @click="setNavCollapsed(!navCollapsed)"
          >
            <span class="lb-burger" :class="{ open: !navCollapsed }">
              <i></i><i></i><i></i>
            </span>
          </button>
          <el-input
            v-model="search"
            class="lb-search"
            placeholder="搜索工具（离线本地）"
            clearable
            @focus="router.push('/')"
          />
        </div>
        <div class="lb-header-right">
          <el-tag size="small" type="success" effect="plain">纯本地运算 · 无广告</el-tag>
          <ThemeSwitch :show-palette="true" />
        </div>
      </el-header>
      <el-main class="lb-main">
        <router-view v-slot="{ Component }">
          <component :is="Component" :search="search" />
        </router-view>
      </el-main>
    </el-container>
  </el-container>
  <ImageViewer />
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ThemeSwitch from './components/ThemeSwitch.vue'
import ImageViewer from './components/ImageViewer.vue'
import { CATEGORIES, TOOLS, type ToolMeta } from './registry'
import { favorites, loadFavorites } from './composables/useFavorites'

const NAV_KEY = 'localbox:navCollapsed'
const COLLAPSED_WIDTH = '64px'
const EXPANDED_WIDTH = '230px'

const route = useRoute()
const router = useRouter()
const search = ref('')
const navCollapsed = ref(true)
const asideWidth = computed(() => (navCollapsed.value ? COLLAPSED_WIDTH : EXPANDED_WIDTH))

function toolsOf(cat: string): ToolMeta[] {
  return TOOLS.filter((t) => t.category === cat)
}

function readNavCollapsed(): boolean {
  try {
    const raw = localStorage.getItem(NAV_KEY)
    if (raw == null) return true
    return JSON.parse(raw) !== false
  } catch {
    return true
  }
}

function setNavCollapsed(value: boolean): void {
  navCollapsed.value = value
  try {
    localStorage.setItem(NAV_KEY, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

onMounted(() => {
  navCollapsed.value = readNavCollapsed()
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
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: width 200ms ease, background-color 200ms ease;
}
.lb-aside.collapsed {
  align-items: center;
}
.lb-logo-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 10px 10px 12px;
  min-height: 60px;
}
.lb-aside.collapsed .lb-logo-row {
  padding: 14px 0 8px;
  justify-content: center;
}
.lb-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);
  cursor: pointer;
  white-space: nowrap;
}
.lb-logo img {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
}
.lb-fold-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg-page);
  color: var(--color-text-primary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.lb-fold-btn:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}
.lb-fold-btn.header {
  margin-right: 10px;
}
.lb-burger {
  width: 14px;
  height: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.lb-burger i {
  display: block;
  height: 2px;
  background: var(--color-text-primary);
  border-radius: 1px;
  transition: transform 200ms ease, opacity 200ms ease;
}
.lb-burger.open i:nth-child(1) {
  transform: translateY(5px) rotate(45deg);
}
.lb-burger.open i:nth-child(2) {
  opacity: 0;
}
.lb-burger.open i:nth-child(3) {
  transform: translateY(-5px) rotate(-45deg);
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
.lb-header-left {
  display: flex;
  align-items: center;
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
