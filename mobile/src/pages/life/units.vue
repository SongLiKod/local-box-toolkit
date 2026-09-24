<template>
  <ToolPage tool-id="units">
    <view class="lb-card">
      <view class="lb-label">类别</view>
      <picker :range="catNames" :value="catIdx" @change="onCatChange">
        <view class="lb-input">{{ catNames[catIdx] }}</view>
      </picker>
      <view class="lb-label">数值</view>
      <input v-model="value" type="digit" class="lb-input" placeholder="输入数值" />
      <view class="lb-label">从</view>
      <picker :range="fromNames" :value="fromIdx" @change="fromIdx = Number($event.detail.value)">
        <view class="lb-input">{{ fromNames[fromIdx] }}</view>
      </picker>
      <view class="lb-label">换算为</view>
      <picker :range="toNames" :value="toIdx" @change="toIdx = Number($event.detail.value)">
        <view class="lb-input">{{ toNames[toIdx] }}</view>
      </picker>
      <view class="lb-label">换算结果</view>
      <view class="lb-output">{{ result }}</view>
      <button class="lb-btn lb-btn-plain" @click="copy">复制结果</button>
      <view class="lb-label">全单位对照</view>
      <view v-for="row in allRows" :key="row.id" class="lb-file">
        <text>{{ row.name }}</text>
        <text class="lb-unit-val">{{ row.value }}</text>
      </view>
    </view>
  </ToolPage>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import { unitTools } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useHistory'

interface UnitOpt {
  id: string
  name: string
}
interface CatOpt {
  id: string
  name: string
  units: UnitOpt[]
}

const TEMP_UNITS: UnitOpt[] = [
  { id: 'c', name: '摄氏度 °C' },
  { id: 'f', name: '华氏度 °F' },
  { id: 'k', name: '开尔文 K' },
]
const cats: CatOpt[] = [
  ...unitTools.UNIT_CATEGORIES.map((c) => ({ id: c.id, name: c.name, units: c.units })),
  { id: 'temperature', name: '温度', units: TEMP_UNITS },
]
const catIdx = ref(0)
const value = ref('1')
const fromIdx = ref(4)
const toIdx = ref(3)
const record = useToolHistory('units')

const catNames = computed(() => cats.map((c) => c.name))
const isTemp = computed(() => cats[catIdx.value].id === 'temperature')
const unitOptions = computed(() => cats[catIdx.value].units)
const fromNames = computed(() => unitOptions.value.map((u) => u.name))
const toNames = fromNames

function convertOne(toId: string): number {
  const n = Number(value.value)
  if (!Number.isFinite(n)) return NaN
  const fromId = unitOptions.value[fromIdx.value]?.id ?? ''
  if (isTemp.value) {
    return unitTools.convertTemperature(n, fromId as 'c', toId as 'c')
  }
  return unitTools.convertUnit(cats[catIdx.value].id, fromId, toId, n)
}

const result = computed(() => {
  const n = Number(value.value)
  if (!Number.isFinite(n)) return '—'
  const fromName = fromNames.value[fromIdx.value] ?? ''
  const toName = toNames.value[toIdx.value] ?? ''
  const toId = unitOptions.value[toIdx.value]?.id ?? ''
  const out = convertOne(toId)
  if (!Number.isFinite(out)) return '—'
  return `${n} ${fromName} = ${unitTools.roundSmart(out)} ${toName}`
})

const allRows = computed(() =>
  unitOptions.value.map((u) => {
    const out = convertOne(u.id)
    return { id: u.id, name: u.name, value: Number.isFinite(out) ? String(unitTools.roundSmart(out)) : '—' }
  })
)

function onCatChange(e: { detail: { value: string | number } }): void {
  catIdx.value = Number(e.detail.value)
  const us = unitOptions.value
  if (cats[catIdx.value].id === 'temperature') {
    fromIdx.value = 0
    toIdx.value = 1
    return
  }
  fromIdx.value = us[4] ? 4 : 0
  toIdx.value = us[3] ? 3 : 0
}

function copy(): void {
  uni.setClipboardData({
    data: result.value,
    success: () => uni.showToast({ title: '已复制', icon: 'none' }),
  })
  void record('换算', result.value)
}
</script>

<style scoped>
.lb-unit-val {
  margin-left: auto;
  color: var(--color-primary);
  font-weight: 600;
  font-size: 26rpx;
}
</style>
