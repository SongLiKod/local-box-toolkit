<template>
  <div class="lb-card">
    <ToolHeader tool-id="regex" />
    <div class="lb-row lb-section">
      <el-input v-model="pattern" placeholder="正则表达式，如 \\d+" style="flex: 1" />
      <el-input v-model="flags" placeholder="标志 gimsuy" style="width: 140px" />
      <el-button type="primary" @click="run">测试</el-button>
    </div>
    <el-input v-model="text" type="textarea" :rows="8" placeholder="待匹配文本" class="lb-section" />
    <el-alert v-if="error" type="error" :title="error" :closable="false" show-icon class="lb-section" />
    <p v-else class="lb-desc">匹配 {{ rows.length }} 处</p>
    <el-table :data="rows" size="small" max-height="360">
      <el-table-column prop="index" label="位置" width="80" />
      <el-table-column prop="text" label="匹配" />
      <el-table-column label="分组">
        <template #default="{ row }">{{ row.groups.join(' | ') }}</template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ToolHeader from '../../components/ToolHeader.vue'
import { regexTools, type RegexMatch } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useTool'

const pattern = ref('\\d+')
const flags = ref('g')
const text = ref('')
const rows = ref<RegexMatch[]>([])
const error = ref('')
const record = useToolHistory('regex')

function run(): void {
  const r = regexTools.testRegex(pattern.value, flags.value, text.value)
  error.value = r.error ?? ''
  rows.value = r.matches
  record('正则测试', r.ok ? `${r.count} 处` : r.error ?? '')
}
</script>
