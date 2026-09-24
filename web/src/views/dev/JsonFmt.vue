<template>
  <div class="lb-card">
    <ToolHeader tool-id="jsonfmt" />
    <div class="lb-section">
      <el-input v-model="input" type="textarea" :rows="10" placeholder="粘贴 JSON" />
    </div>
    <div class="lb-row lb-section">
      <span>缩进</span>
      <el-input-number v-model="indent" :min="0" :max="8" controls-position="right" style="width: 110px" />
      <el-button type="primary" @click="pretty">格式化</el-button>
      <el-button @click="mini">压缩</el-button>
      <el-button @click="check">校验</el-button>
      <el-button :disabled="!output" @click="copy">复制结果</el-button>
    </div>
    <el-alert v-if="msg" :type="ok ? 'success' : 'error'" :title="msg" :closable="false" show-icon class="lb-section" />
    <el-input v-model="output" type="textarea" :rows="12" class="lb-output" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import ToolHeader from '../../components/ToolHeader.vue'
import { jsonTools } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useTool'

const input = ref('')
const output = ref('')
const indent = ref(2)
const ok = ref(true)
const msg = ref('')
const record = useToolHistory('jsonfmt')

function apply(kind: 'pretty' | 'mini' | 'check'): void {
  const r =
    kind === 'pretty' ? jsonTools.formatJson(input.value, indent.value) : kind === 'mini' ? jsonTools.minifyJson(input.value) : jsonTools.validateJson(input.value)
  ok.value = r.ok
  msg.value = r.ok ? (kind === 'check' ? r.text : '处理成功') : r.error ?? '失败'
  if (kind !== 'check' && r.ok) output.value = r.text
  record(kind === 'pretty' ? '格式化JSON' : kind === 'mini' ? '压缩JSON' : '校验JSON', r.ok ? '成功' : r.error ?? '')
}

function pretty(): void {
  apply('pretty')
}
function mini(): void {
  apply('mini')
}
function check(): void {
  apply('check')
}
async function copy(): Promise<void> {
  await navigator.clipboard.writeText(output.value)
  ElMessage.success('已复制')
}
</script>
