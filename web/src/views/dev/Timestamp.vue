<template>
  <div class="lb-card">
    <ToolHeader tool-id="timestamp" />
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
          <el-descriptions-item label="ISO">{{ tsInfo.iso }}</el-descriptions-item>
        </el-descriptions>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import ToolHeader from '../../components/ToolHeader.vue'
import { timeTools, type TimestampInfo } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useTool'

const tsInput = ref('')
const dateInput = ref('')
const dateInfo = ref<TimestampInfo | null>(null)
const tsInfo = ref<TimestampInfo | null>(null)
const now = ref(timeTools.nowTimestamp())
const record = useToolHistory('timestamp')

setInterval(() => {
  now.value = timeTools.nowTimestamp()
}, 1000)

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
</script>

<style scoped>
.lb-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}
.lb-now {
  font-size: 13px;
  color: var(--color-text-secondary);
}
</style>
