<template>
  <ToolPage tool-id="timestamp">
    <view class="lb-card">
      <view class="lb-label">当前时间戳：{{ nowSec }} 秒 / {{ nowMs }} 毫秒</view>
      <button class="lb-btn lb-btn-plain" @click="useNow">填入当前时间戳</button>
      <view class="lb-label">时间戳 → 日期时间</view>
      <input v-model="tsInput" class="lb-input" type="number" placeholder="10位或13位时间戳" />
      <button class="lb-btn" @click="tsToDate">转换</button>
      <view v-if="dateInfo" class="lb-output">
本地：{{ dateInfo.local }}
ISO：{{ dateInfo.iso }}
UTC：{{ dateInfo.utc }}</view>
      <view class="lb-label">日期时间 → 时间戳</view>
      <input v-model="dateInput" class="lb-input" placeholder="2026-09-22 10:30:00" />
      <button class="lb-btn" @click="dateToTs">转换</button>
      <view v-if="tsInfo" class="lb-output">
秒：{{ tsInfo.seconds }}
毫秒：{{ tsInfo.millis }}</view>
    </view>
  </ToolPage>
</template>

<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import { timeTools, type TimestampInfo } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useHistory'

const tsInput = ref('')
const dateInput = ref('')
const dateInfo = ref<TimestampInfo | null>(null)
const tsInfo = ref<TimestampInfo | null>(null)
const nowSec = ref(0)
const nowMs = ref(0)
const record = useToolHistory('timestamp')

const timer = setInterval(() => {
  const n = timeTools.nowTimestamp()
  nowSec.value = n.seconds
  nowMs.value = n.millis
}, 1000)
onUnmounted(() => clearInterval(timer))

function useNow(): void {
  tsInput.value = String(nowSec.value)
  tsToDate()
}
function tsToDate(): void {
  try {
    dateInfo.value = timeTools.timestampToDate(Number(tsInput.value))
    record('时间戳转日期', tsInput.value)
  } catch (e) {
    uni.showToast({ title: e instanceof Error ? e.message : '无效', icon: 'none' })
  }
}
function dateToTs(): void {
  try {
    tsInfo.value = timeTools.dateToTimestamp(dateInput.value)
    record('日期转时间戳', dateInput.value)
  } catch (e) {
    uni.showToast({ title: e instanceof Error ? e.message : '解析失败', icon: 'none' })
  }
}
</script>
