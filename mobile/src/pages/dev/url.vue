<template>
  <ToolPage tool-id="urlcode">
    <view class="lb-card">
      <view class="lb-label">输入</view>
      <textarea v-model="input" class="lb-input lb-textarea" placeholder="文本或URL" />
      <button class="lb-btn" @click="encComp">编码组件</button>
      <button class="lb-btn lb-btn-plain" @click="decComp">解码组件</button>
      <button class="lb-btn lb-btn-plain" @click="encUrl">编码整URL</button>
      <button class="lb-btn lb-btn-plain" @click="decUrl">解码整URL</button>
      <view class="lb-label">结果</view>
      <view class="lb-output">{{ output || '—' }}</view>
      <button class="lb-btn lb-btn-plain" @click="copy">复制结果</button>
    </view>
  </ToolPage>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import { urlTools } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useHistory'

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
    uni.showToast({ title: '解码失败', icon: 'none' })
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
    uni.showToast({ title: '解码失败', icon: 'none' })
  }
}
function copy(): void {
  uni.setClipboardData({ data: output.value })
}
</script>
