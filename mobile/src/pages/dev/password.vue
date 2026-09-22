<template>
  <ToolPage tool-id="password">
    <view class="lb-card">
      <view class="lb-label">长度：{{ length }}</view>
      <slider v-model="length" :min="4" :max="64" show-value />
      <view class="lb-row">
        <view class="lb-chip" :class="{ active: lower }" @click="lower = !lower">小写</view>
        <view class="lb-chip" :class="{ active: upper }" @click="upper = !upper">大写</view>
        <view class="lb-chip" :class="{ active: digits }" @click="digits = !digits">数字</view>
        <view class="lb-chip" :class="{ active: symbols }" @click="symbols = !symbols">符号</view>
      </view>
      <button class="lb-btn" @click="gen">生成密码</button>
      <view class="lb-output lb-pwd">{{ result || '点击上方生成' }}</view>
      <view v-if="result" class="lb-label">强度：{{ strength }}</view>
      <button class="lb-btn lb-btn-plain" @click="copy">复制</button>
    </view>
  </ToolPage>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import { pwdTools } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useHistory'

const length = ref(16)
const lower = ref(true)
const upper = ref(true)
const digits = ref(true)
const symbols = ref(true)
const result = ref('')
const strength = ref('')
const record = useToolHistory('password')

function gen(): void {
  try {
    result.value = pwdTools.generatePassword({
      length: length.value,
      lowercase: lower.value,
      uppercase: upper.value,
      digits: digits.value,
      symbols: symbols.value,
      excludeChars: '',
      guaranteeEach: true,
    })
    strength.value = pwdTools.passwordStrength(result.value).label
    record('生成密码', `长度${length.value}`)
  } catch (e) {
    uni.showToast({ title: e instanceof Error ? e.message : String(e), icon: 'none' })
  }
}
function copy(): void {
  uni.setClipboardData({ data: result.value })
}
</script>

<style scoped>
.lb-check {
  display: flex;
  align-items: center;
  font-size: 26rpx;
  margin-right: 20rpx;
}
.lb-pwd {
  font-size: 34rpx;
  font-weight: 600;
  letter-spacing: 2rpx;
}
</style>
