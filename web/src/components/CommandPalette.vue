<template>
  <Teleport to="body">
    <div v-if="open" class="cmdk-mask" @mousedown.self="close">
      <div class="cmdk" role="dialog" aria-modal="true" aria-label="全局搜索">
        <div class="cmdk-head">
          <span class="cmdk-glyph">⌕</span>
          <input
            ref="inputRef"
            v-model="q"
            class="cmdk-input"
            placeholder="搜索工具、跳转页面，或直接输入算式，如 2^10"
            @keydown="onKey"
          />
          <span class="cmdk-esc">Esc</span>
        </div>

        <div class="cmdk-list">
          <button
            v-for="(row, i) in rows"
            :key="row.key"
            type="button"
            class="cmdk-row"
            :class="{ active: i === index }"
            @mouseenter="index = i"
            @mousedown.prevent="run(row)"
          >
            <span class="cmdk-mark" :class="row.kind"></span>
            <span class="cmdk-body">
              <span class="cmdk-title">{{ row.title }}</span>
              <span class="cmdk-sub">{{ row.sub }}</span>
            </span>
            <span class="cmdk-hint">{{ row.hint }}</span>
          </button>

          <div v-if="!rows.length" class="cmdk-empty">没有匹配「{{ q.trim() }}」的工具</div>
        </div>

        <div class="cmdk-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> 选择</span>
          <span><kbd>Enter</kbd> 打开 / 复制</span>
          <span><kbd>Ctrl</kbd><kbd>K</kbd> 呼出</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { CATEGORIES, TOOLS, searchTools, type ToolMeta } from '../registry'
import { favorites } from '../composables/useFavorites'
import { store } from '../store/bootstrap'
import { calcTools } from '@localbox/core/index'

const MAX_TOOL_ROWS = 8
const MAX_RECENT = 5

interface Row {
  key: string
  title: string
  sub: string
  hint: string
  kind: 'tool' | 'page' | 'calc'
  route?: string
  copy?: string
}

const router = useRouter()
const open = ref(false)
const q = ref('')
const index = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)
const recentIds = ref<string[]>([])

/** 非工具页的常用跳转，也进搜索池 */
const EXTRA_PAGES: { title: string; route: string; sub: string }[] = [
  { title: '我的收藏', route: '/favorites', sub: '收藏的工具在这里置顶' },
  { title: '操作历史', route: '/history', sub: '最近执行过的操作记录' },
  { title: '设置', route: '/settings', sub: '主题 · 备份 · 数据管理' },
]

function catName(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.name ?? ''
}

function toolRow(t: ToolMeta): Row {
  return {
    key: `t:${t.id}`,
    title: t.name,
    sub: `${catName(t.category)} · ${t.desc}`,
    hint: '打开',
    kind: 'tool',
    route: t.route,
  }
}

/** 空输入时的默认列表：收藏优先，其次最近用过 */
const idleRows = computed<Row[]>(() => {
  const out: Row[] = []
  const favs = TOOLS.filter((t) => favorites.value.has(t.id))
  favs.slice(0, 4).forEach((t) => out.push({ ...toolRow(t), hint: '收藏' }))
  const seen = new Set(out.map((r) => r.key))
  recentIds.value
    .map((id) => TOOLS.find((t) => t.id === id))
    .filter((t): t is ToolMeta => Boolean(t) && !seen.has(`t:${t!.id}`))
    .slice(0, MAX_RECENT)
    .forEach((t) => out.push({ ...toolRow(t), hint: '最近' }))
  EXTRA_PAGES.slice(0, 3).forEach((p) =>
    out.push({ key: `p:${p.route}`, title: p.title, sub: p.sub, hint: '跳转', kind: 'page', route: p.route }),
  )
  return out
})

const rows = computed<Row[]>(() => {
  const text = q.value.trim()
  if (!text) return idleRows.value

  const out: Row[] = []

  // 算式直算：能解析且含数字就给结果，回车复制（命中后可直接贴进任何输入框）
  if (/\d/.test(text) && calcTools.isValid(text)) {
    const r = calcTools.evaluate(text)
    out.push({
      key: 'calc',
      title: `= ${r.formatted}`,
      sub: `${r.expr} · 复制到剪贴板`,
      hint: 'Enter 复制',
      kind: 'calc',
      copy: String(r.value),
    })
  }

  searchTools(text)
    .slice(0, MAX_TOOL_ROWS)
    .forEach((t) => out.push(toolRow(t)))

  if (out.length < MAX_TOOL_ROWS + 1) {
    const lower = text.toLowerCase()
    EXTRA_PAGES.filter((p) => p.title.toLowerCase().includes(lower)).forEach((p) =>
      out.push({ key: `p:${p.route}`, title: p.title, sub: p.sub, hint: '跳转', kind: 'page', route: p.route }),
    )
  }

  return out
})

watch(rows, () => {
  index.value = 0
})

async function loadRecent(): Promise<void> {
  try {
    const list = await store.getHistory()
    const ids: string[] = []
    for (const h of list) {
      if (h.toolId && !ids.includes(h.toolId)) ids.push(h.toolId)
      if (ids.length >= MAX_RECENT) break
    }
    recentIds.value = ids
  } catch {
    recentIds.value = []
  }
}

async function show(): Promise<void> {
  open.value = true
  q.value = ''
  index.value = 0
  await loadRecent()
  await nextTick()
  inputRef.value?.focus()
}

function close(): void {
  open.value = false
}

function run(row: Row): void {
  if (row.copy !== undefined) {
    copyText(row.copy)
    close()
    return
  }
  if (row.route) {
    void router.push(row.route)
    close()
  }
}

function copyText(v: string): void {
  if (!navigator.clipboard) {
    ElMessage.error('当前环境不支持剪贴板，请手动复制')
    return
  }
  void navigator.clipboard
    .writeText(v)
    .then(() => ElMessage.success(`已复制 ${v}`))
    .catch(() => ElMessage.error('复制失败'))
}

function onKey(e: KeyboardEvent): void {
  const total = rows.value.length
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (total) index.value = (index.value + 1) % total
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (total) index.value = (index.value - 1 + total) % total
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const row = rows.value[index.value]
    if (row) run(row)
  }
}

/** 全局 Ctrl/Cmd + K 呼出；挂载在应用根部，任何页面、任何输入框内都可用 */
function onGlobalKey(e: KeyboardEvent): void {
  if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    if (open.value) close()
    else void show()
  }
}

onMounted(() => window.addEventListener('keydown', onGlobalKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onGlobalKey))
</script>

<style scoped>
.cmdk-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 18, 26, 0.42);
  backdrop-filter: blur(2px);
  z-index: 5000;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 12vh;
}
.cmdk {
  width: min(620px, calc(100vw - 48px));
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.28);
  overflow: hidden;
  animation: cmdk-in 140ms ease;
}
@keyframes cmdk-in {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.cmdk-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--color-border);
}
.cmdk-glyph {
  font-size: 18px;
  color: var(--color-text-secondary);
  line-height: 1;
}
.cmdk-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--color-text-primary);
  font-size: 15px;
}
.cmdk-input::placeholder {
  color: var(--color-text-secondary);
}
.cmdk-esc {
  font-size: 11px;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 2px 6px;
}
.cmdk-list {
  max-height: 46vh;
  overflow: auto;
  padding: 6px;
}
.cmdk-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-primary);
  text-align: left;
  cursor: pointer;
}
.cmdk-row.active {
  background: var(--color-primary-light);
}
.cmdk-mark {
  width: 8px;
  height: 8px;
  border-radius: 3px;
  background: var(--color-text-secondary);
  flex-shrink: 0;
}
.cmdk-mark.tool {
  background: var(--color-primary);
}
.cmdk-mark.page {
  background: var(--color-warning);
}
.cmdk-mark.calc {
  background: #00b42a;
}
.cmdk-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.cmdk-title {
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cmdk-sub {
  font-size: 12px;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cmdk-hint {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--color-text-secondary);
}
.cmdk-empty {
  padding: 26px 12px;
  text-align: center;
  font-size: 13px;
  color: var(--color-text-secondary);
}
.cmdk-foot {
  display: flex;
  gap: 16px;
  padding: 8px 14px;
  border-top: 1px solid var(--color-border);
  font-size: 11px;
  color: var(--color-text-secondary);
}
.cmdk-foot kbd {
  display: inline-block;
  min-width: 18px;
  text-align: center;
  padding: 1px 5px;
  margin-right: 3px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-family: inherit;
  font-size: 11px;
}
</style>
