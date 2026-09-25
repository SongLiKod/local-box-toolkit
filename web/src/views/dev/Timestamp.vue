<template>
  <div class="lb-card">
    <ToolHeader tool-id="timestamp" />
    <el-tabs v-model="tab">
      <!-- 时间戳互转 -->
      <el-tab-pane label="时间戳互转" name="convert">
        <div class="lb-row lb-section">
          <el-button @click="useNow">当前时间戳</el-button>
          <span class="lb-now">秒 {{ now.seconds }} / 毫秒 {{ now.millis }}</span>
        </div>
        <el-row :gutter="20">
          <el-col :span="12">
            <div class="lb-label">时间戳 → 日期时间（10位按秒、13位按毫秒自动识别）</div>
            <el-input v-model="tsInput" placeholder="例如 1758470400" class="lb-section">
              <template #append><el-button @click="tsToDate">转换</el-button></template>
            </el-input>
            <el-descriptions v-if="dateInfo" :column="1" border size="small">
              <el-descriptions-item label="本地时间">{{ dateInfo.local }}</el-descriptions-item>
              <el-descriptions-item label="相对现在">{{ relativeOf(dateInfo.millis) }}</el-descriptions-item>
              <el-descriptions-item label="ISO">{{ dateInfo.iso }}</el-descriptions-item>
              <el-descriptions-item label="UTC">{{ dateInfo.utc }}</el-descriptions-item>
              <el-descriptions-item label="秒">{{ dateInfo.seconds }}</el-descriptions-item>
              <el-descriptions-item label="毫秒">{{ dateInfo.millis }}</el-descriptions-item>
            </el-descriptions>
          </el-col>
          <el-col :span="12">
            <div class="lb-label">日期时间 → 时间戳</div>
            <el-input v-model="dateInput" placeholder="2026-09-22 10:30:00" class="lb-section">
              <template #append><el-button @click="dateToTs">转换</el-button></template>
            </el-input>
            <el-descriptions v-if="tsInfo" :column="1" border size="small">
              <el-descriptions-item label="秒级时间戳">{{ tsInfo.seconds }}</el-descriptions-item>
              <el-descriptions-item label="毫秒级时间戳">{{ tsInfo.millis }}</el-descriptions-item>
              <el-descriptions-item label="相对现在">{{ relativeOf(tsInfo.millis) }}</el-descriptions-item>
              <el-descriptions-item label="ISO">{{ tsInfo.iso }}</el-descriptions-item>
            </el-descriptions>
          </el-col>
        </el-row>
      </el-tab-pane>

      <!-- 世界时钟 -->
      <el-tab-pane label="世界时钟" name="world">
        <div class="lb-row lb-section">
          <el-select
            v-model="newZone"
            filterable
            clearable
            placeholder="添加城市 / 时区…"
            style="width: 300px"
            @change="addZone"
          >
            <el-option
              v-for="o in zoneOpts"
              :key="o.zone"
              :label="o.label"
              :value="o.zone"
              :disabled="params.zones.includes(o.zone)"
            />
          </el-select>
          <el-button :type="live ? 'primary' : 'default'" @click="live = true">实时</el-button>
          <el-input
            v-model="worldTsInput"
            placeholder="指定时间戳（10/13 位）"
            style="width: 230px"
            @keyup.enter="applyWorldTs"
          >
            <template #append><el-button @click="applyWorldTs">查看</el-button></template>
          </el-input>
          <span class="lb-hint">{{ worldHint }}</span>
        </div>

        <el-table :data="worldRows" size="small">
          <el-table-column label="城市" min-width="160">
            <template #default="{ row }">
              <div class="wt-city">
                {{ row.label }}
                <el-button
                  v-if="params.zones.length > 1"
                  link
                  size="small"
                  type="danger"
                  @click="removeZone(row.zone)"
                >
                  移除
                </el-button>
              </div>
              <div class="wt-zone">{{ row.zone }}</div>
            </template>
          </el-table-column>
          <el-table-column label="当地时间" width="170">
            <template #default="{ row }">
              <code class="wt-time">{{ row.local }}</code>
            </template>
          </el-table-column>
          <el-table-column prop="weekday" label="星期" width="70" />
          <el-table-column prop="offset" label="UTC 偏移" width="110" />
          <el-table-column label="与本地时差" width="120">
            <template #default="{ row }">{{ fmtDiff(row.diffMinutes) }}</template>
          </el-table-column>
          <el-table-column label="状态" min-width="180">
            <template #default="{ row }">
              <el-tag size="small" effect="plain" :type="row.isDaytime ? 'success' : 'info'">
                {{ row.isDaytime ? '☀️ 白天' : '🌙 夜间' }}
              </el-tag>
              <el-tag size="small" effect="plain" class="wt-tag" :type="row.isWeekend ? 'warning' : 'primary'">
                {{ row.isWeekend ? '休息日' : '工作日' }}
              </el-tag>
              <el-tag size="small" effect="plain" class="wt-tag" :type="row.inWorkHours ? 'success' : 'info'">
                {{ row.inWorkHours ? '工作时段内' : '非工作时段' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
        <div class="lb-label lb-section">
          今日时间轴（列 = {{ timeline.date }} 本地 00–23 时，格内为该城市当地小时）
        </div>
        <div class="wt-tl lb-section">
          <div class="wt-tl-row wt-tl-head-row">
            <div class="wt-tl-city">城市</div>
            <div
              v-for="h in 24"
              :key="h"
              class="wt-tl-cell wt-tl-head"
              :class="{ 'tl-now': h - 1 === nowHourCol }"
            >
              {{ String(h - 1).padStart(2, '0') }}
            </div>
          </div>
          <div v-for="row in timeline.rows" :key="row.zone" class="wt-tl-row">
            <div class="wt-tl-city">{{ row.label }}</div>
            <div
              v-for="(c, i) in row.cells"
              :key="i"
              class="wt-tl-cell tl-pick"
              :class="cellClass(c)"
              :title="`${c.local}（${c.offset}）· 点击查看该时刻`"
              @click="pickInstant(c.millis)"
            >
              {{ c.time.slice(0, 2) }}
            </div>
          </div>
        </div>
        <div class="lb-hint lb-section">
          图例：💼 工作时段 · ☀️ 白天 · 🌙 夜间（按当地 06:00–18:00 估算）；点击任意格子可查看该时刻的世界时钟；
          时区与夏令时由浏览器 Intl 自动处理。
        </div>
      </el-tab-pane>

      <!-- 会议时间对比 -->
      <el-tab-pane label="会议时间" name="meeting">
        <div class="lb-row lb-section">
          <el-date-picker
            v-model="meetingDate"
            type="date"
            value-format="YYYY-MM-DD"
            :clearable="false"
            style="width: 150px"
          />
          <el-select v-model="meeting.refZone" style="width: 230px" filterable>
            <el-option v-for="o in zoneOpts" :key="o.zone" :label="`基准：${o.label}`" :value="o.zone" />
          </el-select>
          <el-select
            v-model="meeting.zones"
            multiple
            filterable
            collapse-tags
            collapse-tags-tooltip
            placeholder="对比的城市"
            style="width: 380px"
          >
            <el-option v-for="o in zoneOpts" :key="o.zone" :label="o.label" :value="o.zone" />
          </el-select>
        </div>
        <div class="lb-row lb-section">
          <span class="lb-hint">工作时段</span>
          <el-select v-model="meeting.workStart" style="width: 92px">
            <el-option v-for="h in hours" :key="h" :label="`${h}:00`" :value="h" />
          </el-select>
          <span class="lb-hint">至</span>
          <el-select v-model="meeting.workEnd" style="width: 92px">
            <el-option v-for="h in hours" :key="h" :label="`${h}:00`" :value="h" />
          </el-select>
          <el-select v-model="meeting.stepMinutes" style="width: 130px">
            <el-option v-for="s in steps" :key="s" :label="`粒度 ${s} 分钟`" :value="s" />
          </el-select>
          <el-switch v-model="meeting.excludeWeekend" active-text="排除周末" />
          <el-button type="primary" @click="buildPlan">生成对比</el-button>
        </div>

        <template v-if="plan">
          <div class="lb-label lb-section">
            推荐时段（{{ plan.date }}，基准 {{ zoneLabel(plan.refZone) }}，{{ plan.workStart }}:00–{{ plan.workEnd }}:00）
          </div>
          <div v-if="plan.available.length" class="lb-row lb-section">
            <el-tag
              v-for="r in plan.available"
              :key="r.start"
              class="wt-slot"
              type="success"
              effect="light"
            >
              {{ r.start }} – {{ r.end }}（{{ fmtDuration(r.minutes) }}）
            </el-tag>
          </div>
          <el-alert
            v-else
            class="lb-section"
            type="warning"
            :closable="false"
            show-icon
            title="没有所有城市都处于工作时段的时间，可尝试放宽工作时段或改约其他日期"
          />

          <el-table :data="plan.slots" size="small" max-height="440" :row-class-name="slotRowClass">
            <el-table-column label="基准时间" width="104">
              <template #default="{ row }">
                <code class="wt-time">{{ row.time }}</code>
              </template>
            </el-table-column>
            <el-table-column
              v-for="(z, i) in plan.zones"
              :key="z"
              :label="zoneLabel(z)"
              min-width="140"
            >
              <template #default="{ row }">
                <span :class="row.clocks[i].inWorkHours ? 'wt-in' : 'wt-out'">
                  {{ row.clocks[i].time }}
                </span>
                <span v-if="row.clocks[i].date !== row.date" class="wt-dayoff">
                  （{{ row.clocks[i].date.slice(5) }}）
                </span>
                <div class="wt-zone">{{ row.clocks[i].offset }}</div>
              </template>
            </el-table-column>
            <el-table-column label="结果" width="92">
              <template #default="{ row }">{{ row.ok ? '✅ 可约' : '—' }}</template>
            </el-table-column>
          </el-table>
        </template>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import ToolHeader from '../../components/ToolHeader.vue'
import { timeTools, worldTools, type MeetingPlan, type TimestampInfo, type ZoneClock } from '@localbox/core/index'
import { useToolHistory, useToolParams } from '../../composables/useTool'

const tab = ref('convert')
const tsInput = ref('')
const dateInput = ref('')
const dateInfo = ref<TimestampInfo | null>(null)
const tsInfo = ref<TimestampInfo | null>(null)
const nowMs = ref(Date.now())
const now = computed(() => ({ seconds: Math.floor(nowMs.value / 1000), millis: nowMs.value }))
const record = useToolHistory('timestamp')

const zoneLabel = worldTools.zoneLabel
const pad2 = (n: number): string => String(n).padStart(2, '0')
const localZone = worldTools.localZone()
const defaultZones = worldTools.defaultZones()
const { params } = useToolParams('timestamp', {
  zones: defaultZones,
  meeting: {
    zones: defaultZones.slice(0, 3),
    refZone: defaultZones[0],
    workStart: 9,
    workEnd: 18,
    stepMinutes: 60,
    excludeWeekend: false,
  },
})

const zoneOpts = worldTools.zoneOptions()
const hours = Array.from({ length: 25 }, (_, i) => i)
const steps = [15, 30, 60]

const timer = setInterval(() => {
  nowMs.value = Date.now()
}, 1000)
onUnmounted(() => clearInterval(timer))

function relativeOf(millis: number): string {
  return worldTools.relativeTime(millis, nowMs.value)
}

/* ---------- 时间戳互转 ---------- */

function useNow(): void {
  tsInput.value = String(now.value.seconds)
  tsToDate()
}

function tsToDate(): void {
  try {
    dateInfo.value = timeTools.timestampToDate(Number(tsInput.value))
    record('时间戳转日期', tsInput.value)
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : String(e))
  }
}

function dateToTs(): void {
  try {
    tsInfo.value = timeTools.dateToTimestamp(dateInput.value)
    record('日期转时间戳', dateInput.value)
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : String(e))
  }
}

/* ---------- 世界时钟 ---------- */

const live = ref(true)
const worldTsInput = ref('')
const fixedMillis = ref(Date.now())
const newZone = ref('')

const worldMillis = computed(() => (live.value ? nowMs.value : fixedMillis.value))
const worldRows = computed(() =>
  worldTools.getWorldClock(worldMillis.value, params.value.zones, { baseZone: localZone })
)
const worldHint = computed(() =>
  live.value
    ? '实时更新中（每秒刷新）'
    : `正在查看 ${timeTools.timestampToDate(fixedMillis.value).local}`
)

function addZone(zone: string): void {
  if (!zone || params.value.zones.includes(zone)) return
  params.value.zones = [...params.value.zones, zone]
  newZone.value = ''
  record('添加城市', zone)
}

function removeZone(zone: string): void {
  params.value.zones = params.value.zones.filter((z) => z !== zone)
}

function applyWorldTs(): void {
  const raw = worldTsInput.value.trim()
  if (!raw) return
  try {
    fixedMillis.value = timeTools.timestampToDate(Number(raw)).millis
    live.value = false
    record('查看时刻', raw)
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : String(e))
  }
}

function fmtDiff(mins: number): string {
  if (mins === 0) return '相同'
  const sign = mins > 0 ? '+' : '-'
  const abs = Math.abs(mins)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `${sign}${h} 小时${m ? ` ${m} 分` : ''}`
}

/* ---------- 今日时间轴 ---------- */

const timelineHourKey = computed(() => Math.floor(worldMillis.value / 3_600_000))
const timeline = computed(() => {
  const anchor = timelineHourKey.value * 3_600_000
  const date = worldTools.getZoneClock(anchor, localZone).date
  const columns: ZoneClock[][] = []
  for (let h = 0; h < 24; h++) {
    const instant = worldTools.zoneWallTimeToMillis(`${date} ${pad2(h)}:00`, localZone)
    columns.push(worldTools.getWorldClock(instant, params.value.zones, { baseZone: localZone }))
  }
  return {
    date,
    rows: params.value.zones.map((zone, i) => ({
      zone,
      label: zoneLabel(zone),
      cells: columns.map((col) => col[i]),
    })),
  }
})
const nowHourCol = computed(() => new Date(worldMillis.value).getHours())

function cellClass(c: ZoneClock): string {
  const kind = c.isDaytime ? (c.inWorkHours ? 'tl-work' : 'tl-day') : 'tl-night'
  return c.date === timeline.value.date ? kind : `${kind} tl-off`
}

/** 点击时间轴格子：切换到该时刻的世界时钟 */
function pickInstant(millis: number): void {
  fixedMillis.value = millis
  live.value = false
  worldTsInput.value = String(Math.floor(millis / 1000))
}

/* ---------- 会议时间对比 ---------- */

const meeting = computed(() => params.value.meeting)
const meetingDate = ref(worldTools.todayInZone(localZone))
const plan = ref<MeetingPlan | null>(null)

function buildPlan(): void {
  try {
    plan.value = worldTools.meetingPlan({
      zones: meeting.value.zones,
      refZone: meeting.value.refZone,
      date: meetingDate.value,
      workStart: meeting.value.workStart,
      workEnd: meeting.value.workEnd,
      stepMinutes: meeting.value.stepMinutes,
      excludeWeekend: meeting.value.excludeWeekend,
    })
    record('会议时间对比', `${meetingDate.value} · ${meeting.value.zones.length} 个城市`)
  } catch (e) {
    plan.value = null
    ElMessage.error(e instanceof Error ? e.message : String(e))
  }
}

function slotRowClass({ row }: { row: MeetingPlan['slots'][number] }): string {
  if (row.ok) return 'wt-row-ok'
  return row.clocks.some((c) => c.isWeekend) ? 'wt-row-weekend' : ''
}

function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h} 小时${m ? ` ${m} 分` : ''}`
}

buildPlan()
</script>

<style scoped>
.lb-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}
.lb-now,
.lb-hint {
  font-size: 13px;
  color: var(--color-text-secondary);
}
.wt-city {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}
.wt-zone {
  font-size: 12px;
  color: var(--color-text-secondary);
}
.wt-time {
  font-family: Consolas, Monaco, monospace;
  font-size: 13px;
}
.wt-tag {
  margin-left: 6px;
}
.wt-slot {
  cursor: default;
}
.wt-in {
  color: var(--color-success, #67c23a);
  font-weight: 600;
}
.wt-out {
  color: var(--color-text-secondary);
}
.wt-dayoff {
  font-size: 12px;
  color: var(--color-warning, #e6a23c);
}
:deep(.el-table .wt-row-ok) {
  background: var(--color-primary-light, rgba(64, 158, 255, 0.12));
}
:deep(.el-table .wt-row-weekend) {
  opacity: 0.65;
}

/* 今日时间轴 */
.wt-tl {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px;
  background: var(--color-bg-page);
}
.wt-tl-row {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-bottom: 4px;
  min-width: 760px;
}
.wt-tl-city {
  width: 108px;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wt-tl-cell {
  flex: 1;
  min-width: 26px;
  text-align: center;
  font-size: 11px;
  line-height: 22px;
  border-radius: 4px;
  font-family: Consolas, Monaco, monospace;
}
.wt-tl-head {
  color: var(--color-text-secondary);
  font-weight: 600;
}
.wt-tl-head.tl-now {
  color: var(--color-primary);
  background: var(--color-primary-light, rgba(64, 158, 255, 0.16));
}
.tl-work {
  background: var(--color-success, #67c23a);
  color: #fff;
}
.tl-day {
  background: var(--color-warning, #e6a23c);
  color: #fff;
}
.tl-night {
  background: var(--color-text-secondary);
  color: var(--color-bg-card);
  opacity: 0.55;
}
.tl-off {
  outline: 1px dashed var(--color-border);
  opacity: 0.7;
}
.tl-pick {
  cursor: pointer;
}
.tl-pick:hover {
  outline: 1px solid var(--color-primary);
  opacity: 1;
}
</style>
