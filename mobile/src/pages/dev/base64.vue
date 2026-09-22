<template>
  <ToolPage tool-id="base64">
    <view class="lb-card">
      <view class="lb-label">输入文本</view>
      <textarea v-model="input" class="lb-input lb-textarea" placeholder="输入要编码/解码的文本" />
      <button class="lb-btn" @click="encode">编码</button>
      <button class="lb-btn lb-btn-plain" @click="decode">解码</button>
      <view class="lb-label">结果</view>
      <view class="lb-output">{{ output || '—' }}</view>
      <button class="lb-btn lb-btn-plain" @click="copy">复制结果</button>
    </view>
  </ToolPage>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import { base64Tools } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useHistory'

const input = ref('')
const output = ref('')
const record = useToolHistory('base64')

function encode(): void {
  output.value = base64Tools.base64Encode(input.value)
  record('编码', `${input.value.length} 字符`)
}
function decode(): void {
  try {
    output.value = base64Tools.base64Decode(input.value)
    record('解码', `${input.value.length} 字符`)
  } catch {
    uni.showToast({ title: '无效的 Base64', icon: 'none' })
  }
}
function copy(): void {
  uni.setClipboardData({ data: output.value })
}
</script>
