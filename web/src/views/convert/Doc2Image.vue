<template>
  <div class="lb-card">
    <ToolHeader
      tool-id="doc2image"
      notice="Word 保留段落/表格/内嵌图片，Excel 保留单元格边框，PPT 还原幻灯片页面；全部本地渲染。"
    />
    <FileDrop v-model="files" :accept="accept" hint="输入：docx、xlsx、pptx、pdf，可多选批量" />

    <div class="lb-row lb-section" style="margin-top: 16px">
      <span>输出格式</span>
      <el-select v-model="params.format" style="width: 110px">
        <el-option label="JPG" value="jpg" />
        <el-option label="PNG" value="png" />
        <el-option label="WEBP" value="webp" />
        <el-option label="TIFF" value="tiff" />
      </el-select>
      <span>DPI</span>
      <el-radio-group v-model="params.dpi">
        <el-radio-button :value="72">72</el-radio-button>
        <el-radio-button :value="150">150</el-radio-button>
        <el-radio-button :value="300">300</el-radio-button>
      </el-radio-group>
      <span>色彩</span>
      <el-radio-group v-model="params.color">
        <el-radio-button value="color">彩色</el-radio-button>
        <el-radio-button value="gray">灰度黑白</el-radio-button>
      </el-radio-group>
      <span>导出模式</span>
      <el-radio-group v-model="params.mode">
        <el-radio-button value="pages">分页导出</el-radio-button>
        <el-radio-button value="long">纵向长图</el-radio-button>
      </el-radio-group>
    </div>
    <div class="lb-row lb-section">
      <span>页码范围</span>
      <el-input-number v-model="params.startPage" :min="1" size="small" placeholder="起始页" controls-position="right" style="width: 110px" />
      <span>至</span>
      <el-input-number v-model="params.endPage" :min="1" size="small" placeholder="结束页" controls-position="right" style="width: 110px" />
      <el-text size="small" type="info">留空为全部页</el-text>
      <span>图片质量 {{ params.quality }}%</span>
      <el-slider v-model="params.quality" :min="0" :max="100" style="width: 180px" />
    </div>
    <div class="lb-row lb-section">
      <el-button :disabled="!files.length" :loading="previewing" @click="preview">预览页面缩略图</el-button>
      <el-button type="primary" :disabled="!files.length" :loading="running" @click="run">开始转换</el-button>
      <el-button v-if="results.length" @click="downloadAll">打包下载 ZIP</el-button>
    </div>

    <div v-if="previews.length" class="lb-preview-grid lb-section">
      <div v-for="(p, i) in previews" :key="i">
        <img :src="p.url" :alt="`第${i + 1}页`" />
        <div class="lb-preview-name">{{ p.file }}</div>
      </div>
    </div>

    <ProgressBar :visible="running || results.length > 0" :done="done" :total="total" :label="label" :running="running" :status="barStatus" />

    <el-table v-if="results.length" :data="results.slice(0, 200)" size="small" max-height="320">
      <el-table-column prop="name" label="结果图片" show-overflow-tooltip />
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
import { ElMessage, ElMessageBox } from 'element-plus'
import ToolHeader from '../../components/ToolHeader.vue'
import FileDrop from '../../components/FileDrop.vue'
import ProgressBar from '../../components/ProgressBar.vue'
import { formatBytes, saveBlob, saveBlobs, TaskQueue } from '@localbox/core/index'
import { fileToImages, getPageCount, previewThumbnails } from '@localbox/core/convert/toImage'
import { useToolHistory, useToolParams } from '../../composables/useTool'
import type { ConvertedFile } from '@localbox/core/index'

const accept = '.docx,.xlsx,.pptx,.pdf'
const files = ref<File[]>([])
const results = ref<ConvertedFile[]>([])
const previews = ref<Array<{ url: string; file: string }>>([])
const running = ref(false)
const previewing = ref(false)
const done = ref(0)
const total = ref(0)
const label = ref('')
const barStatus = ref<'' | 'success' | 'exception' | 'warning'>('')

const { params } = useToolParams('doc2image', {
  format: 'jpg' as 'jpg' | 'png' | 'webp' | 'tiff',
  dpi: 150 as 72 | 150 | 300,
  color: 'color' as 'color' | 'gray',
  mode: 'pages' as 'pages' | 'long',
  quality: 90,
  startPage: undefined as number | undefined,
  endPage: undefined as number | undefined,
})
const record = useToolHistory('doc2image')
const queue = new TaskQueue(1)

/** 大于50页文档提示内存占用风险，可继续（后台任务队列不阻塞页面） */
async function checkMemoryRisk(): Promise<boolean> {
  for (const f of files.value) {
    const pages = await getPageCount(f)
    const sizeMb = f.size / 1024 / 1024
    if ((pages !== null && pages > 50) || sizeMb > 30) {
      try {
        await ElMessageBox.confirm(
          `《${f.name}》${pages ? `约 ${pages} 页` : `体积 ${sizeMb.toFixed(1)}MB`}，较大文档可能占用较多内存。` +
            `将以后台任务队列方式处理（不阻塞界面，建议保持页面打开）。是否继续？`,
          '内存占用风险提示',
          { type: 'warning', confirmButtonText: '继续处理', cancelButtonText: '取消' }
        )
      } catch {
        return false
      }
    }
  }
  return true
}

async function preview(): Promise<void> {
  previewing.value = true
  previews.value = []
  try {
    for (const f of files.value.slice(0, 3)) {
      const urls = await previewThumbnails(f)
      urls.forEach((u) => previews.value.push({ url: u, file: `${f.name}` }))
    }
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : String(e))
  } finally {
    previewing.value = false
  }
}

async function run(): Promise<void> {
  if (!(await checkMemoryRisk())) return
  running.value = true
  barStatus.value = ''
  results.value = []
  done.value = 0
  total.value = files.value.length
  const out: ConvertedFile[] = []
  await queue.all(
    files.value.map((f) => async (): Promise<void> => {
      try {
        const imgs = await fileToImages(f, {
          dpi: params.value.dpi,
          color: params.value.color,
          format: params.value.format,
          mode: params.value.mode,
          quality: params.value.quality,
          startPage: params.value.startPage ?? undefined,
          endPage: params.value.endPage ?? undefined,
          onProgress: (p) => {
            label.value = `${f.name}：第 ${p.done}/${p.total} 页`
          },
        })
        out.push(...imgs)
      } catch (e) {
        ElMessage.error(`${f.name}: ${e instanceof Error ? e.message : String(e)}`)
      } finally {
        done.value += 1
      }
    })
  )
  results.value = out
  running.value = false
  barStatus.value = out.length ? 'success' : 'exception'
  if (out.length) {
    record('文档转图片', `${files.value.length} 个文档 → ${out.length} 张图片 @${params.value.dpi}DPI`)
    ElMessage.success(`转换完成，共 ${out.length} 张图片`)
  }
}

async function saveOne(row: ConvertedFile): Promise<void> {
  await saveBlob(row.name, row.blob)
}

async function downloadAll(): Promise<void> {
  await saveBlobs(results.value, `localbox-images-${Date.now()}.zip`)
}
</script>

<style scoped>
.lb-preview-name {
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
