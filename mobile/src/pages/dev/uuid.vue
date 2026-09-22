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
  </ToolPage>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import { uuidTools, type UuidVersion } from '@localbox/core/index'
import { saveTextAs } from '../../utils/files'
import { useToolHistory } from '../../composables/useHistory'

const versions: UuidVersion[] = ['v1', 'v3', 'v4', 'v5']
const version = ref<UuidVersion>('v4')
const count = ref('10')
const name = ref('')
const list = ref<string[]>([])
const record = useToolHistory('uuid')

function gen(): void {
  try {
    list.value = uuidTools.generateUuids(version.value, Number(count.value) || 1, {
      name: name.value,
      namespace: uuidTools.NAMESPACE_PRESETS.URL,
    })
    record('生成UUID', `${version.value} × ${list.value.length}`)
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
</script>

<style scoped>
.lb-uuid {
  font-size: 24rpx;
  padding: 12rpx 0;
  border-bottom: 1px solid var(--color-border);
  word-break: break-all;
}
</style>
