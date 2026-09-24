<template>
  <div class="lb-card">
    <ToolHeader tool-id="jwt" notice="仅本地解析 Header/Payload，不校验签名、不联网。" />
    <el-input v-model="token" type="textarea" :rows="5" placeholder="粘贴 JWT" class="lb-section" />
    <div class="lb-row lb-section">
      <el-button type="primary" @click="decode">解析</el-button>
      <el-button :disabled="!payload" @click="copyPayload">复制 Payload</el-button>
    </div>
    <el-alert v-if="error" type="error" :title="error" :closable="false" show-icon class="lb-section" />
    <el-row :gutter="16">
      <el-col :span="12">
        <div class="lb-label">Header</div>
        <el-input :model-value="header" type="textarea" :rows="10" readonly />
      </el-col>
      <el-col :span="12">
        <div class="lb-label">Payload</div>
        <el-input :model-value="payload" type="textarea" :rows="10" readonly />
      </el-col>
    </el-row>
    <p v-if="sig" class="lb-desc" style="margin-top: 12px">Signature：{{ sig }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import ToolHeader from '../../components/ToolHeader.vue'
import { jwtTools } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useTool'

const token = ref('')
const header = ref('')
const payload = ref('')
const sig = ref('')
const error = ref('')
const record = useToolHistory('jwt')

function decode(): void {
  const r = jwtTools.decodeJwt(token.value)
  error.value = r.error ?? ''
  header.value = r.header.json ?? r.header.error ?? ''
  payload.value = r.payload.json ?? r.payload.error ?? ''
  sig.value = r.signature
  record('解析JWT', r.ok ? '成功' : r.error ?? '')
}

async function copyPayload(): Promise<void> {
  await navigator.clipboard.writeText(payload.value)
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
