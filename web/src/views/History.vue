<template>
  <div class="lb-card">
    <div class="lb-row" style="justify-content: space-between; margin-bottom: 12px">
      <h2 class="lb-title">操作历史记录</h2>
      <div>
        <el-button size="small" @click="load">刷新</el-button>
        <el-button size="small" type="danger" :disabled="!rows.length" @click="clear">清空</el-button>
      </div>
    </div>
    <p class="lb-desc">历史记录保存在本机（IndexedDB / 本地JSON），不上传服务器、不跨设备同步。点击 UUID 记录可查看当时生成的内容。</p>
    <el-table :data="rows" size="small" max-height="560" @row-click="onRowClick">
      <el-table-column prop="toolName" label="工具" width="180" />
      <el-table-column prop="action" label="操作" width="160" />
      <el-table-column prop="detail" label="详情" min-width="280" show-overflow-tooltip />
      <el-table-column label="时间" width="200">
        <template #default="{ row }">{{ new Date(row.time).toLocaleString() }}</template>
      </el-table-column>
    </el-table>
    <el-empty v-if="!rows.length" description="暂无操作记录" />

    <el-dialog v-model="dialogVisible" title="历史 UUID 内容" width="640px">
      <p v-if="dialogPayload?.truncated" class="lb-note">数量较多，仅保存了前 {{ dialogPayload.uuids.length }} 条。</p>
      <el-scrollbar max-height="360px">
        <div v-for="(u, i) in dialogPayload?.uuids ?? []" :key="i" class="lb-uuid-row">
          <span class="lb-idx">{{ i + 1 }}</span>
          <code>{{ u }}</code>
          <el-button link type="primary" size="small" @click="copyOne(u)">复制</el-button>
        </div>
      </el-scrollbar>
      <template #footer>
        <el-button @click="copyDialog">复制全部</el-button>
        <el-button type="primary" @click="dialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { history, loadHistory, clearHistory } from '../composables/useFavorites'
import { uuidTools, type HistoryItem, type UuidHistoryPayload } from '@localbox/core/index'

const rows = ref<HistoryItem[]>([])
const dialogVisible = ref(false)
const dialogPayload = ref<UuidHistoryPayload | null>(null)

async function load(): Promise<void> {
  await loadHistory()
  rows.value = history.value
}

async function clear(): Promise<void> {
  await clearHistory()
  rows.value = []
}

function onRowClick(row: HistoryItem): void {
  if (row.toolId !== 'uuid' || row.action !== '生成UUID') return
  const payload = uuidTools.parseUuidHistory(row)
  if (!payload) {
    ElMessage.info('该条记录未保存 UUID 内容')
    return
  }
  dialogPayload.value = payload
  dialogVisible.value = true
}

async function copyOne(u: string): Promise<void> {
  await navigator.clipboard.writeText(u)
  ElMessage.success('已复制')
}

async function copyDialog(): Promise<void> {
  if (!dialogPayload.value) return
  await navigator.clipboard.writeText(dialogPayload.value.uuids.join('\n'))
  ElMessage.success('已复制全部')
}

onMounted(load)
</script>

<style scoped>
.lb-uuid-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
  font-size: 13px;
}
.lb-idx {
  width: 36px;
  text-align: right;
  color: var(--color-text-secondary);
}
.lb-note {
  font-size: 12px;
  color: var(--color-warning);
  margin: 0 0 8px;
}
</style>
