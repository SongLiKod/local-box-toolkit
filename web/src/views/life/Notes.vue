<template>
  <div class="lb-card">
    <ToolHeader tool-id="notes" />

    <div class="notes-layout">
      <!-- 左：搜索 + 列表 -->
      <aside class="notes-side">
        <div class="notes-side-top">
          <input v-model="query" class="notes-search" placeholder="搜索标题 / 正文" />
          <button class="notes-new" type="button" @click="create">＋ 新建</button>
        </div>

        <div class="notes-list">
          <div
            v-for="n in filtered"
            :key="n.id"
            class="notes-item"
            :class="{ active: current?.id === n.id }"
            @click="select(n)"
          >
            <div class="ni-head">
              <span class="ni-title">{{ liveTitle(n) }}</span>
              <span class="ni-del" title="删除该便签" @click.stop="askDelete(n)">×</span>
            </div>
            <div class="ni-snippet">{{ liveSnippet(n) }}</div>
            <div class="ni-meta">
              <span>{{ relTime(n.updatedAt) }}</span>
              <span>{{ liveCount(n) }} 字</span>
            </div>
          </div>

          <div v-if="!filtered.length" class="notes-empty">
            {{
              query.trim()
                ? `没有匹配「${query.trim()}」的便签`
                : '还没有便签，点右上角「＋ 新建」开始记录'
            }}
          </div>
        </div>

        <div class="notes-side-foot">共 {{ notes.length }} 条 · 本机最多 200 条</div>
      </aside>

      <!-- 右：编辑器 -->
      <section class="notes-editor">
        <div v-if="hero" class="notes-hero">
          <div class="hero-icon">📝</div>
          <div class="hero-title">还没有便签</div>
          <div class="hero-desc">便签只保存在这台设备上，可随「设置 → 导出备份」一起带走，不上传。</div>
          <el-button type="primary" @click="create">新建第一条便签</el-button>
        </div>

        <template v-else>
          <div class="notes-ed-top">
            <input
              v-model="title"
              class="notes-title"
              placeholder="标题（留空自动记为「未命名便签」）"
            />
            <span class="notes-status" :class="{ dirty }">{{ statusText }}</span>
          </div>

          <textarea
            v-model="body"
            class="notes-area"
            placeholder="正文，仅保存在本机；Ctrl/Cmd + S 立即保存，其它操作会自动暂存"
          ></textarea>

          <div class="notes-ed-foot">
            <div class="notes-stats">
              <span>正文 {{ bodyStats }} 字</span>
              <span>{{ bodyLines }} 行</span>
              <span>{{ current ? `更新于 ${formatTime(current.updatedAt)}` : '尚未保存到本机' }}</span>
            </div>
            <div class="lb-row">
              <el-button type="primary" :disabled="!dirty" @click="saveNow">保存</el-button>
              <el-button :disabled="!body.trim()" @click="copyBody">复制正文</el-button>
              <el-button :disabled="!hasContent" @click="exportNote">导出 .md</el-button>
              <el-button type="danger" plain :disabled="!current" @click="remove">删除</el-button>
            </div>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import ToolHeader from '../../components/ToolHeader.vue'
import { store } from '../../store/bootstrap'
import type { NoteItem } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useTool'

const AUTO_SAVE_DELAY = 900

const notes = ref<NoteItem[]>([])
const current = ref<NoteItem | null>(null)
const title = ref('')
const body = ref('')
const query = ref('')
const hero = ref(false)
/** 已落盘的快照，dirty 直接和它比，避免程序回写又把状态标脏 */
const snap = ref({ title: '', body: '' })
const record = useToolHistory('notes')

let timer: ReturnType<typeof setTimeout> | null = null

const dirty = computed(() => title.value !== snap.value.title || body.value !== snap.value.body)
const hasContent = computed(() => Boolean(title.value.trim() || body.value.trim()))
const bodyStats = computed(() => body.value.replace(/\s+/g, '').length)
const bodyLines = computed(() => (body.value ? body.value.split('\n').length : 0))
const statusText = computed(() => {
  if (dirty.value) return '● 未保存'
  return current.value ? '已保存' : '新便签'
})

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  const list = [...notes.value].sort((a, b) => b.updatedAt - a.updatedAt)
  if (!q) return list
  return list.filter((n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q))
})

/* ---------------- 列表展示 ---------------- */
function liveBody(n: NoteItem): string {
  return current.value?.id === n.id ? body.value : n.body
}
function liveTitle(n: NoteItem): string {
  if (current.value?.id === n.id && title.value.trim()) return title.value.trim()
  return n.title
}
function liveSnippet(n: NoteItem): string {
  const t = liveBody(n).replace(/\s+/g, ' ').trim()
  return t || '（无正文）'
}
function liveCount(n: NoteItem): number {
  return liveBody(n).replace(/\s+/g, '').length
}
function relTime(t: number): string {
  const diff = Date.now() - t
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时前`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} 天前`
  return new Date(t).toLocaleDateString()
}
function formatTime(t: number): string {
  const d = new Date(t)
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/* ---------------- 保存 ---------------- */
async function reload(): Promise<void> {
  notes.value = await store.getNotes()
}

/** 内容为空且不是已有便签时不落库，避免产生一堆空便签 */
function isEmptyDraft(): boolean {
  return !hasContent.value && !current.value
}

async function save(explicit: boolean): Promise<void> {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  if (isEmptyDraft()) {
    if (explicit) ElMessage.info('内容为空，未创建便签')
    return
  }
  if (!dirty.value && !explicit) return

  const isNew = !current.value
  const saved = await store.upsertNote({
    id: current.value?.id,
    title: title.value.trim(),
    body: body.value,
  })
  current.value = saved
  title.value = saved.title
  body.value = saved.body
  snap.value = { title: saved.title, body: saved.body }
  await reload()
  hero.value = false
  if (isNew || explicit) record('保存便签', saved.title)
  if (explicit) ElMessage.success('已保存到本机')
}

function saveNow(): void {
  void save(true)
}

/** 切换/新建/离开前落盘，杜绝丢内容 */
async function flush(): Promise<void> {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  if (dirty.value) await save(false)
}

function scheduleAuto(): void {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    void save(false)
  }, AUTO_SAVE_DELAY)
}

watch([title, body], () => {
  if (dirty.value) scheduleAuto()
})

/* ---------------- 增删改 ---------------- */
async function create(): Promise<void> {
  await flush()
  current.value = null
  title.value = ''
  body.value = ''
  snap.value = { title: '', body: '' }
  hero.value = false
}

async function select(n: NoteItem): Promise<void> {
  if (current.value?.id === n.id && !dirty.value) return
  await flush()
  current.value = n
  title.value = n.title
  body.value = n.body
  snap.value = { title: n.title, body: n.body }
  hero.value = false
}

async function remove(): Promise<void> {
  if (current.value) await askDelete(current.value)
}

async function askDelete(n: NoteItem): Promise<void> {
  try {
    await ElMessageBox.confirm(`删除便签「${n.title}」？该操作不可恢复。`, '删除便签', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  await store.deleteNote(n.id)
  record('删除便签', n.title)
  if (current.value?.id === n.id) {
    current.value = null
    title.value = ''
    body.value = ''
    snap.value = { title: '', body: '' }
  }
  await reload()
  hero.value = notes.value.length === 0 && !hasContent.value
  if (notes.value.length) ElMessage.success('已删除')
}

/* ---------------- 复制 / 导出 ---------------- */
async function copyBody(): Promise<void> {
  await navigator.clipboard.writeText(body.value)
  ElMessage.success('正文已复制')
}

function exportNote(): void {
  const name = (title.value.trim() || '未命名便签').replace(/[\\/:*?"<>|]/g, '_')
  const text = `# ${title.value.trim() || '未命名便签'}\n\n${body.value}\n`
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name}.md`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success(`已导出 ${name}.md`)
}

/* ---------------- 快捷键 / 生命周期 ---------------- */
function onKey(e: KeyboardEvent): void {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    if (dirty.value) void save(true)
  }
}

onMounted(async () => {
  window.addEventListener('keydown', onKey)
  await reload()
  hero.value = notes.value.length === 0
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  if (timer) clearTimeout(timer)
  if (dirty.value) void save(false)
})
</script>

<style scoped>
.notes-layout {
  display: grid;
  grid-template-columns: minmax(260px, 320px) minmax(420px, 1fr);
  gap: 20px;
  align-items: stretch;
}

/* ---------- 左：列表 ---------- */
.notes-side {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.notes-side-top {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}
.notes-search {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--color-border);
  background: var(--color-bg-page);
  color: var(--color-text-primary);
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 13px;
  outline: none;
  transition: border-color 120ms ease;
}
.notes-search:focus {
  border-color: var(--color-primary);
}
.notes-new {
  border: 1px solid var(--color-primary);
  background: var(--color-primary);
  color: #fff;
  border-radius: 6px;
  padding: 0 12px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 120ms ease;
}
.notes-new:hover {
  opacity: 0.88;
}
.notes-list {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: auto;
  min-height: 220px;
  max-height: 560px;
}
.notes-item {
  position: relative;
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background-color 120ms ease;
}
.notes-item:last-child {
  border-bottom: none;
}
.notes-item:hover {
  background: var(--color-primary-light);
}
.notes-item.active {
  background: var(--color-primary-light);
  box-shadow: inset 3px 0 0 var(--color-primary);
}
.ni-head {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ni-title {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ni-del {
  opacity: 0;
  color: var(--color-text-secondary);
  font-size: 17px;
  line-height: 1;
  padding: 0 4px;
  transition: opacity 120ms ease;
}
.notes-item:hover .ni-del,
.notes-item.active .ni-del {
  opacity: 1;
}
.ni-del:hover {
  color: var(--color-error);
}
.ni-snippet {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ni-meta {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-top: 6px;
}
.notes-empty {
  padding: 30px 14px;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.7;
}
.notes-side-foot {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 8px;
}

/* ---------- 右：编辑器 ---------- */
.notes-editor {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 14px 16px;
}
.notes-ed-top {
  display: flex;
  align-items: center;
  gap: 12px;
}
.notes-title {
  flex: 1;
  min-width: 0;
  border: none;
  border-bottom: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-primary);
  font-size: 19px;
  font-weight: 600;
  padding: 4px 0;
  outline: none;
  transition: border-color 120ms ease;
}
.notes-title:focus {
  border-bottom-color: var(--color-primary);
}
.notes-title::placeholder {
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 400;
}
.notes-status {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 3px 10px;
  white-space: nowrap;
}
.notes-status.dirty {
  color: var(--color-warning);
  border-color: var(--color-warning);
}
.notes-area {
  flex: 1;
  width: 100%;
  min-height: 380px;
  margin-top: 12px;
  box-sizing: border-box;
  resize: vertical;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg-page);
  color: var(--color-text-primary);
  padding: 12px 14px;
  font-size: 14px;
  line-height: 1.8;
  font-family: inherit;
  outline: none;
  transition: border-color 120ms ease;
}
.notes-area:focus {
  border-color: var(--color-primary);
}
.notes-area::placeholder {
  color: var(--color-text-secondary);
}
.notes-ed-foot {
  margin-top: 12px;
}
.notes-stats {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: 10px;
}

/* ---------- 空状态 ---------- */
.notes-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 440px;
  gap: 6px;
}
.hero-icon {
  font-size: 44px;
}
.hero-title {
  font-size: 17px;
  font-weight: 600;
}
.hero-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  max-width: 380px;
  line-height: 1.7;
  margin-bottom: 10px;
}
</style>
