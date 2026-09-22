<template>
  <ToolPage tool-id="uuid">
    <view class="lb-card">
      <view class="lb-label">版本</view>
      <view class="lb-row">
        <view v-for="v in versions" :key="v" class="lb-chip" :class="{ active: version === v }" @click="version = v">
          {{ v }}
        </view>
      </view>
      <view class="lb-label">数量（1~10000）</view>
      <input v-model="count" class="lb-input" type="number" />
      <template v-if="version === 'v3' || version === 'v5'">
        <view class="lb-label">命名名称</view>
        <input v-model="name" class="lb-input" placeholder="输入名称" />
      </template>
      <button class="lb-btn" @click="gen">生成</button>
      <button class="lb-btn lb-btn-plain" @click="copyAll">复制全部</button>
      <button class="lb-btn lb-btn-plain" @click="exportTxt">导出 TXT</button>
    </view>
    <view v-if="list.length" class="lb-card">
      <view class="lb-label">结果（点击单条复制）</view>
      <scroll-view scroll-y style="max-height: 600rpx">
        <view v-for="(u, i) in list" :key="i" class="lb-uuid" @click="copyOne(u)">
          {{ i + 1 }}. {{ u }}
        </view>
      </scroll-view>
    </view>
    <view v-if="hist.length" class="lb-card">
      <view class="lb-label">本地历史记录（点击查看内容）</view>
      <view v-for="h in hist" :key="h.id" class="lb-hist">
        <view class="lb-hist-head" @click="toggle(h)">
          <view class="lb-hist-detail">{{ h.detail }}</view>
          <view class="lb-hist-time">{{ formatTime(h.time) }}</view>
        </view>
        <view v-if="openId === h.id" class="lb-hist-body">
          <template v-if="payloadOf(h)">
            <view v-if="payloadOf(h)?.truncated" class="lb-hist-note">数量较多，仅保存了前 {{ payloadOf(h)?.uuids.length }} 条。</view>
            <view v-for="(u, i) in payloadOf(h)?.uuids" :key="i" class="lb-uuid" @click="copyOne(u)">
              {{ i + 1 }}. {{ u }}
            </view>
            <button class="lb-btn lb-btn-plain" @click="restore(h)">恢复到结果区</button>
            <button class="lb-btn lb-btn-plain" @click="copyHist(h)">复制全部</button>
          </template>
          <view v-else class="lb-hist-note">该条旧记录未保存 UUID 内容。</view>
        </view>
      </view>
    </view>
  </ToolPage>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import { uuidTools, type HistoryItem, type UuidHistoryPayload, type UuidVersion } from '@localbox/core/index'
import { saveTextAs } from '../../utils/files'
import { useToolHistory } from '../../composables/useHistory'
import { store } from '../../store'

const versions: UuidVersion[] = ['v1', 'v3', 'v4', 'v5']
const version = ref<UuidVersion>('v4')
const count = ref('10')
const name = ref('')
const list = ref<string[]>([])
const hist = ref<HistoryItem[]>([])
const openId = ref('')
const record = useToolHistory('uuid')

function gen(): void {
  try {
    list.value = uuidTools.generateUuids(version.value, Number(count.value) || 1, {
      name: name.value,
      namespace: uuidTools.NAMESPACE_PRESETS.URL,
    })
    const payload = uuidTools.buildUuidHistoryPayload(version.value, list.value, {
      name: name.value,
      namespace: uuidTools.NAMESPACE_PRESETS.URL,
    })
    void record('生成UUID', uuidTools.summarizeUuidHistory(payload), payload).then(() => reloadHist())
  } catch (e) {
    uni.showToast({ title: e instanceof Error ? e.message : String(e), icon: 'none' })
  }
}

function copyOne(u: string): void {
  uni.setClipboardData({ data: u })
}
function copyAll(): void {
  uni.setClipboardData({ data: list.value.join('\n') })
}
function exportTxt(): void {
  saveTextAs(`uuid-${Date.now()}.txt`, uuidTools.uuidsToText(list.value))
  record('导出UUID', `${list.value.length} 条`)
}

async function reloadHist(): Promise<void> {
  const all = await store.getHistory()
  hist.value = all.filter((h) => h.toolId === 'uuid' && h.action === '生成UUID').slice(0, 10)
}

function payloadOf(h: HistoryItem): UuidHistoryPayload | null {
  return uuidTools.parseUuidHistory(h)
}

function toggle(h: HistoryItem): void {
  openId.value = openId.value === h.id ? '' : h.id
}

function restore(h: HistoryItem): void {
  const payload = uuidTools.parseUuidHistory(h)
  if (!payload) {
    uni.showToast({ title: '该条旧记录未保存 UUID 内容', icon: 'none' })
    return
  }
  version.value = payload.version
  count.value = String(payload.count)
  if (payload.name) name.value = payload.name
  list.value = payload.uuids.slice()
  uni.showToast({ title: '已恢复历史 UUID', icon: 'none' })
}

function copyHist(h: HistoryItem): void {
  const payload = uuidTools.parseUuidHistory(h)
  if (!payload) return
  uni.setClipboardData({ data: payload.uuids.join('\n') })
}

function formatTime(t: number): string {
  const d = new Date(t)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

onMounted(() => {
  void reloadHist()
})
</script>

<style scoped>
.lb-uuid {
  font-size: 24rpx;
  padding: 12rpx 0;
  border-bottom: 1px solid var(--color-border);
  word-break: break-all;
}
.lb-hist {
  border-bottom: 1px solid var(--color-border);
  padding: 8rpx 0;
}
.lb-hist-head {
  padding: 12rpx 0;
}
.lb-hist-detail {
  font-size: 24rpx;
  color: var(--color-text-primary);
  word-break: break-all;
}
.lb-hist-time {
  font-size: 22rpx;
  color: var(--color-text-secondary);
  margin-top: 6rpx;
}
.lb-hist-body {
  padding-bottom: 12rpx;
}
.lb-hist-note {
  font-size: 22rpx;
  color: var(--color-warning);
  margin-bottom: 8rpx;
}
</style>
