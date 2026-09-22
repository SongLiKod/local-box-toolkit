<template>
  <div class="lb-card">
    <ToolHeader tool-id="diff" />
    <el-row :gutter="16" class="lb-section">
      <el-col :span="12">
        <div class="lb-label">原文</div>
        <el-input v-model="left" type="textarea" :rows="14" />
      </el-col>
      <el-col :span="12">
        <div class="lb-label">对比</div>
        <el-input v-model="right" type="textarea" :rows="14" />
      </el-col>
    </el-row>
    <div class="lb-row lb-section">
      <el-button type="primary" @click="run">对比</el-button>
      <span v-if="stats" class="lb-desc" style="margin: 0">相同 {{ stats.same }} · 新增 {{ stats.added }} · 删除 {{ stats.removed }}</span>
    </div>
    <div v-if="lines.length" class="lb-diff">
      <div v-for="(l, i) in lines" :key="i" class="lb-diff-line" :class="l.kind">
        <span class="no">{{ l.leftNo ?? '' }}</span>
        <span class="no">{{ l.rightNo ?? '' }}</span>
        <span class="mark">{{ l.kind === 'add' ? '+' : l.kind === 'del' ? '-' : ' ' }}</span>
        <code>{{ l.text }}</code>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ToolHeader from '../../components/ToolHeader.vue'
import { diffTools, type DiffLine } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useTool'

const left = ref('')
const right = ref('')
const lines = ref<DiffLine[]>([])
const stats = ref<{ added: number; removed: number; same: number } | null>(null)
const record = useToolHistory('diff')

function run(): void {
  lines.value = diffTools.diffLines(left.value, right.value)
  stats.value = diffTools.diffStats(lines.value)
  record('文本对比', `+${stats.value.added} -${stats.value.removed}`)
}
</script>

<style scoped>
.lb-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}
.lb-diff {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 13px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  max-height: 420px;
  overflow: auto;
}
.lb-diff-line {
  display: grid;
  grid-template-columns: 40px 40px 18px 1fr;
  gap: 8px;
  padding: 2px 8px;
  white-space: pre-wrap;
}
.lb-diff-line.add {
  background: rgba(0, 180, 42, 0.12);
}
.lb-diff-line.del {
  background: rgba(245, 63, 63, 0.12);
}
.no {
  color: var(--color-text-secondary);
  text-align: right;
}
</style>
