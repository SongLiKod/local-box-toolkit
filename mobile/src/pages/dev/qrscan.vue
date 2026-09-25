<template>
  <ToolPage tool-id="qrscan">
    <view class="lb-card">
      <text class="lb-title">二维码识别</text>
      <text class="qs-sub">从相册选图或直接拍照，图片只在本机解码，不上传</text>
      <button class="lb-btn lb-btn-primary qs-btn" :loading="busy" @click="scan">
        选择图片 / 拍照识别
      </button>

      <view v-if="result" class="qs-result">
        <view class="qs-head">
          <text class="qs-kind">{{ info.label }}</text>
          <text class="qs-len">{{ result.text.length }} 字符</text>
        </view>
        <text class="qs-text" selectable>{{ result.text }}</text>

        <view v-if="wifi" class="qs-wifi">
          <text>SSID：{{ wifi.ssid }}</text>
          <text>密码：{{ wifi.password ? wifi.password : '（无密码）' }}</text>
          <text>网络：{{ wifi.hidden ? '隐藏' : '开放广播' }}</text>
        </view>

        <view class="qs-acts">
          <button class="lb-btn" @click="copy(result.text)">复制内容</button>
          <button v-if="wifi && wifi.password" class="lb-btn" @click="copy(wifi.password!)">
            复制密码
          </button>
          <button v-if="isUrl" class="lb-btn lb-btn-primary" @click="open">打开链接</button>
        </view>
      </view>

      <view v-else-if="!busy" class="lb-empty">
        <text>还没有识别结果</text>
      </view>

      <view v-if="history.length" class="qs-history">
        <text class="qs-history-title">本次识别记录</text>
        <text
          v-for="(h, i) in history"
          :key="`${h}-${i}`"
          class="qs-his"
          @click="pick(h)"
          >{{ h }}</text
        >
      </view>
    </view>
  </ToolPage>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import { createCanvas, loadImage, releaseCanvas, qrTools, type QrHit } from '@localbox/core/index'
import { chooseFiles } from '../../utils/files'
import { useToolHistory } from '../../composables/useHistory'

const MAX_SIDE = 2000
const HISTORY_MAX = 8

const busy = ref(false)
const result = ref<QrHit | null>(null)
const history = ref<string[]>([])
const record = useToolHistory('qrscan')

const info = computed(() => (result.value ? qrTools.describeQrContent(result.value.text) : null))
const isUrl = computed(() => info.value?.kind === 'url')
const wifi = computed(() =>
  result.value && info.value?.kind === 'wifi' ? qrTools.parseWifiQr(result.value.text) : null,
)

async function scan(): Promise<void> {
  let files: File[] = []
  try {
    files = await chooseFiles('image/*', false)
  } catch {
    return
  }
  const file = files[0]
  if (!file) return

  busy.value = true
  result.value = null
  try {
    const img = await loadImage(file)
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.max(1, Math.round(img.naturalWidth * scale))
    const h = Math.max(1, Math.round(img.naturalHeight * scale))
    const canvas = createCanvas(w, h)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('无法创建画布')
    ctx.drawImage(img, 0, 0, w, h)
    const hit = qrTools.decodeQr(ctx.getImageData(0, 0, w, h))
    releaseCanvas(canvas)
    if (!hit) {
      uni.showToast({ title: '没有识别到二维码', icon: 'none' })
      return
    }
    result.value = hit
    history.value = [hit.text, ...history.value.filter((t) => t !== hit.text)].slice(0, HISTORY_MAX)
    record('识别二维码', `图片 · ${hit.text.slice(0, 60)}`)
  } catch (err) {
    uni.showToast({ title: err instanceof Error ? err.message : '图片读取失败', icon: 'none' })
  } finally {
    busy.value = false
  }
}

function pick(text: string): void {
  result.value = { text, corners: [] }
}

function copy(v: string): void {
  uni.setClipboardData({
    data: v,
    success: () => uni.showToast({ title: '已复制', icon: 'success' }),
  })
}

function open(): void {
  const url = result.value?.text
  if (!url) return
  if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer')
}
</script>

<style scoped>
.qs-sub {
  display: block;
  font-size: 24rpx;
  color: var(--color-text-secondary);
  margin: 8rpx 0 20rpx;
  line-height: 1.7;
}
.qs-btn {
  width: 100%;
}
.qs-result {
  border: 1px solid var(--color-border);
  border-radius: 14rpx;
  padding: 20rpx;
  margin-top: 24rpx;
}
.qs-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.qs-kind {
  font-size: 22rpx;
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
  border-radius: 6rpx;
  padding: 2rpx 12rpx;
}
.qs-len {
  font-size: 22rpx;
  color: var(--color-text-secondary);
}
.qs-text {
  display: block;
  margin-top: 14rpx;
  font-size: 26rpx;
  font-family: ui-monospace, Menlo, Consolas, monospace;
  line-height: 1.7;
  word-break: break-all;
}
.qs-wifi {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  background: var(--color-bg-page);
  border: 1px solid var(--color-border);
  border-radius: 10rpx;
  padding: 14rpx 18rpx;
  margin-top: 16rpx;
  font-size: 24rpx;
}
.qs-acts {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  margin-top: 20rpx;
}
.qs-history {
  margin-top: 26rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.qs-history-title {
  font-size: 22rpx;
  color: var(--color-text-secondary);
  font-weight: 600;
}
.qs-his {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8rpx;
  padding: 10rpx 14rpx;
  background: var(--color-bg-page);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
