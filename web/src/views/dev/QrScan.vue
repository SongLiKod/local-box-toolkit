<template>
  <div class="lb-card">
    <ToolHeader tool-id="qrscan" />

    <div class="qs-layout">
      <!-- 左：识别方式 -->
      <aside class="qs-side">
        <div class="qs-tabs">
          <button
            type="button"
            class="qs-tab"
            :class="{ on: mode === 'image' }"
            @click="switchMode('image')"
          >
            图片识别
          </button>
          <button
            type="button"
            class="qs-tab"
            :class="{ on: mode === 'camera' }"
            @click="switchMode('camera')"
          >
            摄像头扫码
          </button>
        </div>

        <template v-if="mode === 'image'">
          <div
            class="qs-drop"
            @click="fileRef?.click()"
            @dragover.prevent
            @drop.prevent="onDrop"
          >
            <div class="qs-drop-icon">🖼️</div>
            <div class="qs-drop-main">点击选择 / 拖入 / Ctrl+V 粘贴图片</div>
            <div class="qs-drop-hint">PNG · JPG · WEBP · 手机截图，全部本机解码</div>
          </div>
          <input
            ref="fileRef"
            type="file"
            accept="image/*"
            style="display: none"
            @change="onFileChange"
          />
          <div v-if="busy" class="qs-note">正在识别…</div>
        </template>

        <template v-else>
          <el-button type="primary" style="width: 100%" @click="camOn ? stopCam() : startCam()">
            {{ camOn ? '停止摄像头' : '打开摄像头' }}
          </el-button>
          <div class="qs-note">
            对准二维码即可，识别到会自动框住；画面不会离开这台设备。
          </div>
          <div v-if="camError" class="qs-error">{{ camError }}</div>
        </template>

        <div v-if="history.length" class="qs-history">
          <div class="lb-label">本次识别记录</div>
          <button
            v-for="(h, i) in history"
            :key="`${h}-${i}`"
            type="button"
            class="qs-his"
            :title="h"
            @click="pick(h)"
          >
            {{ h }}
          </button>
        </div>
      </aside>

      <!-- 右：画面 + 结果 -->
      <section class="qs-main">
        <div v-if="mode === 'camera'" class="qs-cam">
          <video ref="videoRef" class="qs-video" playsinline muted autoplay />
          <canvas ref="canvasRef" class="qs-canvas" />
          <div v-if="!camOn" class="qs-cam-off">摄像头未开启</div>
        </div>

        <div v-if="result" class="qs-result">
          <div class="qs-result-head">
            <span class="qs-kind">{{ info?.label }}</span>
            <span class="qs-len">{{ result.text.length }} 字符</span>
          </div>
          <div class="qs-text">{{ result.text }}</div>

          <div v-if="wifi" class="qs-wifi">
            <div>SSID：<b>{{ wifi.ssid }}</b></div>
            <div>密码：{{ wifi.password ? (showWifi ? wifi.password : '••••••••') : '（无密码）' }}</div>
            <div>网络：{{ wifi.hidden ? '隐藏' : '开放广播' }}</div>
          </div>

          <div class="qs-acts">
            <el-button @click="copy(result.text)">复制内容</el-button>
            <el-button v-if="isUrl" type="primary" @click="openUrl">打开链接</el-button>
            <el-button v-if="wifi?.password" @click="toggleWifi">
              {{ showWifi ? '隐藏密码' : '显示密码' }}
            </el-button>
            <el-button v-if="wifi?.password" @click="copy(wifi.password!)">复制密码</el-button>
          </div>
        </div>

        <div v-else-if="mode === 'image'" class="qs-empty">
          <div class="qs-empty-icon">📷</div>
          <div class="qs-empty-title">还没有识别到内容</div>
          <div class="qs-empty-desc">
            支持带透明通道的截图、反色（白码黑底）与小缩放比的图；识别全过程离线执行。
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import ToolHeader from '../../components/ToolHeader.vue'
import { qrTools, createCanvas, loadImage, releaseCanvas, type QrHit } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useTool'

type Mode = 'image' | 'camera'

/** 超大图先缩到这个上限再解码，避免卡住主线程 */
const MAX_SIDE = 2000
const HISTORY_MAX = 8

const mode = ref<Mode>('image')
const busy = ref(false)
const result = ref<QrHit | null>(null)
const history = ref<string[]>([])
const showWifi = ref(false)
const fileRef = ref<HTMLInputElement | null>(null)
const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const camOn = ref(false)
const camError = ref('')
const record = useToolHistory('qrscan')

const info = computed(() => (result.value ? qrTools.describeQrContent(result.value.text) : null))
const isUrl = computed(() => info.value?.kind === 'url')
const wifi = computed(() =>
  result.value && info.value?.kind === 'wifi' ? qrTools.parseWifiQr(result.value.text) : null,
)

let stream: MediaStream | null = null
let raf = 0
let frames = 0
let lastCamText = ''
let poly: { x: number; y: number }[] = []

function switchMode(next: Mode): void {
  if (next === mode.value) return
  if (next === 'image') stopCam()
  mode.value = next
}

async function decodeBlob(blob: Blob): Promise<void> {
  if (!blob.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件')
    return
  }
  busy.value = true
  result.value = null
  showWifi.value = false
  try {
    const img = await loadImage(blob)
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
      ElMessage.warning('没有识别到二维码')
      return
    }
    accept(hit, '图片')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '图片读取失败')
  } finally {
    busy.value = false
  }
}

function onFileChange(e: Event): void {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) void decodeBlob(file)
  input.value = ''
}

function onDrop(e: DragEvent): void {
  const file = e.dataTransfer?.files?.[0]
  if (file) void decodeBlob(file)
}

function onPaste(e: ClipboardEvent): void {
  if (mode.value !== 'image') return
  const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith('image/'))
  const file = item?.getAsFile()
  if (file) void decodeBlob(file)
}

function accept(hit: QrHit, source: string): void {
  result.value = hit
  showWifi.value = false
  poly = hit.corners
  if (source !== '摄像头' || hit.text !== lastCamText) {
    history.value = [hit.text, ...history.value.filter((t) => t !== hit.text)].slice(0, HISTORY_MAX)
    void record('识别二维码', `${source} · ${hit.text.slice(0, 60)}`)
  }
  if (source === '摄像头') lastCamText = hit.text
}

function pick(text: string): void {
  result.value = { text, corners: [] }
  showWifi.value = false
  poly = []
}

function copy(v: string): void {
  if (!navigator.clipboard) {
    ElMessage.error('当前环境不支持剪贴板，请手动复制')
    return
  }
  void navigator.clipboard
    .writeText(v)
    .then(() => ElMessage.success('已复制'))
    .catch(() => ElMessage.error('复制失败'))
}

function openUrl(): void {
  if (!isUrl.value || !result.value) return
  window.open(result.value.text, '_blank', 'noopener,noreferrer')
}

function toggleWifi(): void {
  showWifi.value = !showWifi.value
}

async function startCam(): Promise<void> {
  camError.value = ''
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    })
    const v = videoRef.value
    if (!v) throw new Error('画面未就绪')
    v.srcObject = stream
    await v.play()
    camOn.value = true
    lastCamText = ''
    raf = requestAnimationFrame(tick)
  } catch (err) {
    stopCam()
    camError.value =
      err instanceof Error && err.name === 'NotAllowedError'
        ? '摄像头权限被拒绝，请在浏览器地址栏允许后重试'
        : `无法访问摄像头：${err instanceof Error ? err.message : String(err)}`
  }
}

function tick(): void {
  const v = videoRef.value
  const c = canvasRef.value
  if (!v || !c) return
  if (v.readyState >= 2 && v.videoWidth > 0) {
    if (c.width !== v.videoWidth) {
      c.width = v.videoWidth
      c.height = v.videoHeight
    }
    const ctx = c.getContext('2d', { willReadFrequently: true })
    if (ctx) {
      ctx.drawImage(v, 0, 0, c.width, c.height)
      if (frames++ % 4 === 0) {
        try {
          const hit = qrTools.decodeQr(ctx.getImageData(0, 0, c.width, c.height))
          if (hit) accept(hit, '摄像头')
        } catch {
          /* 单帧失败忽略，下一帧继续 */
        }
      }
      if (poly.length === 4) {
        ctx.beginPath()
        ctx.moveTo(poly[0].x, poly[0].y)
        for (let i = 1; i < 4; i++) ctx.lineTo(poly[i].x, poly[i].y)
        ctx.closePath()
        ctx.lineWidth = Math.max(3, Math.round(c.width / 200))
        ctx.strokeStyle = '#00b42a'
        ctx.stroke()
      }
    }
  }
  raf = requestAnimationFrame(tick)
}

function stopCam(): void {
  if (raf) cancelAnimationFrame(raf)
  raf = 0
  poly = []
  stream?.getTracks().forEach((t) => t.stop())
  stream = null
  const v = videoRef.value
  if (v) v.srcObject = null
  camOn.value = false
}

onMounted(() => window.addEventListener('paste', onPaste))
onBeforeUnmount(() => {
  window.removeEventListener('paste', onPaste)
  stopCam()
})
</script>

<style scoped>
.qs-layout {
  display: grid;
  grid-template-columns: minmax(240px, 320px) minmax(420px, 1fr);
  gap: 20px;
  align-items: start;
}
.qs-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}
.qs-tab {
  flex: 1;
  border: 1px solid var(--color-border);
  background: var(--color-bg-page);
  color: var(--color-text-secondary);
  border-radius: 6px;
  font-size: 13px;
  padding: 7px 0;
  cursor: pointer;
}
.qs-tab.on {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
  font-weight: 600;
}
.qs-drop {
  border: 1px dashed var(--color-border);
  border-radius: 8px;
  padding: 26px 14px;
  text-align: center;
  cursor: pointer;
  transition: border-color 120ms ease;
}
.qs-drop:hover {
  border-color: var(--color-primary);
}
.qs-drop-icon {
  font-size: 30px;
}
.qs-drop-main {
  font-size: 13px;
  margin-top: 6px;
}
.qs-drop-hint,
.qs-note {
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.7;
}
.qs-drop-hint {
  margin-top: 4px;
}
.qs-note {
  margin-top: 10px;
}
.qs-error {
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-error);
}
.qs-history {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.qs-his {
  text-align: left;
  border: 1px solid var(--color-border);
  background: var(--color-bg-page);
  border-radius: 6px;
  font-size: 12px;
  color: var(--color-text-secondary);
  padding: 6px 10px;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.qs-his:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.qs-cam {
  position: relative;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 4 / 3;
}
.qs-video,
.qs-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.qs-cam-off {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 13px;
}
.qs-result {
  margin-top: 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 14px 16px;
}
.qs-result-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.qs-kind {
  font-size: 12px;
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
  border-radius: 4px;
  padding: 1px 8px;
}
.qs-len {
  font-size: 12px;
  color: var(--color-text-secondary);
}
.qs-text {
  margin-top: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: 1.7;
  word-break: break-all;
  white-space: pre-wrap;
  user-select: text;
}
.qs-wifi {
  margin-top: 10px;
  font-size: 13px;
  line-height: 1.8;
  background: var(--color-bg-page);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 8px 12px;
}
.qs-acts {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.qs-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 320px;
  gap: 6px;
  border: 1px dashed var(--color-border);
  border-radius: 8px;
  padding: 20px;
}
.qs-empty-icon {
  font-size: 38px;
}
.qs-empty-title {
  font-size: 16px;
  font-weight: 600;
}
.qs-empty-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  max-width: 420px;
  line-height: 1.7;
}
</style>
