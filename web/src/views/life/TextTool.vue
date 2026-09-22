<template>
  <div class="lb-card">
    <ToolHeader tool-id="text-tool" />
    <el-input v-model="text" type="textarea" :rows="8" placeholder="粘贴或输入文本" class="lb-section" />
    <div class="lb-row lb-section">
      <el-button @click="op('trimEnd')">去行尾空格</el-button>
      <el-button @click="op('trimAll')">去所有空格</el-button>
      <el-button @click="op('trimAllNl')">去空格+换行</el-button>
      <el-button @click="op('emptyLines')">去空行</el-button>
      <el-button @click="op('joinLines')">合并为一行</el-button>
      <el-button @click="op('trimEach')">去每行首尾空白</el-button>
      <el-button @click="op('dedupe')">多余空格折叠</el-button>
      <el-button @click="copy">复制结果</el-button>
      <el-button @click="revert">还原</el-button>
    </div>
    <el-input v-model="result" type="textarea" :rows="8" readonly class="lb-section" />
    <el-descriptions title="字数统计" :column="3" border size="small">
      <el-descriptions-item label="总字符">{{ stats.chars }}</el-descriptions-item>
      <el-descriptions-item label="不含空白">{{ stats.charsNoSpace }}</el-descriptions-item>
      <el-descriptions-item label="行数">{{ stats.lines }}</el-descriptions-item>
      <el-descriptions-item label="中文字数">{{ stats.cjkChars }}</el-descriptions-item>
      <el-descriptions-item label="英文单词">{{ stats.words - stats.cjkChars }}</el-descriptions-item>
      <el-descriptions-item label="字词合计">{{ stats.words }}</el-descriptions-item>
    </el-descriptions>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import ToolHeader from '../../components/ToolHeader.vue'
import { textTools } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useTool'

const text = ref('')
const result = ref('')
const record = useToolHistory('text-tool')

const stats = computed(() => textTools.countText(result.value || text.value))

function op(kind: string): void {
  const src = result.value || text.value
  switch (kind) {
    case 'trimEnd':
      result.value = textTools.trimTrailingSpaces(src)
      break
    case 'trimAll':
      result.value = textTools.removeAllSpaces(src, false)
      break
    case 'trimAllNl':
      result.value = textTools.removeAllSpaces(src, true)
      break
    case 'emptyLines':
      result.value = textTools.removeEmptyLines(src)
      break
    case 'joinLines':
      result.value = textTools.joinLines(src, ' ')
      break
    case 'trimEach':
      result.value = textTools.trimEachLine(src)
      break
    case 'dedupe':
      result.value = textTools.dedupeSpaces(src)
      break
  }
  record('文本处理', kind)
}

function revert(): void {
  result.value = ''
}

async function copy(): Promise<void> {
  await navigator.clipboard.writeText(result.value || text.value)
  ElMessage.success('已复制')
}
</script>
