<template>
  <ToolPage tool-id="timestamp">
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

      <!-- 时间戳互转 -->
      <template v-if="tab === 'convert'">
        <view class="lb-label">当前时间戳：{{ nowSec }} 秒 / {{ nowMs }} 毫秒</view>
        <button class="lb-btn lb-btn-plain" @click="useNow">填入当前时间戳</button>
        <view class="lb-label">时间戳 → 日期时间</view>
        <input v-model="tsInput" class="lb-input" type="number" placeholder="10位或13位时间戳" />
        <button class="lb-btn" @click="tsToDate">转换</button>
        <view v-if="dateInfo" class="lb-output">
本地：{{ dateInfo.local }}
相对现在：{{ relativeOf(dateInfo.millis) }}
ISO：{{ dateInfo.iso }}
UTC：{{ dateInfo.utc }}</view>
        <view class="lb-label">日期时间 → 时间戳</view>
        <input v-model="dateInput" class="lb-input" placeholder="2026-09-22 10:30:00" />
        <button class="lb-btn" @click="dateToTs">转换</button>
        <view v-if="tsInfo" class="lb-output">
秒：{{ tsInfo.seconds }}
毫秒：{{ tsInfo.millis }}
相对现在：{{ relativeOf(tsInfo.millis) }}</view>
      </template>

      <!-- 世界时钟 -->
      <template v-else-if="tab === 'world'">
        <view class="lb-row-inline">
          <button class="lb-btn lb-btn-plain" @click="live = true">{{ live ? '● 实时中' : '实时' }}</button>
          <input v-model="worldTs" class="lb-input wt-ts" placeholder="指定时间戳" type="number" />
          <button class="lb-btn" @click="applyWorldTs">查看</button>
        </view>
        <view class="lb-label">{{ worldHint }}</view>
        <view v-for="c in worldRows" :key="c.zone" class="wt-row">
          <view class="wt-c1">
            <text class="wt-cityname">{{ c.label }}</text>
            <text class="wt-sub">{{ c.weekday }} · {{ c.offset }}</text>
          </view>
          <view class="wt-c2">
            <text class="wt-clock">{{ c.time }}</text>
            <text class="wt-sub">{{ c.date.slice(5) }}</text>
          </view>
          <view class="wt-c3">
            <text class="wt-badge">{{ c.isDaytime ? '☀️' : '🌙' }} {{ statusText(c) }}</text>
            <text class="wt-sub">{{ fmtDiff(c.diffMinutes) }}</text>
          </view>
        </view>
        <view class="lb-label">添加城市</view>
        <picker :range="addLabels" :value="0" @change="addZone">
          <view class="lb-input">{{ addLabels.length ? '选择要添加的城市…' : '已添加全部可选城市' }}</view>
        </picker>
      </template>

      <!-- 会议时间对比 -->
      <template v-else>
        <view class="lb-label">计划日期（按基准城市解释）</view>
        <input v-model="meetingDate" class="lb-input" placeholder="2026-09-22" />
        <view class="lb-label">对比城市（点选切换）</view>
        <view class="lb-chip-row">
          <view
            v-for="z in zoneChips"
            :key="z"
            class="lb-chip"
            :class="{ active: meetingZones.includes(z) }"
            @click="toggleZone(z)"
          >
            {{ shortZone(z) }}
          </view>
        </view>
        <picker :range="addMeetingLabels" :value="0" @change="addMeetingZone">
          <view class="lb-input">添加更多城市…</view>
        </picker>

        <view class="lb-label">工作时段</view>
        <view class="lb-row-inline">
          <picker :range="hourLabels" :value="workStart" @change="workStart = Number($event.detail.value)">
            <view class="lb-input wt-hour">{{ workStart }}:00</view>
          </picker>
          <text class="lb-label">至</text>
          <picker :range="hourLabels" :value="workEnd" @change="workEnd = Number($event.detail.value)">
            <view class="lb-input wt-hour">{{ workEnd }}:00</view>
          </picker>
        </view>
        <view class="lb-label">时间粒度</view>
        <view class="lb-chip-row">
          <view
            v-for="s in steps"
            :key="s"
            class="lb-chip"
            :class="{ active: stepMinutes === s }"
            @click="stepMinutes = s"
          >
            {{ s }} 分钟
          </view>
        </view>
        <view class="lb-row-inline">
          <switch :checked="excludeWeekend" @change="excludeWeekend = $event.detail.value" />
          <text class="lb-label">排除周末</text>
        </view>
        <button class="lb-btn" @click="buildPlan">生成对比</button>

        <template v-if="plan">
          <view class="lb-label">推荐时段（{{ plan.date }}）</view>
          <view v-if="plan.available.length" class="lb-chip-row">
            <view v-for="r in plan.available" :key="r.start" class="lb-chip active">
              {{ r.start }}–{{ r.end }}
            </view>
          </view>
          <view v-else class="lb-output">没有所有城市都处于工作时段的时间，可放宽时段或换日期</view>

          <view v-for="slot in plan.slots" :key="slot.millis" class="mt-row" :class="{ ok: slot.ok }">
            <view class="mt-time">
              <text class="mt-hour">{{ slot.time }}</text>
              <text class="mt-flag">{{ slot.ok ? '✅' : '' }}</text>
            </view>
            <view class="mt-zones">
              <text
                v-for="(c, i) in slot.clocks"
                :key="slot.time + i"
                class="mt-zone"
                :class="{ in: c.inWorkHours }"
              >
                {{ shortZone(plan.zones[i]) }} {{ c.time }}{{ dayMark(c, slot.date) }}
              </text>
            </view>
          </view>
        </template>
      </template>
    </view>
  </ToolPage>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import { timeTools, worldTools, type MeetingPlan, type TimestampInfo, type ZoneClock } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useHistory'

const tabs = [
  { id: 'convert', name: '互转' },
  { id: 'world', name: '世界时钟' },
  { id: 'meeting', name: '会议时间' },
] as const
const tab = ref<'convert' | 'world' | 'meeting'>('convert')

const localZone = worldTools.localZone()
const allZones = worldTools.zoneOptions()
const zoneLabel = worldTools.zoneLabel
const record = useToolHistory('timestamp')

const nowSec = ref(0)
const nowMs = ref(0)
const timer = setInterval(() => {
  const n = timeTools.nowTimestamp()
  nowSec.value = n.seconds
  nowMs.value = n.millis
}, 1000)
onUnmounted(() => clearInterval(timer))

function err(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}
function relativeOf(millis: number): string {
  return worldTools.relativeTime(millis, nowMs.value)
}

/* ---------- 时间戳互转 ---------- */

const tsInput = ref('')
const dateInput = ref('')
const dateInfo = ref<TimestampInfo | null>(null)
const tsInfo = ref<TimestampInfo | null>(null)

function useNow(): void {
  tsInput.value = String(nowSec.value)
  tsToDate()
}
function tsToDate(): void {
  try {
    dateInfo.value = timeTools.timestampToDate(Number(tsInput.value))
    void record('时间戳转日期', tsInput.value)
  } catch (e) {
    uni.showToast({ title: err(e), icon: 'none' })
  }
}
function dateToTs(): void {
  try {
    tsInfo.value = timeTools.dateToTimestamp(dateInput.value)
    void record('日期转时间戳', dateInput.value)
  } catch (e) {
    uni.showToast({ title: err(e), icon: 'none' })
  }
}

/* ---------- 世界时钟 ---------- */

const live = ref(true)
const worldTs = ref('')
const fixedMillis = ref(Date.now())
const zones = ref<string[]>(worldTools.defaultZones())

const worldMillis = computed(() => (live.value ? nowMs.value : fixedMillis.value))
const worldRows = computed(() =>
  worldTools.getWorldClock(worldMillis.value, zones.value, { baseZone: localZone })
)
const worldHint = computed(() =>
  live.value ? '每秒实时刷新' : `正在查看 ${timeTools.timestampToDate(fixedMillis.value).local}`
)
const addZoneList = computed(() => allZones.filter((o) => !zones.value.includes(o.zone)))
const addLabels = computed(() => addZoneList.value.map((o) => o.label))

function addZone(e: { detail: { value: number | string } }): void {
  const item = addZoneList.value[Number(e.detail.value)]
  if (!item) return
  zones.value = [...zones.value, item.zone]
  void record('添加城市', item.zone)
}
function applyWorldTs(): void {
  const raw = worldTs.value.trim()
  if (!raw) return
  try {
    fixedMillis.value = timeTools.timestampToDate(Number(raw)).millis
    live.value = false
  } catch (e) {
    uni.showToast({ title: err(e), icon: 'none' })
  }
}
function statusText(c: ZoneClock): string {
  if (c.isWeekend) return '休息日'
  return c.inWorkHours ? '工作中' : '非工作'
}
function fmtDiff(mins: number): string {
  if (mins === 0) return '与本地相同'
  const sign = mins > 0 ? '+' : '-'
  const abs = Math.abs(mins)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `${sign}${h} 时${m ? ` ${m} 分` : ''} 时差`
}
function shortZone(zone: string): string {
  const label = zoneLabel(zone)
  const idx = label.lastIndexOf('·')
  return idx >= 0 ? label.slice(idx + 1) : label
}

/* ---------- 会议时间对比 ---------- */

const steps = [15, 30, 60]
const hours = Array.from({ length: 25 }, (_, i) => i)
const hourLabels = hours.map((h) => `${h}:00`)
const defaultMeeting = worldTools.defaultZones().slice(0, 3)
const meetingDate = ref(worldTools.todayInZone(localZone))
const meetingZones = ref<string[]>(defaultMeeting)
const workStart = ref(9)
const workEnd = ref(18)
const stepMinutes = ref(60)
const excludeWeekend = ref(false)
const plan = ref<MeetingPlan | null>(null)

const baseChips = [
  localZone,
  ...worldTools.DEFAULT_ZONES,
  'Asia/Singapore',
  'Europe/Paris',
  'America/Chicago',
  'Australia/Sydney',
  'Asia/Dubai',
]
const zoneChips = computed(() => {
  const set = new Set([...baseChips, ...meetingZones.value])
  return allZones.filter((o) => set.has(o.zone)).map((o) => o.zone)
})
const addMeetingList = computed(() => allZones.filter((o) => !meetingZones.value.includes(o.zone)))
const addMeetingLabels = computed(() => addMeetingList.value.map((o) => o.label))

function toggleZone(zone: string): void {
  if (meetingZones.value.includes(zone)) {
    if (meetingZones.value.length <= 1) return
    meetingZones.value = meetingZones.value.filter((z) => z !== zone)
  } else {
    meetingZones.value = [...meetingZones.value, zone]
  }
}
function addMeetingZone(e: { detail: { value: number | string } }): void {
  const item = addMeetingList.value[Number(e.detail.value)]
  if (item) meetingZones.value = [...meetingZones.value, item.zone]
}
function dayMark(c: ZoneClock, refDate: string): string {
  if (c.date === refDate) return ''
  const diff = Math.round(
    (Date.parse(`${c.date}T00:00:00Z`) - Date.parse(`${refDate}T00:00:00Z`)) / 86400000
  )
  return diff > 0 ? `(+${diff}天)` : `(${diff}天)`
}
function buildPlan(): void {
  try {
    plan.value = worldTools.meetingPlan({
      zones: meetingZones.value,
      refZone: meetingZones.value[0],
      date: meetingDate.value,
      workStart: workStart.value,
      workEnd: workEnd.value,
      stepMinutes: stepMinutes.value,
      excludeWeekend: excludeWeekend.value,
    })
    void record('会议时间对比', `${meetingDate.value} · ${meetingZones.value.length} 个城市`)
  } catch (e) {
    plan.value = null
    uni.showToast({ title: err(e), icon: 'none' })
  }
}
</script>

<style scoped>
.lb-row-inline {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex-wrap: wrap;
  margin-bottom: 16rpx;
}
.wt-ts {
  flex: 1;
  min-width: 200rpx;
}
.wt-hour {
  min-width: 140rpx;
  text-align: center;
}
.wt-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx;
  margin-bottom: 12rpx;
  border: 1px solid var(--color-border);
  border-radius: 12rpx;
  background: var(--color-bg-page);
}
.wt-c1 {
  flex: 1;
  min-width: 0;
}
.wt-c2 {
  width: 130rpx;
  text-align: center;
}
.wt-c3 {
  width: 190rpx;
  text-align: right;
}
.wt-cityname {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
}
.wt-clock {
  display: block;
  font-size: 34rpx;
  font-weight: 600;
  font-family: Consolas, Monaco, monospace;
}
.wt-badge {
  display: block;
  font-size: 24rpx;
  color: var(--color-text-primary);
}
.wt-sub {
  display: block;
  font-size: 22rpx;
  color: var(--color-text-secondary);
}
.mt-row {
  display: flex;
  gap: 16rpx;
  padding: 12rpx 16rpx;
  border-bottom: 1px solid var(--color-border);
  opacity: 0.75;
}
.mt-row.ok {
  opacity: 1;
  background: var(--color-primary-light, rgba(64, 158, 255, 0.12));
  border-radius: 8rpx;
}
.mt-time {
  width: 130rpx;
  flex-shrink: 0;
}
.mt-hour {
  font-family: Consolas, Monaco, monospace;
  font-size: 28rpx;
  font-weight: 600;
}
.mt-flag {
  font-size: 22rpx;
}
.mt-zones {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx 16rpx;
}
.mt-zone {
  font-size: 24rpx;
  color: var(--color-text-secondary);
}
.mt-zone.in {
  color: var(--color-success, #67c23a);
  font-weight: 600;
}
</style>
