<template>
  <ToolPage tool-id="dupfinder">
    <view class="lb-card">
      <text class="lb-title">重复文件查找</text>
      <text class="dup-sub">先按体积分组，再做 SHA-256 内容精比，全部在本机读取</text>
      <button class="lb-btn lb-btn-primary dup-btn" :disabled="running" @click="pick">
        选择文件开始查找
      </button>

      <view class="dup-stat">
        <view class="dup-cell">
          <text class="dup-n">{{ files.length }}</text>
          <text class="dup-t">文件</text>
        </view>
        <view class="dup-cell">
          <text class="dup-n">{{ formatBytes(totalBytes) }}</text>
          <text class="dup-t">总体积</text>
        </view>
        <view class="dup-cell">
          <text class="dup-n">{{ stat.groups }}</text>
          <text class="dup-t">重复组</text>
        </view>
        <view class="dup-cell">
          <text class="dup-n hi">{{ formatBytes(stat.waste) }}</text>
          <text class="dup-t">可释放</text>
        </view>
      </view>

      <view v-if="running" class="dup-prog">
        <progress :percent="percent" stroke-width="6" activeColor="#3370FF" />
        <text class="dup-note">正在比对 {{ progress.done }}/{{ progress.total }}</text>
        <button class="lb-btn dup-stop" @click="cancel = true">停止比对</button>
      </view>

      <view v-if="!files.length" class="lb-empty">
        <text>选择一批文件，找出可以删掉的重复项</text>
      </view>
      <view v-else-if="!results.length && !running" class="lb-empty">
        <text>{{ files.length }} 个文件里没有发现重复</text>
      </view>

      <view v-for="(g, gi) in results" :key="`${g.hash}-${gi}`" class="dup-group">
        <view class="dup-ghead">
          <text class="dup-gtitle">第 {{ gi + 1 }} 组</text>
          <text class="dup-gsize">{{ formatBytes(g.size) }} × {{ g.items.length }}</text>
          <text class="dup-gwaste">可释放 {{ formatBytes(g.size * (g.items.length - 1)) }}</text>
        </view>
        <view v-for="it in g.items" :key="it.id" class="dup-item">
          <text class="dup-iname">{{ it.name }}</text>
          <text class="dup-hash">sha256 {{ g.hash.slice(0, 12) }}…</text>
        </view>
      </view>

      <button v-if="results.length && !running" class="lb-btn dup-btn" @click="copyList">
        复制清单
      </button>
    </view>
  </ToolPage>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import {
  dupTools,
  hashTools,
  formatBytes,
  type DupFileLike,
  type DupGroup,
  type DupProgress,
} from '@localbox/core/index'
import { chooseFiles } from '../../utils/files'
import { useToolHistory } from '../../composables/useHistory'

interface Item extends DupFileLike {
  file: File
}

const files = ref<Item[]>([])
const results = ref<DupGroup<Item>[]>([])
const running = ref(false)
const cancel = ref(false)
const progress = ref<DupProgress>({ done: 0, total: 0 })
const record = useToolHistory('dupfinder')

const totalBytes = computed(() => files.value.reduce((n, f) => n + f.size, 0))
const stat = computed(() => dupTools.statDuplicates(results.value))
const percent = computed(() =>
  progress.value.total ? Math.round((progress.value.done / progress.value.total) * 100) : 0,
)

async function pick(): Promise<void> {
  let list: File[] = []
  try {
    list = await chooseFiles('*/*', true)
  } catch {
    return
  }
  if (!list.length) return
  files.value = list.map((f, i) => ({
    id: `${Date.now()}_${i}`,
    name: f.name,
    size: f.size,
    path: f.name,
    file: f,
  }))
  results.value = []
  await run()
}

async function run(): Promise<void> {
  const candidates = dupTools.groupBySize(files.value)
  if (!candidates.length) {
    uni.showToast({ title: '没有体积相同的文件', icon: 'none' })
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
      uni.showToast({ title: `已停止，完成 ${groups.length} 组`, icon: 'none' })
    } else if (groups.length) {
      const s = dupTools.statDuplicates(groups)
      uni.showToast({ title: `发现 ${s.groups} 组重复`, icon: 'success' })
      record('查找重复文件', `${files.value.length} 个文件 → ${s.groups} 组`)
    } else {
      uni.showToast({ title: '没有发现重复', icon: 'none' })
    }
  } catch (err) {
    uni.showToast({ title: err instanceof Error ? err.message : '比对失败', icon: 'none' })
  } finally {
    running.value = false
  }
}

function copyList(): void {
  uni.setClipboardData({
    data: dupTools.formatDupList(results.value),
    success: () => uni.showToast({ title: '清单已复制', icon: 'success' }),
  })
}
</script>

<style scoped>
.dup-sub {
  display: block;
  font-size: 24rpx;
  color: var(--color-text-secondary);
  margin: 8rpx 0 20rpx;
  line-height: 1.7;
}
.dup-btn {
  width: 100%;
}
.dup-stat {
  display: flex;
  border: 1px solid var(--color-border);
  border-radius: 14rpx;
  overflow: hidden;
  margin-top: 24rpx;
}
.dup-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  padding: 18rpx 6rpx;
  border-right: 1px solid var(--color-border);
}
.dup-cell:last-child {
  border-right: none;
}
.dup-n {
  font-size: 28rpx;
  font-weight: 700;
}
.dup-n.hi {
  color: var(--color-primary);
}
.dup-t {
  font-size: 20rpx;
  color: var(--color-text-secondary);
}
.dup-prog {
  margin-top: 24rpx;
}
.dup-note {
  display: block;
  font-size: 22rpx;
  color: var(--color-text-secondary);
  margin-top: 12rpx;
}
.dup-stop {
  width: 100%;
  margin-top: 16rpx;
}
.dup-group {
  border: 1px solid var(--color-border);
  border-radius: 14rpx;
  margin-top: 20rpx;
  overflow: hidden;
}
.dup-ghead {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 14rpx 18rpx;
  background: var(--color-bg-page);
  border-bottom: 1px solid var(--color-border);
}
.dup-gtitle {
  font-size: 24rpx;
  font-weight: 700;
}
.dup-gsize {
  font-size: 22rpx;
  color: var(--color-text-secondary);
}
.dup-gwaste {
  font-size: 22rpx;
  color: var(--color-primary);
  font-weight: 600;
  margin-left: auto;
}
.dup-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  padding: 14rpx 18rpx;
  border-bottom: 1px solid var(--color-border);
}
.dup-item:last-child {
  border-bottom: none;
}
.dup-iname {
  font-size: 26rpx;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dup-hash {
  font-size: 20rpx;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}
</style>
