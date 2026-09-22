<template>
  <div class="lb-card">
    <ToolHeader tool-id="exif" notice="本地 Canvas 重编码剥离全部元数据，图片不上传。" />
    <FileDrop v-model="files" accept=".jpg,.jpeg,.png,.webp" hint="支持批量" />
    <div class="lb-row lb-section" style="margin-top: 16px">
      <el-button type="primary" :disabled="!files.length" :loading="running" @click="run">清除 EXIF</el-button>
      <el-button :disabled="!results.length" @click="downloadAll">打包下载 ZIP</el-button>
    </div>
    <ProgressBar :visible="running || results.length > 0" :done="done" :total="total" :label="label" :running="running" />
    <el-table v-if="results.length" :data="results" size="small" max-height="320">
      <el-table-column prop="name" label="结果" show-overflow-tooltip />
      <el-table-column label="大小" width="120">
        <template #default="{ row }">{{ formatBytes(row.blob.size) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="90">
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
import { formatBytes, saveBlob, saveBlobs, TaskQueue } from '@localbox/core/index'
import { clearExif } from '@localbox/core/convert/image'
import { useToolHistory } from '../../composables/useTool'
import type { ConvertedFile } from '@localbox/core/index'

const files = ref<File[]>([])
const results = ref<ConvertedFile[]>([])
const running = ref(false)
const done = ref(0)
const total = ref(0)
const label = ref('')
const record = useToolHistory('exif')
const queue = new TaskQueue(2)

async function run(): Promise<void> {
  running.value = true
  results.value = []
  done.value = 0
  total.value = files.value.length
  const out: ConvertedFile[] = []
  await queue.all(
    files.value.map((f) => async (): Promise<void> => {
      try {
        const r = await clearExif([f])
        out.push(...r)
      } catch (e) {
        ElMessage.error(`${f.name}: ${e instanceof Error ? e.message : String(e)}`)
      } finally {
        done.value += 1
        label.value = `已完成 ${done.value}/${total.value}`
      }
    })
  )
  results.value = out
  running.value = false
  if (out.length) {
    record('清除EXIF', `${out.length} 张`)
    ElMessage.success(`已清除 ${out.length} 张图片的 EXIF`)
  }
}

async function saveOne(row: ConvertedFile): Promise<void> {
  await saveBlob(row.name, row.blob)
}
async function downloadAll(): Promise<void> {
  await saveBlobs(results.value, `localbox-exif-${Date.now()}.zip`)
}
</script>
