<template>
  <el-container class="lb-app">
    <el-aside :width="asideWidth" class="lb-aside" :class="{ collapsed: !navExpanded }">
      <div class="lb-logo-row">
        <div class="lb-logo" @click="router.push('/')">
          <img src="/favicon.svg" alt="logo" />
          <span v-show="navExpanded">LocalBox</span>
        </div>
      </div>
      <el-scrollbar>
        <nav class="lb-nav">
          <div
            v-for="group in navGroups"
            :key="group.id"
            class="lb-group"
            :class="{ open: isGroupOpen(group.id), active: isGroupActive(group) }"
            @mouseenter="onGroupEnter(group, $event)"
            @mouseleave="onGroupLeave"
          >
            <button
              type="button"
              class="lb-group-head"
              :title="navExpanded ? undefined : group.name"
              @click="onGroupHead(group.id)"
            >
              <span class="lb-ico" v-html="group.icon"></span>
              <span v-show="navExpanded" class="lb-group-name">{{ group.name }}</span>
              <span v-show="navExpanded" class="lb-caret"></span>
            </button>
            <div v-show="navExpanded && isGroupOpen(group.id)" class="lb-group-body">
              <router-link
                v-for="item in group.items"
                :key="item.route"
                :to="item.route"
                class="lb-nav-item"
                :class="{ active: route.path === item.route }"
                @click="search = ''"
              >
                <span
                  v-if="group.id !== 'favorites' && item.toolId && favorites.has(item.toolId)"
                  class="lb-star"
                  >★</span
                >
                {{ item.name }}
              </router-link>
            </div>
          </div>
          <div v-if="searching && !navGroups.length" class="lb-nav-empty">
            没有匹配“{{ search.trim() }}”的工具
          </div>
        </nav>
      </el-scrollbar>
      <div class="lb-aside-foot">
        <router-link
          to="/settings"
          class="lb-settings"
          :class="{ active: route.path === '/settings' }"
          :title="navExpanded ? undefined : '设置'"
        >
          <span class="lb-ico" v-html="ICONS.settings"></span>
          <span v-show="navExpanded" class="lb-settings-name">设置</span>
        </router-link>
      </div>
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
            <span class="lb-burger" :class="{ open: navExpanded }">
              <i></i><i></i><i></i>
            </span>
          </button>
          <el-input
            v-model="search"
            class="lb-search"
            placeholder="过滤左侧菜单（离线本地）"
            clearable
            @keyup.enter="onSearchEnter"
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
  <Teleport to="body">
    <div
      v-if="flyout"
      class="lb-flyout"
      :style="{ top: flyout.top + 'px', left: flyout.left + 'px' }"
      @mouseenter="keepFlyout"
      @mouseleave="onGroupLeave"
    >
      <div class="lb-flyout-title">{{ flyout.name }}</div>
      <router-link
        v-for="item in flyout.items"
        :key="item.route"
        :to="item.route"
        class="lb-nav-item"
        :class="{ active: route.path === item.route }"
        @click="hideFlyout"
      >
        <span v-if="item.toolId && favorites.has(item.toolId)" class="lb-star">★</span>
        {{ item.name }}
      </router-link>
    </div>
  </Teleport>
  <ImageViewer />
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ThemeSwitch from './components/ThemeSwitch.vue'
import ImageViewer from './components/ImageViewer.vue'
import { CATEGORIES, TOOLS, searchTools, type ToolMeta } from './registry'
import { favorites, loadFavorites } from './composables/useFavorites'

const NAV_KEY = 'localbox:navCollapsed'
const CATS_KEY = 'localbox:navCats'
const COLLAPSED_WIDTH = '64px'
const EXPANDED_WIDTH = '230px'

interface NavItem {
  name: string
  route: string
  toolId?: string
}

interface NavGroup {
  id: string
  name: string
  icon: string
  items: NavItem[]
}

interface FlyoutState {
  id: string
  name: string
  items: NavItem[]
  top: number
  left: number
}

const ICONS: Record<string, string> = {
  convert:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 8h11M18 8l-3-3M18 8l-3 3M17 16H6M6 16l3-3M6 16l3 3"/></svg>',
  dev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13 6l-2 12"/></svg>',
  photo:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.2"/><path d="M9 7l1.2-2h3.6L15 7"/></svg>',
  life: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="7" height="7" rx="1.4"/><rect x="13" y="4" width="7" height="7" rx="1.4"/><rect x="4" y="13" width="7" height="7" rx="1.4"/><rect x="13" y="13" width="7" height="7" rx="1.4"/></svg>',
  other:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/></svg>',
  favorites:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3.8l2.5 5.1 5.6.8-4.1 4 1 5.6-5-2.6-5 2.6 1-5.6-4.1-4 5.6-.8z"/></svg>',
  settings:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
}

const route = useRoute()
const router = useRouter()
const search = ref('')
const navCollapsed = ref(true)
/** 分组折叠状态：undefined = 未设置（首次默认折叠，仅展开收藏与当前分组） */
const openCats = reactive<Record<string, boolean | undefined>>({})
const flyout = ref<FlyoutState | null>(null)
let flyoutTimer = 0

/** 顶栏搜索词是否生效（用于菜单内过滤） */
const searching = computed(() => search.value.trim().length > 0)

/** 实际展开状态：侧栏折叠时输入搜索词会临时展开，否则过滤结果看不见 */
const navExpanded = computed(() => !navCollapsed.value || searching.value)

const asideWidth = computed(() => (navExpanded.value ? EXPANDED_WIDTH : COLLAPSED_WIDTH))

/** 按搜索词过滤后的工具列表（名称/描述/关键词，与首页同源） */
const visibleTools = computed<ToolMeta[]>(() => {
  const q = search.value.trim()
  if (!q) return TOOLS
  const ids = new Set(searchTools(q).map((t) => t.id))
  return TOOLS.filter((t) => ids.has(t.id))
})

const navGroups = computed<NavGroup[]>(() => {
  const toItems = (list: ToolMeta[]): NavItem[] =>
    list.map((t) => ({ name: t.name, route: t.route, toolId: t.id }))

  // 收藏置顶作为快捷分组；搜索时隐藏，避免与下方分类重复
  const favItems = searching.value
    ? []
    : toItems(TOOLS.filter((t) => favorites.value.has(t.id)))

  const cats: NavGroup[] = CATEGORIES.map((cat) => ({
    id: cat.id,
    name: cat.name,
    icon: ICONS[cat.id] ?? ICONS.other,
    items: toItems(visibleTools.value.filter((t) => t.category === cat.id)),
  })).filter((g) => g.items.length > 0 || !searching.value)

  const groups: NavGroup[] = []
  if (favItems.length) {
    groups.push({ id: 'favorites', name: '我的收藏', icon: ICONS.favorites, items: favItems })
  }
  groups.push(...cats)
  if (!searching.value) {
    groups.push({
      id: 'other',
      name: '其他',
      icon: ICONS.other,
      items: [
        { name: '我的收藏', route: '/favorites' },
        { name: '操作历史', route: '/history' },
      ],
    })
  }
  return groups
})

function isGroupOpen(id: string): boolean {
  // 搜索时强制展开，保证过滤结果可见
  if (searching.value) return true
  const saved = openCats[id]
  if (saved !== undefined) return saved
  // 首次默认全部折叠：仅展开"我的收藏"与当前所在分组
  if (id === 'favorites') return true
  return groupHasActive(id)
}

function groupHasActive(id: string): boolean {
  return navGroups.value.some(
    (g) => g.id === id && g.items.some((item) => item.route === route.path),
  )
}

function isGroupActive(group: NavGroup): boolean {
  return group.items.some((item) => item.route === route.path)
}

function persistCats(): void {
  try {
    localStorage.setItem(CATS_KEY, JSON.stringify({ ...openCats }))
  } catch {
    /* ignore */
  }
}

function toggleGroup(id: string): void {
  openCats[id] = !isGroupOpen(id)
  persistCats()
}

function onGroupHead(id: string): void {
  if (navCollapsed.value) return
  toggleGroup(id)
  hideFlyout()
}

function shouldShowFlyout(id: string): boolean {
  return navCollapsed.value || !isGroupOpen(id)
}

function onGroupEnter(group: NavGroup, event: MouseEvent): void {
  window.clearTimeout(flyoutTimer)
  if (!shouldShowFlyout(group.id)) {
    flyout.value = null
    return
  }
  const el = event.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  flyout.value = {
    id: group.id,
    name: group.name,
    items: group.items,
    top: rect.top,
    left: rect.right + 8,
  }
}

function keepFlyout(): void {
  window.clearTimeout(flyoutTimer)
}

function hideFlyout(): void {
  flyout.value = null
}

function onGroupLeave(): void {
  window.clearTimeout(flyoutTimer)
  flyoutTimer = window.setTimeout(hideFlyout, 120)
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
  hideFlyout()
  try {
    localStorage.setItem(NAV_KEY, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

/** 回车打开第一个匹配结果，并清空过滤词 */
function onSearchEnter(): void {
  const first = searchTools(search.value.trim())[0]
  if (!first) return
  void router.push(first.route)
  search.value = ''
}

/** 过滤开始/结束时收起悬浮分组，避免宽度变化后残留错位的浮层 */
watch(searching, () => {
  hideFlyout()
})

/** 切换工具时：右侧内容回到顶部，左侧当前菜单项保持在可视区内 */
function syncScrollOnRoute(): void {
  document.querySelector<HTMLElement>('.lb-main')?.scrollTo({ top: 0 })
  document.querySelector('.lb-nav-item.active')?.scrollIntoView({ block: 'nearest' })
}

function loadOpenCats(): void {
  try {
    const raw = localStorage.getItem(CATS_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as Record<string, boolean>
    Object.keys(parsed).forEach((id) => {
      openCats[id] = parsed[id]
    })
  } catch {
    /* ignore */
  }
}

onMounted(() => {
  navCollapsed.value = readNavCollapsed()
  loadOpenCats()
  void loadFavorites()
})

watch(
  () => route.path,
  () => {
    // 进入某个工具时，若其分组被手动折叠过则自动展开，保证能看到当前位置
    const group = navGroups.value.find((g) => g.items.some((item) => item.route === route.path))
    if (group && openCats[group.id] === false) {
      delete openCats[group.id]
      persistCats()
    }
    nextTick(syncScrollOnRoute)
  },
)
</script>

<style scoped>
/* 应用外壳：整页高度固定，左侧菜单与右侧内容各自独立滚动，
   避免"菜单多长页面就多长"导致右侧内容下方留白、视口停在空白处 */
.lb-app {
  height: 100vh;
  overflow: hidden;
  min-width: 1200px;
}
.lb-aside {
  background: var(--color-bg-card);
  border-right: 1px solid var(--color-border);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
  transition: width 200ms ease, background-color 200ms ease;
}
.lb-aside :deep(.el-scrollbar) {
  flex: 1;
  min-height: 0;
}
.lb-aside.collapsed {
  align-items: stretch;
}
.lb-aside-foot {
  flex-shrink: 0;
  padding: 8px 8px 12px;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-card);
}
.lb-settings {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 40px;
  padding: 0 10px;
  border-radius: 8px;
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: 13px;
  font-weight: 600;
  box-sizing: border-box;
}
.lb-aside.collapsed .lb-settings {
  justify-content: center;
  padding: 0;
}
.lb-settings-name {
  flex: 1;
  text-align: left;
}
.lb-settings:hover,
.lb-settings.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
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
  padding: 0 8px 20px;
}
.lb-nav-empty {
  padding: 14px 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
  text-align: center;
  line-height: 1.6;
}
.lb-aside.collapsed .lb-nav {
  padding: 4px 8px 16px;
}
.lb-group {
  position: relative;
  margin-bottom: 4px;
}
.lb-group-head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 12px;
  cursor: pointer;
  text-align: left;
}
.lb-group-head:hover,
.lb-group.active .lb-group-head {
  background: var(--color-primary-light);
  color: var(--color-primary);
}
.lb-aside.collapsed .lb-group-head {
  justify-content: center;
  padding: 10px 0;
}
.lb-group-name {
  flex: 1;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.lb-caret {
  width: 6px;
  height: 6px;
  border-right: 1.6px solid currentColor;
  border-bottom: 1.6px solid currentColor;
  transform: rotate(-45deg);
  transition: transform 160ms ease;
  margin-right: 2px;
}
.lb-group.open .lb-caret {
  transform: rotate(45deg);
}
.lb-ico {
  width: 20px;
  height: 20px;
  display: inline-flex;
  flex-shrink: 0;
}
.lb-ico :deep(svg) {
  width: 20px;
  height: 20px;
}
.lb-group-body {
  padding: 0 0 6px;
}
.lb-nav-item {
  display: block;
  padding: 8px 12px 8px 38px;
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
  overflow: auto;
  min-height: 0;
  transition: background-color 200ms ease;
}
</style>

<style>
.lb-flyout {
  position: fixed;
  min-width: 188px;
  padding: 8px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 8px 24px var(--color-shadow);
  z-index: 4000;
}
.lb-flyout-title {
  font-size: 12px;
  color: var(--color-text-secondary);
  padding: 4px 12px 8px;
  font-weight: 600;
}
.lb-flyout .lb-nav-item {
  display: block;
  padding: 8px 12px;
  border-radius: 6px;
  color: var(--color-text-primary);
  text-decoration: none;
  font-size: 14px;
}
.lb-flyout .lb-nav-item:hover {
  background: var(--color-primary-light);
}
.lb-flyout .lb-nav-item.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 600;
}
.lb-flyout .lb-star {
  color: var(--color-warning);
  margin-right: 4px;
}
</style>
