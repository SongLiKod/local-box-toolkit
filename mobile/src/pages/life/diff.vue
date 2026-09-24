<template>
  <ToolPage tool-id="diff">
    <view class="lb-card">
      <view class="lb-label">原文</view>
      <textarea v-model="left" class="lb-input lb-textarea" />
      <view class="lb-label">对比</view>
      <textarea v-model="right" class="lb-input lb-textarea" />
      <button class="lb-btn" @click="run">对比</button>
      <view class="lb-label">{{ info }}</view>
      <view v-for="(l, i) in lines" :key="i" class="lb-output">{{ mark(l.kind) }} {{ l.text }}</view>
    </view>
  </ToolPage>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import { diffTools, type DiffKind, type DiffLine } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useHistory'

const left = ref('')
const right = ref('')
const lines = ref<DiffLine[]>([])
const info = ref('')
const record = useToolHistory('diff')

function mark(kind: DiffKind): string {
  return kind === 'add' ? '+' : kind === 'del' ? '-' : ' '
}

function run(): void {
  lines.value = diffTools.diffLines(left.value, right.value)
  const s = diffTools.diffStats(lines.value)
  info.value = `相同 ${s.same} · 新增 ${s.added} · 删除 ${s.removed}`
  record('文本对比', info.value)
}
</script>
