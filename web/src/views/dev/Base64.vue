<template>
  <div class="lb-card">
    <ToolHeader tool-id="base64" />
    <div class="lb-section">
      <div class="lb-label">输入文本</div>
      <el-input v-model="input" type="textarea" :rows="6" placeholder="输入要编码/解码的文本" />
    </div>
    <div class="lb-row lb-section">
      <el-button type="primary" @click="encode">编码</el-button>
      <el-button @click="decode">解码</el-button>
      <el-checkbox v-model="urlSafe">URL 安全模式</el-checkbox>
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
import { base64Tools } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useTool'

const input = ref('')
const output = ref('')
const urlSafe = ref(false)
const record = useToolHistory('base64')

function encode(): void {
  try {
    output.value = urlSafe.value ? base64Tools.base64EncodeUrlSafe(input.value) : base64Tools.base64Encode(input.value)
    record('编码', `${input.value.length} 字符`)
  } catch (e) {
    ElMessage.error(String(e))
  }
}

function decode(): void {
  try {
    output.value = urlSafe.value ? base64Tools.base64DecodeUrlSafe(input.value) : base64Tools.base64Decode(input.value)
    record('解码', `${input.value.length} 字符`)
  } catch {
    ElMessage.error('无效的 Base64 字符串')
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
