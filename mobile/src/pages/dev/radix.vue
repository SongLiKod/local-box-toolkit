<template>
  <ToolPage tool-id="radix">
    <view class="lb-card">
      <view class="lb-label">数值</view>
      <input v-model="value" class="lb-input" />
      <view class="lb-label">源进制 2~36</view>
      <input v-model="fromBase" class="lb-input" type="number" />
      <button class="lb-btn" @click="run">转换</button>
      <view class="lb-output">{{ out || '—' }}</view>
    </view>
  </ToolPage>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import { radixTools } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useHistory'

const value = ref('')
const fromBase = ref('10')
const out = ref('')
const record = useToolHistory('radix')

function run(): void {
  try {
    const r = radixTools.convertRadixSet(value.value, Number(fromBase.value) || 10)
    out.value = `BIN ${r.bin}\nOCT ${r.oct}\nDEC ${r.dec}\nHEX ${r.hex}`
    record('进制转换', r.dec)
  } catch (e) {
    out.value = e instanceof Error ? e.message : String(e)
  }
}
</script>
