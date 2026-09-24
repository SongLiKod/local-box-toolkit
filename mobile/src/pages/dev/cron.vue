<template>
  <ToolPage tool-id="cron">
    <view class="lb-card">
      <view class="lb-label">表达式解析（分 时 日 月 周，可含秒）</view>
      <input v-model="input" class="lb-input" placeholder="0 9 * * *" />
      <button class="lb-btn" @click="analyzeInput">解析</button>

      <view class="lb-row lb-chips">
        <view v-for="p in presets" :key="p.expr" class="lb-chip" @click="applyPreset(p)">{{ p.label }}</view>
      </view>

      <view v-if="error" class="lb-err">{{ error }}</view>
      <template v-if="parsed">
        <view class="lb-output lb-expr">{{ parsed.expr }}</view>
        <view class="lb-desc">{{ parsed.description }}</view>
        <view v-for="f in fieldRows" :key="f.label + f.raw" class="lb-field">
          {{ f.label }} {{ f.raw }}：{{ f.meaning }}
        </view>
        <view class="lb-label">接下来 {{ runs.length }} 次执行（本地时区）</view>
        <view v-for="r in runs" :key="r" class="lb-output">{{ r }}</view>
      </template>

      <view class="lb-label">可视化生成</view>
      <view class="lb-row lb-chips">
        <view
          v-for="m in modes"
          :key="m.value"
          :class="['lb-chip', { active: mode === m.value }]"
          @click="mode = m.value"
        >
          {{ m.label }}
        </view>
      </view>

      <view v-if="mode === 'interval'" class="lb-form-row">
        <view class="lb-hint">每隔</view>
        <input v-model="stepN" type="number" class="lb-input lb-num" />
        <view class="lb-hint">分钟执行一次</view>
      </view>
      <template v-else>
        <view v-if="mode === 'monthly'" class="lb-form-row">
          <view class="lb-hint">每月</view>
          <input v-model="day" type="number" class="lb-input lb-num" />
          <view class="lb-hint">号（1-31）</view>
        </view>
        <view v-if="mode === 'weekly'" class="lb-form-row">
          <view class="lb-hint">每周</view>
          <input v-model="weekday" type="number" class="lb-input lb-num" />
          <view class="lb-hint">（1=周一 … 7=周日）</view>
        </view>
        <view class="lb-form-row">
          <view class="lb-hint">时间</view>
          <input v-model="hour" type="number" class="lb-input lb-num" />
          <view class="lb-hint">时（0-23）</view>
          <input v-model="minute" type="number" class="lb-input lb-num" />
          <view class="lb-hint">分（0-59）</view>
        </view>
      </template>
      <button class="lb-btn lb-btn-plain" @click="generate">生成表达式</button>
    </view>
  </ToolPage>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import { cronTools, type CronParsed } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useHistory'

type GenMode = 'interval' | 'daily' | 'weekly' | 'monthly'

const input = ref('0 9 * * *')
const error = ref('')
const parsed = ref<CronParsed | null>(null)
const runs = ref<string[]>([])
const presets = cronTools.CRON_PRESETS
const record = useToolHistory('cron')

const modes: { label: string; value: GenMode }[] = [
  { label: '每隔N分钟', value: 'interval' },
  { label: '每天', value: 'daily' },
  { label: '每周', value: 'weekly' },
  { label: '每月', value: 'monthly' },
]
const mode = ref<GenMode>('daily')
const stepN = ref('5')
const hour = ref('9')
const minute = ref('0')
const weekday = ref('1')
const day = ref('1')

const fieldRows = computed(() =>
  parsed.value
    ? parsed.value.fields.map((f) => ({
        label: f.label,
        raw: f.raw,
        meaning: cronTools.describeField(f),
      }))
    : []
)

function analyze(expr: string, action?: string): void {
  try {
    const p = cronTools.parseCron(expr)
    parsed.value = p
    input.value = p.expr
    error.value = ''
    runs.value = cronTools.nextRunTimes(p.expr, 5).map((d) => cronTools.formatRunTime(d))
    if (action) void record(action, p.expr)
  } catch (e) {
    parsed.value = null
    runs.value = []
    error.value = e instanceof Error ? e.message : String(e)
  }
}

function analyzeInput(): void {
  analyze(input.value, '解析表达式')
}

function applyPreset(p: { label: string; expr: string }): void {
  analyze(p.expr, '解析表达式')
}

function num(text: string): number {
  const v = Number(text)
  if (!Number.isInteger(v)) throw new Error(`应为整数，当前 "${text}"`)
  return v
}

function check(v: number, min: number, max: number, what: string): number {
  if (v < min || v > max) throw new Error(`${what}范围 ${min}-${max}，当前 ${v}`)
  return v
}

function generate(): void {
  try {
    let expr: string
    if (mode.value === 'interval') {
      const n = check(num(stepN), 1, 59, '间隔分钟数')
      expr = `*/${n} * * * *`
    } else {
      const m = check(num(minute), 0, 59, '分钟')
      const h = check(num(hour), 0, 23, '小时')
      if (mode.value === 'daily') {
        expr = `${m} ${h} * * *`
      } else if (mode.value === 'weekly') {
        const w = check(num(weekday), 1, 7, '星期')
        expr = `${m} ${h} * * ${w}`
      } else {
        const d = check(num(day), 1, 31, '日期')
        expr = `${m} ${h} ${d} * *`
      }
    }
    analyze(expr, '生成表达式')
  } catch (e) {
    parsed.value = null
    runs.value = []
    error.value = e instanceof Error ? e.message : String(e)
  }
}
</script>

<style scoped>
.lb-chips {
  margin-top: 16rpx;
  gap: 12rpx;
}
.lb-expr {
  font-family: Consolas, Monaco, monospace;
  font-size: 32rpx;
  font-weight: 600;
  word-break: break-all;
}
.lb-field {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  line-height: 1.7;
}
.lb-err {
  margin-top: 16rpx;
  color: var(--color-error);
  font-size: 26rpx;
  line-height: 1.6;
}
.lb-form-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 8rpx;
}
.lb-hint {
  font-size: 24rpx;
  color: var(--color-text-secondary);
}
.lb-num {
  width: 130rpx;
  flex: none;
  text-align: center;
}
</style>
