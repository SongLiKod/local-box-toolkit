<template>
  <div class="lb-card">
    <ToolHeader tool-id="hash" />
    <el-tabs v-model="tab">
      <el-tab-pane label="文本哈希" name="text">
        <el-input v-model="text" type="textarea" :rows="4" placeholder="输入要计算哈希的文本" class="lb-section" />
      </el-tab-pane>
      <el-tab-pane label="文件哈希" name="file">
        <FileDrop v-model="files" hint="本地读取文件计算摘要，不上传" />
      </el-tab-pane>
    </el-tabs>
    <div class="lb-row lb-section" style="margin-top: 12px">
      <el-button type="primary" :loading="running" @click="run">计算</el-button>
    </div>
    <el-table v-if="rows.length" :data="rows" size="small">
      <el-table-column prop="target" label="对象" show-overflow-tooltip />
      <el-table-column label="MD5" show-overflow-tooltip>
        <template #default="{ row }">
          <code class="lb-hash">{{ row.md5 }}</code>
          <el-button link size="small" @click="copy(row.md5)">复制</el-button>
        </template>
      </el-table-column>
      <el-table-column label="SHA1" show-overflow-tooltip>
        <template #default="{ row }">
          <code class="lb-hash">{{ row.sha1 }}</code>
          <el-button link size="small" @click="copy(row.sha1)">复制</el-button>
        </template>
      </el-table-column>
      <el-table-column label="SHA256" show-overflow-tooltip>
        <template #default="{ row }">
          <code class="lb-hash">{{ row.sha256 }}</code>
          <el-button link size="small" @click="copy(row.sha256)">复制</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import ToolHeader from '../../components/ToolHeader.vue'
import FileDrop from '../../components/FileDrop.vue'
import { hashTools, TaskQueue } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useTool'

interface HashRow {
  target: string
  md5: string
  sha1: string
  sha256: string
}

const tab = ref('text')
const text = ref('')
const files = ref<File[]>([])
const rows = ref<HashRow[]>([])
const running = ref(false)
const record = useToolHistory('hash')
const queue = new TaskQueue(2)

async function run(): Promise<void> {
  running.value = true
  rows.value = []
  try {
    if (tab.value === 'text') {
      const src = text.value
      rows.value = [
        {
          target: `文本（${src.length} 字符）`,
          md5: hashTools.hashText('md5', src),
          sha1: hashTools.hashText('sha1', src),
          sha256: hashTools.hashText('sha256', src),
        },
      ]
      record('文本哈希', `MD5=${rows.value[0].md5.slice(0, 12)}…`)
    } else {
      const out: HashRow[] = []
      await queue.all(
        files.value.map(
          (f) => async (): Promise<void> => {
            const r: HashRow = {
              target: f.name,
              md5: await hashTools.hashFile('md5', f),
              sha1: await hashTools.hashFile('sha1', f),
              sha256: await hashTools.hashFile('sha256', f),
            }
            out.push(r)
          }
        )
      )
      rows.value = out
      if (out.length) record('文件哈希', `${out.length} 个文件`)
    }
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : String(e))
  } finally {
    running.value = false
  }
}

async function copy(s: string): Promise<void> {
  await navigator.clipboard.writeText(s)
  ElMessage.success('已复制')
}
</script>

<style scoped>
.lb-hash {
  font-size: 12px;
  word-break: break-all;
}
</style>
