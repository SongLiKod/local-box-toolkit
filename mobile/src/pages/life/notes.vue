<template>
  <ToolPage tool-id="notes">
    <view class="lb-card">
      <button class="lb-btn" @click="create">新建便签</button>
      <view v-for="n in notes" :key="n.id" class="lb-hist" @click="select(n)">
        <view class="lb-hist-detail">{{ n.title }}</view>
        <view class="lb-hist-time">{{ formatTime(n.updatedAt) }}</view>
      </view>
    </view>
    <view class="lb-card">
      <input v-model="title" class="lb-input" placeholder="标题" />
      <textarea v-model="body" class="lb-input lb-textarea" placeholder="正文" />
      <button class="lb-btn" @click="save">保存</button>
      <button class="lb-btn lb-btn-plain" @click="remove">删除</button>
    </view>
  </ToolPage>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import { store } from '../../store'
import type { NoteItem } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useHistory'

const notes = ref<NoteItem[]>([])
const currentId = ref('')
const title = ref('')
const body = ref('')
const record = useToolHistory('notes')

async function reload(): Promise<void> {
  notes.value = await store.getNotes()
}

function create(): void {
  currentId.value = ''
  title.value = ''
  body.value = ''
}

function select(n: NoteItem): void {
  currentId.value = n.id
  title.value = n.title
  body.value = n.body
}

async function save(): Promise<void> {
  const saved = await store.upsertNote({ id: currentId.value || undefined, title: title.value, body: body.value })
  currentId.value = saved.id
  title.value = saved.title
  body.value = saved.body
  await reload()
  record('保存便签', saved.title)
  uni.showToast({ title: '已保存', icon: 'none' })
}

async function remove(): Promise<void> {
  if (!currentId.value) return
  await store.deleteNote(currentId.value)
  record('删除便签', title.value)
  create()
  await reload()
}

function formatTime(t: number): string {
  const d = new Date(t)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

onMounted(() => {
  void reload()
})
</script>

<style scoped>
.lb-hist {
  padding: 16rpx 0;
  border-bottom: 1px solid var(--color-border);
}
.lb-hist-detail {
  font-size: 28rpx;
}
.lb-hist-time {
  font-size: 22rpx;
  color: var(--color-text-secondary);
  margin-top: 6rpx;
}
</style>
