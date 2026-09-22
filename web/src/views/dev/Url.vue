<template>
  <div class="lb-card">
    <ToolHeader tool-id="urlcode" />
    <div class="lb-section">
      <div class="lb-label">输入</div>
      <el-input v-model="input" type="textarea" :rows="6" placeholder="输入文本或URL" />
    </div>
    <div class="lb-row lb-section">
      <el-button type="primary" @click="encComp">编码组件(encodeURIComponent)</el-button>
      <el-button @click="decComp">解码组件</el-button>
      <el-button @click="encUrl">编码整URL(encodeURI)</el-button>
      <el-button @click="decUrl">解码整URL</el-button>
      <el-button :disabled="!output" @click="copy">复制结果</el-button>
    </div>
    <div class="lb-section">
      <div class="lb-label">结果</div>
      <el-input v-model="output" type="textarea" :rows="6" readonly />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import ToolHeader from '../../components/ToolHeader.vue'
import { urlTools } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useTool'

const input = ref('')
const output = ref('')
const record = useToolHistory('urlcode')

function encComp(): void {
  output.value = urlTools.urlEncodeComponent(input.value)
  record('编码', 'component')
}
function decComp(): void {
  try {
    output.value = urlTools.urlDecodeComponent(input.value)
    record('解码', 'component')
  } catch {
    ElMessage.error('解码失败：非法的百分号编码')
  }
}
function encUrl(): void {
  output.value = urlTools.urlEncode(input.value)
  record('编码', 'uri')
}
function decUrl(): void {
  try {
    output.value = urlTools.urlDecode(input.value)
    record('解码', 'uri')
  } catch {
    ElMessage.error('解码失败：非法的百分号编码')
  }
}
async function copy(): Promise<void> {
  await navigator.clipboard.writeText(output.value)
  ElMessage.success('已复制')
}
</script>

<style scoped>
.lb-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}
</style>
