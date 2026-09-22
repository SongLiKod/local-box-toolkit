<template>
  <div class="lb-card">
    <ToolHeader tool-id="pdf-tools" />
    <FileDrop v-model="files" accept=".pdf" hint="仅支持 PDF 文件，合并至少两个文件" />

    <div class="lb-row lb-section" style="margin-top: 16px">
      <el-radio-group v-model="params.mode">
        <el-radio-button value="merge">合并</el-radio-button>
        <el-radio-button value="split">拆分</el-radio-button>
        <el-radio-button value="compress">压缩</el-radio-button>
        <el-radio-button value="watermark">去水印</el-radio-button>
      </el-radio-group>
      <template v-if="params.mode === 'compress'">
        <el-select v-model="params.compressMode" style="width: 190px">
          <el-option label="结构优化（无损）" value="struct" />
          <el-option label="强压缩（栅格化）" value="strong" />
        </el-select>
        <el-select v-model="params.compressDpi" style="width: 130px">
          <el-option :value="96" label="96 DPI" />
          <el-option :value="150" label="150 DPI" />
          <el-option :value="300" label="300 DPI" />
        </el-select>
      </template>
      <el-button type="primary" :loading="running" :disabled="!files.length" @click="run">执行</el-button>
      <el-button v-if="results.length > 1" @click="downloadAll">打包下载 ZIP</el-button>
      <el-button v-else-if="results.length === 1" @click="saveOne(results[0])">下载结果</el-button>
    </div>

    <ProgressBar :visible="running || results.length > 0" :done="done" :total="total" :label="label" :running="running" :status="barStatus" />
    <el-alert v-if="wmInfo" type="info" :closable="false" show-icon :title="wmInfo" class="lb-section" />

    <el-table v-if="results.length" :data="results" size="small" max-height="360">
      <el-table-column prop="name" label="结果文件" show-overflow-tooltip />
      <el-table-column label="大小" width="140">
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
import { formatBytes, saveBlob, saveBlobs, extOf } from '@localbox/core/index'
import { mergePdfs, splitPdf, compressPdf, removeWatermark } from '@localbox/core/convert/pdf'
import { useToolHistory, useToolParams } from '../../composables/useTool'
import type { ConvertedFile } from '@localbox/core/index'

const files = ref<File[]>([])
const results = ref<ConvertedFile[]>([])
const running = ref(false)
const done = ref(0)
const total = ref(0)
const label = ref('')
const barStatus = ref<'' | 'success' | 'exception' | 'warning'>('')
const wmInfo = ref('')
const { params } = useToolParams('pdf-tools', {
  mode: 'merge' as 'merge' | 'split' | 'compress' | 'watermark',
  compressMode: 'struct' as 'struct' | 'strong',
  compressDpi: 150,
})
const record = useToolHistory('pdf-tools')

async function run(): Promise<void> {
  if (files.value.some((f) => extOf(f.name) !== 'pdf')) {
    ElMessage.error('PDF工具仅接受 .pdf 文件')
    return
  }
  if (params.value.mode === 'merge' && files.value.length < 2) {
    ElMessage.error('合并至少需要两个PDF文件')
    return
  }
  running.value = true
  barStatus.value = ''
  wmInfo.value = ''
  results.value = []
  done.value = 0
  total.value = files.value.length
  try {
    const out: ConvertedFile[] = []
    for (let i = 0; i < files.value.length; i++) {
      const f = files.value[i]
      label.value = `处理中 ${i + 1}/${files.value.length}：${f.name}`
      if (params.value.mode === 'merge') {
        out.push({ name: '合并结果.pdf', blob: await mergePdfs(files.value) })
        done.value = total.value
        break
      } else if (params.value.mode === 'split') {
        out.push(...(await splitPdf(f)))
      } else if (params.value.mode === 'compress') {
        const blob = await compressPdf(f, {
          strong: params.value.compressMode === 'strong',
          dpi: params.value.compressDpi,
          onProgress: (p) => {
            label.value = `压缩中：${f.name} 第${p.done}/${p.total}页`
          },
        })
        const saved = Math.max(0, 1 - blob.size / f.size)
        out.push({ name: f.name.replace(/\.pdf$/i, '_压缩.pdf'), blob })
        label.value = `${f.name} 压缩率 ${(saved * 100).toFixed(1)}%`
      } else {
        const r = await removeWatermark(f)
        out.push({ name: f.name.replace(/\.pdf$/i, '_去水印.pdf'), blob: r.blob })
        wmInfo.value = `已移除注释层 ${r.removedAnnotations} 处、水印图片对象 ${r.removedXObjects} 个（尽力而为，复杂水印可能残留）`
      }
      done.value = i + 1
    }
    results.value = out
    barStatus.value = out.length ? 'success' : 'exception'
    if (out.length) {
      record('PDF工具', `${params.value.mode}，输出 ${out.length} 个文件`)
      ElMessage.success('处理完成')
    }
  } catch (e) {
    barStatus.value = 'exception'
    ElMessage.error(e instanceof Error ? e.message : String(e))
  } finally {
    running.value = false
  }
}

async function saveOne(row: ConvertedFile): Promise<void> {
  await saveBlob(row.name, row.blob)
}

async function downloadAll(): Promise<void> {
  await saveBlobs(results.value, `localbox-pdf-${Date.now()}.zip`)
}
</script>
