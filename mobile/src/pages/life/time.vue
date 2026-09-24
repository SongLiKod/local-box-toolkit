<template>
  <ToolPage tool-id="time-convert">
    <view class="lb-card">
      <view class="lb-chip-row">
        <view
          v-for="t in tabs"
          :key="t.id"
          class="lb-chip"
          :class="{ active: tab === t.id }"
          @click="tab = t.id"
        >
          {{ t.name }}
        </view>
      </view>

      <template v-if="tab === 'tz'">
        <view class="lb-label">日期时间</view>
        <input v-model="tz.datetime" class="lb-input" placeholder="2026-09-22 10:30:00" />
        <view class="lb-label">原时区</view>
        <picker :range="zones" :value="tzFromIdx" @change="tz.from = zones[Number($event.detail.value)]">
          <view class="lb-input">{{ tz.from }}</view>
        </picker>
        <view class="lb-label">目标时区</view>
        <picker :range="zones" :value="tzToIdx" @change="tz.to = zones[Number($event.detail.value)]">
          <view class="lb-input">{{ tz.to }}</view>
        </picker>
        <button class="lb-btn" @click="doTz">换算</button>
        <template v-if="tzResult">
          <view class="lb-label">目标时间</view>
          <view class="lb-output">{{ tzResult.local }}（{{ tzResult.offset }}）</view>
          <view class="lb-label">ISO</view>
          <view class="lb-output">{{ tzResult.iso }}</view>
        </template>
      </template>

      <template v-else-if="tab === 'diff'">
        <view class="lb-label">起始日期</view>
        <input v-model="diff.a" class="lb-input" placeholder="2026-01-01" />
        <view class="lb-label">结束日期</view>
        <input v-model="diff.b" class="lb-input" placeholder="2026-12-31" />
        <button class="lb-btn" @click="doDiff">计算相差天数</button>
        <view v-if="diffResult !== null" class="lb-output">相差 {{ diffResult }} 天</view>
      </template>

      <template v-else>
        <view class="lb-label">起始日期（留空为今天）</view>
        <input v-model="add.from" class="lb-input" placeholder="今天" />
        <view class="lb-label">加减天数（负数为往前）</view>
        <input v-model="add.days" type="number" class="lb-input" placeholder="30" />
        <button class="lb-btn" @click="doAdd">计算</button>
        <view v-if="addResult" class="lb-output">{{ addResult }}</view>
      </template>
    </view>
  </ToolPage>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import { timezoneTools, type ZonedResult } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useHistory'

const zones = timezoneTools.COMMON_ZONES
const tabs = [
  { id: 'tz', name: '时区换算' },
  { id: 'diff', name: '日期差值' },
  { id: 'add', name: '日期加减' },
] as const
const tab = ref<'tz' | 'diff' | 'add'>('tz')

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
function nowStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
function todayStr(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const year = new Date().getFullYear()
const tz = reactive({ datetime: nowStr(), from: 'Asia/Shanghai', to: 'America/New_York' })
const tzResult = ref<ZonedResult | null>(null)
const diff = reactive({ a: `${year}-01-01`, b: `${year}-12-31` })
const diffResult = ref<number | null>(null)
const add = reactive({ from: '', days: '30' })
const addResult = ref('')
const record = useToolHistory('time-convert')

const tzFromIdx = computed(() => Math.max(0, zones.indexOf(tz.from)))
const tzToIdx = computed(() => Math.max(0, zones.indexOf(tz.to)))

function err(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

function doTz(): void {
  try {
    tzResult.value = timezoneTools.convertTimezone(tz.datetime, tz.from, tz.to)
    void record('时区换算', `${tz.from}→${tz.to}`)
  } catch (e) {
    uni.showToast({ title: err(e), icon: 'none' })
  }
}

function doDiff(): void {
  try {
    diffResult.value = timezoneTools.daysBetween(diff.a, diff.b)
    void record('日期差', `${diffResult.value} 天`)
  } catch (e) {
    uni.showToast({ title: err(e), icon: 'none' })
  }
}

function doAdd(): void {
  try {
    const days = Number(add.days)
    if (!Number.isFinite(days)) {
      uni.showToast({ title: '天数需为数字', icon: 'none' })
      return
    }
    addResult.value = timezoneTools.addDuration(days, add.from || todayStr())
    void record('日期加减', `${days} 天`)
  } catch (e) {
    uni.showToast({ title: err(e), icon: 'none' })
  }
}
</script>
