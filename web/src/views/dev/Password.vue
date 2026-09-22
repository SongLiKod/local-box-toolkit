<template>
  <div class="lb-card">
    <ToolHeader tool-id="password" />
    <div class="lb-row lb-section">
      <span>长度</span>
      <el-input-number v-model="params.length" :min="4" :max="128" controls-position="right" style="width: 120px" />
      <el-checkbox v-model="params.lowercase">小写</el-checkbox>
      <el-checkbox v-model="params.uppercase">大写</el-checkbox>
      <el-checkbox v-model="params.digits">数字</el-checkbox>
      <el-checkbox v-model="params.symbols">符号</el-checkbox>
      <el-checkbox v-model="params.guaranteeEach">每类至少一个</el-checkbox>
    </div>
    <div class="lb-row lb-section">
      <span>排除字符</span>
      <el-input v-model="params.excludeChars" placeholder="如 0O1lI" style="width: 200px" />
      <el-button type="primary" @click="gen">生成</el-button>
      <el-button :disabled="!result" @click="copy">复制</el-button>
    </div>
    <div class="lb-result lb-section">
      <code>{{ result || '点击生成' }}</code>
      <el-tag v-if="result" :type="strengthType" size="small">{{ strength.label }}</el-tag>
    </div>
    <div v-if="batch.length" class="lb-batch">
      <div class="lb-label">批量生成（{{ batch.length }} 条）</div>
      <div v-for="(p, i) in batch" :key="i" class="lb-batch-row">
        <code>{{ p }}</code>
        <el-button link size="small" @click="copyOne(p)">复制</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import ToolHeader from '../../components/ToolHeader.vue'
import { pwdTools } from '@localbox/core/index'
import { useToolHistory, useToolParams } from '../../composables/useTool'

const result = ref('')
const batch = ref<string[]>([])
const { params } = useToolParams('password', {
  length: 16,
  lowercase: true,
  uppercase: true,
  digits: true,
  symbols: true,
  excludeChars: '',
  guaranteeEach: true,
})
const record = useToolHistory('password')

const strength = computed(() => (result.value ? pwdTools.passwordStrength(result.value) : { score: 0, label: '' }))
const strengthType = computed(() => (strength.value.score >= 4 ? 'success' : strength.value.score >= 3 ? 'warning' : 'danger'))

function gen(): void {
  try {
    result.value = pwdTools.generatePassword(params.value)
    batch.value = Array.from({ length: 9 }, () => pwdTools.generatePassword(params.value))
    record('生成密码', `长度${params.value.length}`)
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : String(e))
  }
}

async function copy(): Promise<void> {
  await navigator.clipboard.writeText(result.value)
  ElMessage.success('已复制')
}
async function copyOne(p: string): Promise<void> {
  await navigator.clipboard.writeText(p)
  ElMessage.success('已复制')
}
</script>

<style scoped>
.lb-result {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-primary-light);
}
.lb-result code {
  font-size: 18px;
  word-break: break-all;
}
.lb-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 12px 0 4px;
}
.lb-batch-row {
  display: flex;
  justify-content: space-between;
  padding: 3px 0;
  font-size: 13px;
}
</style>
