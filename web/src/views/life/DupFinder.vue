<template>
  <div class="lb-card">
    <ToolHeader tool-id="dupfinder" />

    <div class="dup-layout">
      <!-- 左：导入与统计 -->
      <aside class="dup-side">
        <div class="dup-drop" @dragover.prevent @drop.prevent="onDrop" @click="pickFiles">
          <div class="dup-drop-icon">📂</div>
          <div class="dup-drop-main">点击选择 / 拖入文件</div>
          <div class="dup-drop-hint">也可以选择整个文件夹，全部在本机读取</div>
        </div>
        <input ref="fileRef" type="file" multiple style="display: none" @change="onFileChange" />
        <input
          ref="dirRef"
          type="file"
          webkitdirectory
          style="display: none"
          @change="onFileChange"
        />
        <div class="dup-pick">
          <el-button size="small" @click="pickFiles">选择文件</el-button>
          <el-button size="small" @click="pickDir">选择文件夹</el-button>
          <el-button size="small" :disabled="!files.length" @click="clear">清空</el-button>
        </div>

        <div class="dup-stat">
          <div class="lb-label">扫描概况</div>
          <div class="dup-stat-row">
            <span>文件</span>
            <b>{{ files.length }}</b>
          </div>
          <div class="dup-stat-row">
            <span>总体积</span>
            <b>{{ formatBytes(totalBytes) }}</b>
          </div>
          <div class="dup-stat-row">
            <span>重复组</span>
            <b>{{ stat.groups }}</b>
          </div>
          <div class="dup-stat-row">
            <span>可释放</span>
            <b class="hi">{{ formatBytes(stat.waste) }}</b>
          </div>
        </div>

        <div v-if="running" class="dup-progress">
          <el-progress :percentage="percent" :stroke-width="10" />
          <div class="dup-progress-note">
            正在比对 {{ progress.done }}/{{ progress.total }}
            <span v-if="progress.current">· {{ progress.current }}</span>
          </div>
          <el-button size="small" style="width: 100%; margin-top: 8px" @click="stop">
            停止比对
          </el-button>
        </div>

        <div v-if="results.length && !running" class="dup-acts">
          <el-button type="primary" style="width: 100%" @click="exportList">导出清单 .txt</el-button>
          <el-button style="width: 100%; margin-top: 8px" @click="copyList">复制清单</el-button>
        </div>

        <div class="dup-note">
          比对分两步：先按体积分组，再对同体积文件做 SHA-256 内容校验。浏览器无法删除磁盘文件，
          所以这里只输出清单，删除动作请在资源管理器里按清单执行。
        </div>
      </aside>

      <!-- 右：结果 -->
      <section class="dup-main">
        <div v-if="!files.length" class="dup-hero">
          <div class="hero-icon">🔍</div>
          <div class="hero-title">找出重复文件</div>
          <div class="hero-desc">
            选一批文件或整个文件夹，先按体积初筛、再按内容哈希精比，重复项分组列出并算出可释放空间。
          </div>
        </div>

        <div v-else-if="!results.length && !running" class="dup-hero">
          <div class="hero-icon">✅</div>
          <div class="hero-title">{{ files.length }} 个文件里没有发现重复</div>
          <div class="hero-desc">体积相同的文件才会进入哈希比对，这一步不会误判。</div>
        </div>

        <template v-else>
          <div v-for="(g, gi) in results" :key="g.hash + gi" class="dup-group">
            <div class="dup-group-head">
              <span class="dup-group-title">第 {{ gi + 1 }} 组</span>
              <span class="dup-group-size">{{ formatBytes(g.size) }} × {{ g.items.length }}</span>
              <span class="dup-group-waste">可释放 {{ formatBytes(g.size * (g.items.length - 1)) }}</span>
              <span class="dup-group-hash" :title="g.hash">sha256 {{ g.hash.slice(0, 12) }}…</span>
            </div>
            <div v-for="it in g.items" :key="it.id" class="dup-item">
              <span class="dup-item-name">{{ it.name }}</span>
              <span class="dup-item-path">{{ it.path }}</span>
            </div>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import ToolHeader from '../../components/ToolHeader.vue'
import {
  dupTools,
  hashTools,
  formatBytes,
  saveBlob,
  type DupFileLike,
  type DupGroup,
  type DupProgress,
} from '@localbox/core/index'
import { useToolHistory } from '../../composables/useTool'

interface Item extends DupFileLike {
  file: File
}

const files = ref<Item[]>([])
const results = ref<DupGroup<Item>[]>([])
const running = ref(false)
const cancel = ref(false)
const progress = ref<DupProgress>({ done: 0, total: 0 })
const fileRef = ref<HTMLInputElement | null>(null)
const dirRef = ref<HTMLInputElement | null>(null)
const record = useToolHistory('dupfinder')

const totalBytes = computed(() => files.value.reduce((n, f) => n + f.size, 0))
const stat = computed(() => dupTools.statDuplicates(results.value))
const percent = computed(() =>
  progress.value.total ? Math.round((progress.value.done / progress.value.total) * 100) : 0,
)

function pickFiles(): void {
  fileRef.value?.click()
}

function pickDir(): void {
  dirRef.value?.click()
}

function onFileChange(e: Event): void {
  const input = e.target as HTMLInputElement
  adopt(input.files)
  input.value = ''
}

function onDrop(e: DragEvent): void {
  adopt(e.dataTransfer?.files)
}

function adopt(list: FileList | null | undefined): void {
  if (!list?.length) return
  files.value = Array.from(list).map((f, i) => ({
    id: `${Date.now()}_${i}`,
    name: f.name,
    size: f.size,
    path: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name,
    file: f,
  }))
  results.value = []
  void run()
}

function clear(): void {
  cancel.value = true
  files.value = []
  results.value = []
  progress.value = { done: 0, total: 0 }
}

function stop(): void {
  cancel.value = true
}

async function run(): Promise<void> {
  const candidates = dupTools.groupBySize(files.value)
  if (!candidates.length) {
    ElMessage.info('没有体积相同的文件，直接判定无重复')
    return
  }
  running.value = true
  cancel.value = false
  progress.value = { done: 0, total: candidates.reduce((n, c) => n + c.items.length, 0) }
  try {
    const groups = await dupTools.refineGroups(
      candidates,
      async (item) => hashTools.hashFile('sha256', item.file),
      (p) => {
        progress.value = p
      },
      { shouldStop: () => cancel.value },
    )
    results.value = groups
    if (cancel.value) {
      ElMessage.warning(`已停止，显示已完成的 ${groups.length} 组结果`)
    } else if (groups.length) {
      const s = dupTools.statDuplicates(groups)
      ElMessage.success(`发现 ${s.groups} 组重复，可释放 ${formatBytes(s.waste)}`)
      record('查找重复文件', `${files.value.length} 个文件 → ${s.groups} 组 / ${formatBytes(s.waste)}`)
    }
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '比对失败')
  } finally {
    running.value = false
  }
}

function listText(): string {
  return dupTools.formatDupList(results.value)
}

function exportList(): void {
  void saveBlob('重复文件清单.txt', new Blob([listText()], { type: 'text/plain;charset=utf-8' }))
}

function copyList(): void {
  if (!navigator.clipboard) {
    ElMessage.error('当前环境不支持剪贴板，请手动复制')
    return
  }
  void navigator.clipboard
    .writeText(listText())
    .then(() => ElMessage.success('清单已复制'))
    .catch(() => ElMessage.error('复制失败'))
}
</script>

<style scoped>
.dup-layout {
  display: grid;
  grid-template-columns: minmax(250px, 330px) minmax(420px, 1fr);
  gap: 20px;
  align-items: start;
}
.dup-drop {
  border: 1px dashed var(--color-border);
  border-radius: 8px;
  padding: 24px 14px;
  text-align: center;
  cursor: pointer;
  transition: border-color 120ms ease;
}
.dup-drop:hover {
  border-color: var(--color-primary);
}
.dup-drop-icon {
  font-size: 30px;
}
.dup-drop-main {
  font-size: 13px;
  margin-top: 6px;
}
.dup-drop-hint {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}
.dup-pick {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}
.dup-stat {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px 14px;
  margin-top: 16px;
}
.dup-stat-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 4px 0;
  color: var(--color-text-secondary);
}
.dup-stat-row b {
  color: var(--color-text-primary);
}
.dup-stat-row b.hi {
  color: var(--color-primary);
}
.dup-progress {
  margin-top: 14px;
}
.dup-progress-note {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dup-acts {
  margin-top: 14px;
}
.dup-note {
  margin-top: 14px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--color-text-secondary);
  border-top: 1px dashed var(--color-border);
  padding-top: 12px;
}
.dup-main {
  min-width: 0;
}
.dup-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 320px;
  gap: 6px;
  padding: 20px;
  border: 1px dashed var(--color-border);
  border-radius: 8px;
}
.hero-icon {
  font-size: 38px;
}
.hero-title {
  font-size: 16px;
  font-weight: 600;
}
.hero-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  max-width: 460px;
  line-height: 1.7;
}
.dup-group {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  margin-bottom: 12px;
  overflow: hidden;
}
.dup-group-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 9px 14px;
  background: var(--color-bg-page);
  border-bottom: 1px solid var(--color-border);
  font-size: 12px;
}
.dup-group-title {
  font-weight: 700;
}
.dup-group-size {
  color: var(--color-text-secondary);
}
.dup-group-waste {
  color: var(--color-primary);
  font-weight: 600;
}
.dup-group-hash {
  margin-left: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: var(--color-text-secondary);
}
.dup-item {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--color-border);
}
.dup-item:last-child {
  border-bottom: none;
}
.dup-item-name {
  font-size: 13px;
  flex-shrink: 0;
}
.dup-item-path {
  font-size: 12px;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
