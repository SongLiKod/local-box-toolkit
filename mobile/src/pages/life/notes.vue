<template>
  <ToolPage tool-id="notes">
    <!-- 列表视图 -->
    <view v-if="view === 'list'" class="lb-card">
      <view class="notes-top">
        <text class="lb-title">全部便签</text>
        <text class="notes-new" @click="create">＋ 新建</text>
      </view>

      <input v-model="query" class="lb-input notes-search" placeholder="搜索标题 / 正文" />

      <view v-for="n in filtered" :key="n.id" class="lb-note" @click="select(n)">
        <view class="lb-note-head">
          <text class="lb-note-title">{{ liveTitle(n) }}</text>
          <text class="lb-note-time">{{ relTime(n.updatedAt) }}</text>
        </view>
        <view class="lb-note-sub">{{ liveSnippet(n) }}</view>
        <view class="lb-note-meta">{{ liveCount(n) }} 字</view>
      </view>

      <view v-if="!filtered.length" class="lb-empty">
        <text class="lb-empty-text">
          {{
            query.trim()
              ? `没有匹配「${query.trim()}」的便签`
              : '还没有便签，新建一条开始记录备忘'
          }}
        </text>
        <button v-if="!query.trim()" class="lb-btn" @click="create">新建便签</button>
      </view>

      <view class="notes-count">共 {{ notes.length }} 条 · 本机最多 200 条</view>
    </view>

    <!-- 编辑视图 -->
    <view v-else class="lb-card">
      <view class="notes-ed-top">
        <text class="notes-back" @click="back">‹ 返回</text>
        <text class="notes-status" :class="{ dirty }">{{ statusText }}</text>
      </view>

      <input
        v-model="title"
        class="lb-input notes-title"
        placeholder="标题（留空自动记为「未命名便签」）"
      />
      <textarea
        v-model="body"
        class="lb-input lb-textarea notes-area"
        placeholder="正文，仅保存在本机"
      />

      <view class="notes-stats">
        <text>正文 {{ bodyStats }} 字</text>
        <text>{{ bodyLines }} 行</text>
        <text>{{ current ? `更新于 ${formatTime(current.updatedAt)}` : '尚未保存' }}</text>
      </view>

      <view class="lb-row">
        <button class="lb-btn" :disabled="!dirty" @click="saveNow">保存</button>
        <button class="lb-btn lb-btn-plain" :disabled="!current" @click="remove">删除</button>
      </view>
      <view class="notes-tip">返回或切换便签时，若有改动会自动暂存</view>
    </view>
  </ToolPage>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { onHide, onShow, onUnload } from '@dcloudio/uni-app'
import ToolPage from '../../components/ToolPage.vue'
import { store } from '../../store'
import type { NoteItem } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useHistory'

const AUTO_SAVE_DELAY = 900

const view = ref<'list' | 'edit'>('list')
const notes = ref<NoteItem[]>([])
const current = ref<NoteItem | null>(null)
const title = ref('')
const body = ref('')
const query = ref('')
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
  const p = (n: number): string => String(n).padStart(2, '0')
  const x = new Date(t)
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`
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
    if (explicit) uni.showToast({ title: '内容为空，未创建便签', icon: 'none' })
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
  if (isNew || explicit) record('保存便签', saved.title)
  if (explicit) uni.showToast({ title: '已保存', icon: 'none' })
}

function saveNow(): void {
  void save(true)
}

/** 切换 / 返回 / 退出前落盘，杜绝丢内容 */
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

/* ---------------- 视图与增删 ---------------- */
async function create(): Promise<void> {
  await flush()
  current.value = null
  title.value = ''
  body.value = ''
  snap.value = { title: '', body: '' }
  view.value = 'edit'
}

async function select(n: NoteItem): Promise<void> {
  if (current.value?.id === n.id && !dirty.value) {
    view.value = 'edit'
    return
  }
  await flush()
  current.value = n
  title.value = n.title
  body.value = n.body
  snap.value = { title: n.title, body: n.body }
  view.value = 'edit'
}

async function back(): Promise<void> {
  await flush()
  view.value = 'list'
}

function remove(): void {
  const target = current.value
  if (!target) return
  uni.showModal({
    title: '删除便签',
    content: `删除「${target.title}」？该操作不可恢复。`,
    confirmText: '删除',
    confirmColor: '#F53F3F',
    success: (res) => {
      if (res.confirm) void doDelete(target)
    },
  })
}

async function doDelete(n: NoteItem): Promise<void> {
  if (timer) {
    clearTimeout(timer)
    timer = null
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
  view.value = 'list'
  uni.showToast({ title: '已删除', icon: 'none' })
}

/* ---------------- 生命周期 ---------------- */
function flushIfDirty(): void {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  if (dirty.value) void save(false)
}

// 从设置页导入备份回来后刷新列表；切走 / 关闭页面时暂存未保存内容
onShow(() => {
  void reload()
})
onHide(flushIfDirty)
onUnload(flushIfDirty)
</script>

<style scoped>
.notes-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.notes-new {
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 600;
  padding: 10rpx 26rpx;
}
.notes-new:active {
  opacity: 0.7;
}
.notes-search {
  margin-bottom: 8rpx;
}
.lb-note {
  padding: 18rpx 0;
  border-bottom: 1px solid var(--color-border);
}
.lb-note:last-child {
  border-bottom: none;
}
.lb-note:active {
  opacity: 0.7;
}
.lb-note-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16rpx;
}
.lb-note-title {
  font-size: 28rpx;
  font-weight: 600;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lb-note-time {
  flex-shrink: 0;
  font-size: 22rpx;
  color: var(--color-text-secondary);
}
.lb-note-sub {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  margin-top: 6rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lb-note-meta {
  font-size: 20rpx;
  color: var(--color-text-secondary);
  opacity: 0.8;
  margin-top: 6rpx;
}
.lb-empty {
  text-align: center;
  padding: 30rpx 0 10rpx;
}
.lb-empty-text {
  display: block;
  font-size: 26rpx;
  color: var(--color-text-secondary);
  line-height: 1.7;
  margin-bottom: 10rpx;
}
.notes-count {
  font-size: 22rpx;
  color: var(--color-text-secondary);
  margin-top: 14rpx;
  text-align: center;
}

/* ---------- 编辑 ---------- */
.notes-ed-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}
.notes-back {
  color: var(--color-primary);
  font-size: 28rpx;
  font-weight: 600;
  padding: 8rpx 0;
}
.notes-back:active {
  opacity: 0.7;
}
.notes-status {
  font-size: 22rpx;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  border-radius: 999rpx;
  padding: 6rpx 18rpx;
}
.notes-status.dirty {
  color: var(--color-warning);
  border-color: var(--color-warning);
}
.notes-title {
  font-size: 32rpx;
  font-weight: 600;
}
.notes-area {
  min-height: 420rpx;
  line-height: 1.7;
  margin-top: 14rpx;
}
.notes-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  font-size: 22rpx;
  color: var(--color-text-secondary);
  margin: 14rpx 0;
}
.notes-tip {
  font-size: 22rpx;
  color: var(--color-text-secondary);
  text-align: center;
  margin-top: 14rpx;
}
</style>
