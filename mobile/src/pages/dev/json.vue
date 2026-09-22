<template>
  <ToolPage tool-id="jsonfmt">
    <view class="lb-card">
      <textarea v-model="input" class="lb-input lb-textarea" placeholder="粘贴 JSON" />
      <button class="lb-btn" @click="pretty">格式化</button>
      <button class="lb-btn lb-btn-plain" @click="mini">压缩</button>
      <button class="lb-btn lb-btn-plain" @click="check">校验</button>
      <view class="lb-label">{{ msg || '结果' }}</view>
      <view class="lb-output">{{ output || '—' }}</view>
      <button class="lb-btn lb-btn-plain" @click="copy">复制</button>
    </view>
  </ToolPage>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import { jsonTools } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useHistory'

const input = ref('')
const output = ref('')
const msg = ref('')
const record = useToolHistory('jsonfmt')

function apply(kind: 'pretty' | 'mini' | 'check'): void {
  const r = kind === 'pretty' ? jsonTools.formatJson(input.value) : kind === 'mini' ? jsonTools.minifyJson(input.value) : jsonTools.validateJson(input.value)
  msg.value = r.ok ? (kind === 'check' ? r.text : '成功') : r.error ?? '失败'
  if (kind !== 'check' && r.ok) output.value = r.text
  record(kind === 'pretty' ? '格式化JSON' : kind === 'mini' ? '压缩JSON' : '校验JSON', msg.value)
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
function copy(): void {
  uni.setClipboardData({ data: output.value })
}
</script>
