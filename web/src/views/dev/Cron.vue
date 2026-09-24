<template>
  <div class="lb-card">
    <ToolHeader tool-id="cron" />
    <el-tabs v-model="tab">
      <el-tab-pane label="表达式解析" name="parse">
        <div class="lb-row lb-section">
          <el-input
            v-model="input"
            placeholder="0 9 * * *（分 时 日 月 周）"
            style="width: 300px"
            @keyup.enter="analyzeInput"
          />
          <el-button type="primary" @click="analyzeInput">解析</el-button>
        </div>
        <div class="lb-row lb-section">
          <span class="lb-hint">常用：</span>
          <el-tag
            v-for="p in presets"
            :key="p.expr"
            class="lb-preset"
            effect="plain"
            @click="applyPreset(p)"
          >
            {{ p.label }}
          </el-tag>
        </div>
        <div class="lb-row lb-hint lb-section">
          支持 5 字段（分 时 日 月 周）与 6 字段（秒 分 时 日 月 周），
          语法含 * ? , - / 与 JAN/MON 等英文名；日与周同时限定时满足其一即可。
        </div>
      </el-tab-pane>

      <el-tab-pane label="可视化生成" name="gen">
        <div v-for="f in genFields" v-show="f.key !== 'second' || withSeconds" :key="f.key" class="lb-gen-row">
          <span class="lb-gen-label">{{ f.label }}（{{ f.min }}-{{ f.max }}）</span>
          <el-select v-model="f.mode" style="width: 132px">
            <el-option v-for="m in modesFor(f)" :key="m.value" :label="m.label" :value="m.value" />
          </el-select>
          <template v-if="f.mode === 'step'">
            <el-input-number
              v-model="f.step"
              :min="1"
              :max="f.max - f.min + 1"
              controls-position="right"
              style="width: 110px"
            />
            <span class="lb-hint">{{ f.unit }}一次（*/{{ f.step }}）</span>
          </template>
          <template v-else-if="f.mode === 'range'">
            <el-input-number v-model="f.from" :min="f.min" :max="f.max" controls-position="right" style="width: 110px" />
            <span class="lb-hint">至</span>
            <el-input-number v-model="f.to" :min="f.min" :max="f.max" controls-position="right" style="width: 110px" />
          </template>
          <el-select
            v-else-if="f.mode === 'values'"
            v-model="f.values"
            multiple
            collapse-tags
            clearable
            style="width: 320px"
          >
            <el-option v-for="o in optionsFor(f)" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
          <span v-else class="lb-hint">{{ modeHint(f) }}</span>
        </div>
        <div class="lb-row lb-section">
          <el-switch v-model="withSeconds" active-text="含秒字段（6段表达式）" />
          <el-button type="primary" @click="generate">生成表达式</el-button>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-alert v-if="error" type="error" :title="error" :closable="false" show-icon class="lb-section" />
    <template v-if="parsed">
      <div class="lb-row lb-section">
        <code class="cron-expr">{{ parsed.expr }}</code>
        <el-button size="small" @click="copy(parsed.expr)">复制</el-button>
        <span class="cron-desc">{{ parsed.description }}</span>
      </div>
      <el-table :data="rows" size="small">
        <el-table-column prop="label" label="字段" width="72" />
        <el-table-column prop="raw" label="表达式" width="140" />
        <el-table-column prop="meaning" label="含义" min-width="220" />
      </el-table>
      <div class="lb-label lb-section">接下来 {{ runs.length }} 次执行（本地时区）</div>
      <div class="cron-runs">
        <span v-for="r in runs" :key="r" class="cron-run">{{ r }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import ToolHeader from '../../components/ToolHeader.vue'
import { cronTools, type CronFieldSpec, type CronParsed } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useTool'

type GenMode = 'any' | 'step' | 'range' | 'values' | 'question'

interface GenField {
  key: string
  label: string
  unit: string
  min: number
  max: number
  question: boolean
  mode: GenMode
  step: number
  from: number
  to: number
  values: number[]
}

const tab = ref('parse')
const input = ref('0 9 * * *')
const error = ref('')
const parsed = ref<CronParsed | null>(null)
const runs = ref<string[]>([])
const presets = cronTools.CRON_PRESETS
const record = useToolHistory('cron')

const rows = computed(() =>
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

async function copy(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
  ElMessage.success('已复制')
}

/* ---------- 可视化生成 ---------- */

const withSeconds = ref(false)
const genFields = reactive<GenField[]>(
  cronTools.CRON_FIELD_DEFS.map((d) => ({
    key: d.key,
    label: d.label,
    unit: d.unit,
    min: d.min,
    max: d.key === 'dayOfWeek' ? 6 : d.max,
    question: d.question,
    mode: 'any' as GenMode,
    step: d.key === 'minute' ? 5 : 1,
    from: d.min,
    to: d.key === 'dayOfWeek' ? 6 : d.max,
    values: [] as number[],
  }))
)

function modesFor(f: GenField): { label: string; value: GenMode }[] {
  const modes: { label: string; value: GenMode }[] = [
    { label: '任意 *', value: 'any' },
    { label: '每隔 N', value: 'step' },
    { label: '范围 a-b', value: 'range' },
    { label: '指定值', value: 'values' },
  ]
  if (f.question) modes.push({ label: '不指定 ?', value: 'question' })
  return modes
}

function modeHint(f: GenField): string {
  if (f.mode === 'question') return '不指定（?），由另一日期字段决定'
  if (f.mode !== 'any') return ''
  return `任意（*，${ANY_HINT[f.key] ?? '全部生效'}）`
}

const ANY_HINT: Record<string, string> = {
  second: '每秒生效',
  minute: '每分钟生效',
  hour: '每小时生效',
  dayOfMonth: '每天生效',
  month: '每月生效',
  dayOfWeek: '每周生效',
}

function optionsFor(f: GenField): { value: number; label: string }[] {
  const out: { value: number; label: string }[] = []
  for (let v = f.min; v <= f.max; v++) {
    out.push({ value: v, label: optionLabel(f.key, v) })
  }
  return out
}

function optionLabel(key: string, v: number): string {
  switch (key) {
    case 'dayOfWeek':
      return `周${cronTools.CRON_WEEK_CN[v]}（${v}）`
    case 'month':
      return `${v} 月（${cronTools.CRON_MONTH_ABBR[v - 1]}）`
    case 'dayOfMonth':
      return `${v} 日`
    case 'hour':
      return `${v} 时`
    case 'minute':
      return `${v} 分`
    default:
      return `${v} 秒`
  }
}

function specOf(f: GenField): CronFieldSpec {
  switch (f.mode) {
    case 'step':
      return { kind: 'step', step: f.step }
    case 'range':
      return { kind: 'range', from: f.from, to: f.to }
    case 'values':
      return { kind: 'values', values: f.values }
    case 'question':
      return { kind: 'question' }
    default:
      return { kind: 'any' }
  }
}

function generate(): void {
  const field = (key: string): GenField => {
    const f = genFields.find((g) => g.key === key)
    if (!f) throw new Error(`缺少${key}字段配置`)
    return f
  }
  try {
    const expr = cronTools.buildCron({
      second: withSeconds.value ? specOf(field('second')) : null,
      minute: specOf(field('minute')),
      hour: specOf(field('hour')),
      dayOfMonth: specOf(field('dayOfMonth')),
      month: specOf(field('month')),
      dayOfWeek: specOf(field('dayOfWeek')),
    })
    analyze(expr, '生成表达式')
  } catch (e) {
    parsed.value = null
    runs.value = []
    error.value = e instanceof Error ? e.message : String(e)
  }
}

analyze(input.value)
</script>

<style scoped>
.lb-hint {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}
.lb-preset {
  cursor: pointer;
}
.lb-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}
.lb-gen-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.lb-gen-label {
  width: 104px;
  font-size: 13px;
  color: var(--color-text-secondary);
}
.cron-expr {
  font-family: Consolas, Monaco, monospace;
  font-size: 16px;
  font-weight: 600;
  padding: 4px 10px;
  background: var(--color-bg-page);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}
.cron-desc {
  font-size: 14px;
  color: var(--color-text-primary);
}
.cron-runs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.cron-run {
  font-family: Consolas, Monaco, monospace;
  font-size: 13px;
  padding: 4px 10px;
  background: var(--color-bg-page);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}
</style>
