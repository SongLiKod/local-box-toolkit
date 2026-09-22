<template>
  <div class="lb-card">
    <ToolHeader tool-id="units" />
    <div class="lb-row lb-section">
      <el-select v-model="catId" style="width: 160px" @change="onCat">
        <el-option v-for="c in cats" :key="c.id" :label="c.name" :value="c.id" />
        <el-option label="温度" value="temperature" />
      </el-select>
      <el-input-number v-model="value" :controls="false" style="width: 180px" />
      <el-select v-model="fromId" style="width: 150px">
        <el-option v-for="u in unitOptions" :key="u.id" :label="u.name" :value="u.id" />
      </el-select>
      <span>→</span>
      <el-select v-model="toId" style="width: 150px">
        <el-option v-for="u in unitOptions" :key="u.id" :label="u.name" :value="u.id" />
      </el-select>
    </div>
    <div class="lb-result">
      <code>{{ result }}</code>
      <el-button link type="primary" @click="copy">复制</el-button>
    </div>
    <div class="lb-label" style="margin-top: 16px">全单位对照</div>
    <el-table :data="allRows" size="small" max-height="320">
      <el-table-column prop="name" label="单位" />
      <el-table-column label="数值">
        <template #default="{ row }"><code>{{ row.value }}</code></template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import ToolHeader from '../../components/ToolHeader.vue'
import { unitTools } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useTool'

const cats = unitTools.UNIT_CATEGORIES
const TEMP_UNITS = [
  { id: 'c', name: '摄氏度 °C' },
  { id: 'f', name: '华氏度 °F' },
  { id: 'k', name: '开尔文 K' },
]
const catId = ref('length')
const value = ref(1)
const fromId = ref('m')
const toId = ref('cm')
const record = useToolHistory('units')

const isTemp = computed(() => catId.value === 'temperature')
const units = computed(() => cats.find((c) => c.id === catId.value)?.units ?? [])
const unitOptions = computed(() => (isTemp.value ? TEMP_UNITS : units.value))

function convertOne(toU: string): number {
  if (isTemp.value) {
    return unitTools.convertTemperature(value.value, fromId.value as 'c', toU as 'c')
  }
  return unitTools.convertUnit(catId.value, fromId.value, toU, value.value)
}

const result = computed(() => {
  const fromName = unitOptions.value.find((u) => u.id === fromId.value)?.name ?? ''
  const toName = unitOptions.value.find((u) => u.id === toId.value)?.name ?? ''
  return `${value.value} ${fromName} = ${unitTools.roundSmart(convertOne(toId.value))} ${toName}`
})
const allRows = computed(() =>
  unitOptions.value.map((u) => ({
    name: u.name,
    value: unitTools.roundSmart(convertOne(u.id)),
  }))
)

function onCat(): void {
  if (isTemp.value) {
    fromId.value = 'c'
    toId.value = 'f'
    return
  }
  const us = units.value
  fromId.value = us[4]?.id ?? us[0].id
  toId.value = us[3]?.id ?? us[0].id
}

async function copy(): Promise<void> {
  await navigator.clipboard.writeText(result.value)
  ElMessage.success('已复制')
  record('换算', result.value)
}
</script>

<style scoped>
.lb-result {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-primary-light);
}
.lb-result code {
  font-size: 16px;
}
.lb-label {
  font-size: 13px;
  color: var(--color-text-secondary);
}
</style>
