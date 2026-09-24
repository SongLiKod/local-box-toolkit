<template>
  <div class="lb-card">
    <ToolHeader tool-id="radix" />
    <div class="lb-row lb-section">
      <el-input v-model="value" placeholder="输入数值" style="width: 260px" />
      <span>从</span>
      <el-input-number v-model="fromBase" :min="2" :max="36" controls-position="right" style="width: 110px" />
      <span>进制</span>
      <el-button type="primary" @click="run">转换</el-button>
    </div>
    <el-alert v-if="error" type="error" :title="error" :closable="false" show-icon class="lb-section" />
    <el-descriptions v-if="result" :column="1" border size="small">
      <el-descriptions-item label="二进制">{{ result.bin }}</el-descriptions-item>
      <el-descriptions-item label="八进制">{{ result.oct }}</el-descriptions-item>
      <el-descriptions-item label="十进制">{{ result.dec }}</el-descriptions-item>
      <el-descriptions-item label="十六进制">{{ result.hex }}</el-descriptions-item>
    </el-descriptions>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ToolHeader from '../../components/ToolHeader.vue'
import { radixTools } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useTool'

const value = ref('')
const fromBase = ref(10)
const error = ref('')
const result = ref<Record<string, string> | null>(null)
const record = useToolHistory('radix')

function run(): void {
  try {
    result.value = radixTools.convertRadixSet(value.value, fromBase.value)
    error.value = ''
    record('进制转换', `${fromBase.value} → ${result.value.dec}`)
  } catch (e) {
    result.value = null
    error.value = e instanceof Error ? e.message : String(e)
  }
}
</script>
