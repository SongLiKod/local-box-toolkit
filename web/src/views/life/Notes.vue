<template>
  <div class="lb-card">
    <ToolHeader tool-id="notes" />
    <el-row :gutter="16">
      <el-col :span="8">
        <el-button type="primary" size="small" @click="create">新建</el-button>
        <div class="lb-note-list">
          <div
            v-for="n in notes"
            :key="n.id"
            class="lb-note-item"
            :class="{ active: current?.id === n.id }"
            @click="select(n)"
          >
            <strong>{{ n.title }}</strong>
            <em>{{ new Date(n.updatedAt).toLocaleString() }}</em>
          </div>
        </div>
      </el-col>
      <el-col :span="16">
        <el-input v-model="title" placeholder="标题" class="lb-section" />
        <el-input v-model="body" type="textarea" :rows="16" placeholder="正文，仅保存在本机" class="lb-section" />
        <div class="lb-row">
          <el-button type="primary" @click="save">保存</el-button>
          <el-button type="danger" :disabled="!current" @click="remove">删除</el-button>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import ToolHeader from '../../components/ToolHeader.vue'
import { store } from '../../store/bootstrap'
import type { NoteItem } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useTool'

const notes = ref<NoteItem[]>([])
const current = ref<NoteItem | null>(null)
const title = ref('')
const body = ref('')
const record = useToolHistory('notes')

async function reload(): Promise<void> {
  notes.value = await store.getNotes()
}

function create(): void {
  current.value = null
  title.value = ''
  body.value = ''
}

function select(n: NoteItem): void {
  current.value = n
  title.value = n.title
  body.value = n.body
}

async function save(): Promise<void> {
  const saved = await store.upsertNote({ id: current.value?.id, title: title.value, body: body.value })
  current.value = saved
  title.value = saved.title
  body.value = saved.body
  await reload()
  record('保存便签', saved.title)
  ElMessage.success('已保存到本机')
}

async function remove(): Promise<void> {
  if (!current.value) return
  await ElMessageBox.confirm('删除该便签？', '确认', { type: 'warning' })
  await store.deleteNote(current.value.id)
  record('删除便签', current.value.title)
  create()
  await reload()
}

onMounted(() => {
  void reload()
})
</script>

<style scoped>
.lb-note-list {
  margin-top: 10px;
  max-height: 480px;
  overflow: auto;
}
.lb-note-item {
  padding: 10px 8px;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
}
.lb-note-item.active {
  background: var(--color-primary-light);
}
.lb-note-item strong {
  display: block;
}
.lb-note-item em {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-style: normal;
}
</style>
