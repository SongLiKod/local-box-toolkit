<template>
  <div class="lb-card">
    <ToolHeader tool-id="time-convert" />
    <el-tabs v-model="tab">
      <el-tab-pane label="时区换算" name="tz">
        <div class="lb-row lb-section">
          <el-input v-model="tz.datetime" placeholder="2026-09-22 10:30:00" style="width: 220px" />
          <el-select v-model="tz.from" filterable style="width: 190px">
            <el-option v-for="z in zones" :key="z" :label="z" :value="z" />
          </el-select>
          <span>→</span>
          <el-select v-model="tz.to" filterable style="width: 190px">
            <el-option v-for="z in zones" :key="z" :label="z" :value="z" />
          </el-select>
          <el-button type="primary" @click="doTz">换算</el-button>
        </div>
        <el-descriptions v-if="tzResult" :column="1" border size="small">
          <el-descriptions-item label="目标时间">{{ tzResult.local }}（{{ tzResult.offset }}）</el-descriptions-item>
          <el-descriptions-item label="ISO">{{ tzResult.iso }}</el-descriptions-item>
        </el-descriptions>
      </el-tab-pane>
      <el-tab-pane label="日期差值" name="diff">
        <div class="lb-row lb-section">
          <el-input v-model="diff.a" placeholder="2026-01-01" style="width: 200px" />
          <span>至</span>
          <el-input v-model="diff.b" placeholder="2026-12-31" style="width: 200px" />
          <el-button type="primary" @click="doDiff">计算</el-button>
        </div>
        <div v-if="diffResult !== null" class="lb-result"><code>相差 {{ diffResult }} 天</code></div>
      </el-tab-pane>
      <el-tab-pane label="日期加减" name="add">
        <div class="lb-row lb-section">
          <el-input v-model="add.from" placeholder="起始日期(空=今天)" style="width: 200px" />
          <el-input-number v-model="add.days" :min="-99999" :max="99999" controls-position="right" style="width: 140px" />
          <span>天</span>
          <el-button type="primary" @click="doAdd">计算</el-button>
        </div>
        <div v-if="addResult" class="lb-result"><code>{{ addResult }}</code></div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import ToolHeader from '../../components/ToolHeader.vue'
import { timezoneTools, type ZonedResult } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useTool'

const zones = timezoneTools.COMMON_ZONES
const tab = ref('tz')
const tz = reactive({ datetime: '2026-09-22 10:30:00', from: 'Asia/Shanghai', to: 'America/New_York' })
const tzResult = ref<ZonedResult | null>(null)
const diff = reactive({ a: '2026-01-01', b: '2026-12-31' })
const diffResult = ref<number | null>(null)
const add = reactive({ from: '', days: 30 })
const addResult = ref('')
const record = useToolHistory('time-convert')

function doTz(): void {
  try {
    tzResult.value = timezoneTools.convertTimezone(tz.datetime, tz.from, tz.to)
    record('时区换算', `${tz.from}→${tz.to}`)
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : String(e))
  }
}
function doDiff(): void {
  try {
    diffResult.value = timezoneTools.daysBetween(diff.a, diff.b)
    record('日期差', `${diffResult.value} 天`)
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : String(e))
  }
}
function doAdd(): void {
  try {
    addResult.value = timezoneTools.addDuration(add.days, add.from || undefined)
    record('日期加减', `${add.days} 天`)
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : String(e))
  }
}
</script>

<style scoped>
.lb-result {
  display: inline-flex;
  padding: 12px 18px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-primary-light);
}
.lb-result code {
  font-size: 16px;
}
</style>
