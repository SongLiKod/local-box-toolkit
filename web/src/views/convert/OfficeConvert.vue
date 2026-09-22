<template>
  <div class="lb-card">
    <ToolHeader
      tool-id="office-convert"
      notice="旧二进制格式 doc / xls / ppt 前端本地解析兼容性有限，建议先另存为 docx / xlsx / pptx 再转换。"
    />
    <FileDrop v-model="files" :accept="accept" hint="支持 docx、doc、xlsx、xls、pptx、ppt、pdf、txt，可多选批量" />

    <div class="lb-row lb-section" style="margin-top: 16px">
      <span>转换目标：</span>
      <el-select v-model="params.target" style="width: 200px">
        <el-option label="PDF" value="pdf" />
        <el-option label="TXT" value="txt" />
      </el-select>
      <el-button type="primary" :loading="running" :disabled="!files.length" @click="run">
        开始转换
      </el-button>
      <el-button v-if="results.length" @click="downloadAll">打包下载 ZIP</el-button>
    </div>

    <ProgressBar :visible="running || results.length > 0" :done="done" :total="total" :label="label" :running="running" :status="barStatus" />

    <el-table v-if="results.length" :data="results" size="small" max-height="360">
      <el-table-column prop="name" label="结果文件" show-overflow-tooltip />
      <el-table-column label="大小" width="120">
        <template #default="{ row }">{{ formatBytes(row.blob.size) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button link type="primary" @click="saveOne(row)">下载</el-button>
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
import ProgressBar from '../../components/ProgressBar.vue'
import { formatBytes, saveBlob, saveBlobs, TaskQueue, extOf } from '@localbox/core/index'
import { convertOffice } from '@localbox/core/convert/office2pdf'
import { useToolHistory, useToolParams } from '../../composables/useTool'
import type { ConvertedFile } from '@localbox/core/index'

const accept = '.docx,.doc,.xlsx,.xls,.pptx,.ppt,.pdf,.txt'
const files = ref<File[]>([])
const results = ref<ConvertedFile[]>([])
const running = ref(false)
const done = ref(0)
const total = ref(0)
const label = ref('')
const barStatus = ref<'' | 'success' | 'exception' | 'warning'>('')
const { params } = useToolParams('office-convert', { target: 'pdf' as 'pdf' | 'txt' })
const record = useToolHistory('office-convert')

const queue = new TaskQueue(2)

const VALID: Record<string, ('pdf' | 'txt')[]> = {
  docx: ['pdf', 'txt'],
  doc: ['pdf', 'txt'],
  xlsx: ['pdf', 'txt'],
  xls: ['pdf', 'txt'],
  pptx: ['pdf'],
  ppt: ['pdf'],
  pdf: ['txt'],
  txt: ['pdf'],
}

async function run(): Promise<void> {
  const target = params.value.target
  const invalid = files.value.find((f) => !(VALID[extOf(f.name)] ?? []).includes(target))
  if (invalid) {
    ElMessage.error(`${invalid.name} 不支持转换为 ${target.toUpperCase()}`)
    return
  }
  running.value = true
  barStatus.value = ''
  results.value = []
  done.value = 0
  total.value = files.value.length
  const out: ConvertedFile[] = []
  await queue.all(
    files.value.map((f) => async (): Promise<void> => {
      try {
        const r = await convertOffice(f, target)
        out.push(r)
      } catch (e) {
        ElMessage.error(`${f.name}: ${e instanceof Error ? e.message : String(e)}`)
      } finally {
        done.value += 1
        label.value = `已完成 ${done.value}/${total.value}：${f.name}`
      }
    })
  )
  results.value = out
  running.value = false
  barStatus.value = out.length ? 'success' : 'exception'
  if (out.length) {
    record('Office互转', `${out.length} 个文件 → ${target.toUpperCase()}`)
    ElMessage.success(`转换完成，共 ${out.length} 个文件`)
  }
}

async function saveOne(row: ConvertedFile): Promise<void> {
  await saveBlob(row.name, row.blob)
}

async function downloadAll(): Promise<void> {
  await saveBlobs(results.value, `localbox-office-${Date.now()}.zip`)
}
</script>
