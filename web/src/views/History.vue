<template>
  <div class="lb-card">
    <div class="lb-row" style="justify-content: space-between; margin-bottom: 12px">
      <h2 class="lb-title">操作历史记录</h2>
      <div>
        <el-button size="small" @click="load">刷新</el-button>
        <el-button size="small" type="danger" :disabled="!rows.length" @click="clear">清空</el-button>
      </div>
    </div>
    <p class="lb-desc">历史记录保存在本机（IndexedDB / 本地JSON），不上传服务器、不跨设备同步。</p>
    <el-table :data="rows" size="small" max-height="560">
      <el-table-column prop="toolName" label="工具" width="180" />
      <el-table-column prop="action" label="操作" width="160" />
      <el-table-column prop="detail" label="详情" show-overflow-tooltip />
      <el-table-column label="时间" width="200">
        <template #default="{ row }">{{ new Date(row.time).toLocaleString() }}</template>
      </el-table-column>
    </el-table>
    <el-empty v-if="!rows.length" description="暂无操作记录" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { history, loadHistory, clearHistory } from '../composables/useFavorites'
import type { HistoryItem } from '@localbox/core/index'

const rows = ref<HistoryItem[]>([])

async function load(): Promise<void> {
  await loadHistory()
  rows.value = history.value
}

async function clear(): Promise<void> {
  await clearHistory()
  rows.value = []
}

onMounted(load)
</script>
