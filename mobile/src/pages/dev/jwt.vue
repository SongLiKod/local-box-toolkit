<template>
  <ToolPage tool-id="jwt" notice="仅本地解析，不校验签名。">
    <view class="lb-card">
      <textarea v-model="token" class="lb-input lb-textarea" placeholder="粘贴 JWT" />
      <button class="lb-btn" @click="decode">解析</button>
      <view class="lb-label">Header</view>
      <view class="lb-output">{{ header || '—' }}</view>
      <view class="lb-label">Payload</view>
      <view class="lb-output">{{ payload || '—' }}</view>
      <button class="lb-btn lb-btn-plain" @click="copy">复制 Payload</button>
    </view>
  </ToolPage>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import { jwtTools } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useHistory'

const token = ref('')
const header = ref('')
const payload = ref('')
const record = useToolHistory('jwt')

function decode(): void {
  const r = jwtTools.decodeJwt(token.value)
  header.value = r.header.json ?? r.header.error ?? r.error ?? ''
  payload.value = r.payload.json ?? r.payload.error ?? ''
  record('解析JWT', r.ok ? '成功' : r.error ?? '')
}
function copy(): void {
  uni.setClipboardData({ data: payload.value })
}
</script>
