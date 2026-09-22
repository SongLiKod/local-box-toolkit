<template>
  <ToolPage tool-id="barcode">
    <view class="lb-card">
      <view class="lb-row">
        <view class="lb-chip" :class="{ active: kind === 'qr' }" @click="kind = 'qr'">二维码</view>
        <view class="lb-chip" :class="{ active: kind === 'bar' }" @click="kind = 'bar'">条形码</view>
      </view>
      <view class="lb-label">内容</view>
      <input v-model="text" class="lb-input" placeholder="输入文本/链接" />
      <template v-if="kind === 'bar'">
        <view class="lb-label">码制</view>
        <picker :range="formats" :value="fmtIdx" @change="fmtIdx = Number($event.detail.value)">
          <view class="lb-input">{{ formats[fmtIdx] }}</view>
        </picker>
      </template>
      <button class="lb-btn" @click="gen">生成</button>
      <view v-if="qrUrl" class="lb-preview">
        <image :src="qrUrl" style="width: 400rpx; height: 400rpx" mode="aspectFit" />
      </view>
      <button v-if="qrUrl" class="lb-btn lb-btn-plain" @click="download">保存图片到相册</button>
    </view>
  </ToolPage>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import { codeTools } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useHistory'

const kind = ref<'qr' | 'bar'>('qr')
const text = ref('https://example.com')
const formats = ['CODE128', 'CODE39', 'EAN13', 'EAN8', 'UPC']
const fmtIdx = ref(0)
const qrUrl = ref('')
const record = useToolHistory('barcode')

async function gen(): Promise<void> {
  if (!text.value) {
    uni.showToast({ title: '请输入内容', icon: 'none' })
    return
  }
  try {
    if (kind.value === 'qr') {
      qrUrl.value = await codeTools.generateQrDataUrl(text.value, { size: 400 })
    } else {
      const svg = codeTools.generateBarcodeSvg(text.value, formats[fmtIdx.value] as 'CODE128')
      qrUrl.value = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    }
    record('生成', kind.value === 'qr' ? '二维码' : formats[fmtIdx.value])
  } catch (e) {
    uni.showToast({ title: e instanceof Error ? e.message : '生成失败', icon: 'none' })
  }
}

function download(): void {
  uni.saveImageToPhotosAlbum({
    filePath: qrUrl.value,
    success: () => uni.showToast({ title: '已保存相册', icon: 'success' }),
    fail: () => uni.showToast({ title: '保存失败，可长按图片保存', icon: 'none' }),
  })
}
</script>

<style scoped>
.lb-preview {
  display: flex;
  justify-content: center;
  padding: 20rpx;
  background: #fff;
  border-radius: 12rpx;
  margin: 16rpx 0;
}
</style>
