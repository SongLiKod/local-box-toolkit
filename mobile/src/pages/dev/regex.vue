<template>
  <ToolPage tool-id="regex">
    <view class="lb-card">
      <view class="lb-label">正则</view>
      <input v-model="pattern" class="lb-input" placeholder="如 \\d+" />
      <view class="lb-label">标志</view>
      <input v-model="flags" class="lb-input" placeholder="gimsuy" />
      <view class="lb-label">文本</view>
      <textarea v-model="text" class="lb-input lb-textarea" />
      <button class="lb-btn" @click="run">测试</button>
      <view class="lb-label">{{ info }}</view>
      <view v-for="(m, i) in rows" :key="i" class="lb-output">{{ m.index }}: {{ m.text }}</view>
    </view>
  </ToolPage>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import { regexTools, type RegexMatch } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useHistory'

const pattern = ref('\\d+')
const flags = ref('g')
const text = ref('')
const rows = ref<RegexMatch[]>([])
const info = ref('')
const record = useToolHistory('regex')

function run(): void {
  const r = regexTools.testRegex(pattern.value, flags.value, text.value)
  rows.value = r.matches
  info.value = r.ok ? `匹配 ${r.count} 处` : r.error ?? '失败'
  record('正则测试', info.value)
}
</script>
