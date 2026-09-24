<template>
  <ToolPage tool-id="idphoto" notice="人脸检测/抠图/换底/300DPI导出全部本地完成，无水印。">
    <view class="lb-card">
      <button class="lb-btn lb-btn-plain" @click="pick">选择人像照片</button>
      <view v-if="lastFile" class="lb-file">{{ lastFile.name }}</view>
      <view class="lb-label">尺寸</view>
      <picker :range="specNames" :value="specIdx" @change="specIdx = Number($event.detail.value)">
        <view class="lb-input">{{ specNames[specIdx] }}</view>
      </picker>
      <view class="lb-label">背景</view>
      <view class="lb-row">
        <view v-for="b in bgs" :key="b.value" class="lb-chip" :class="{ active: bg === b.value }" @click="bg = b.value">
          {{ b.label }}
        </view>
      </view>
      <view class="lb-label">人脸占比 {{ Math.round(faceRatio * 100) }}%</view>
      <slider v-model="faceRatio" :min="35" :max="75" :value="55" @change="faceRatio = $event.detail.value / 100" />
      <button class="lb-btn" @click="process">生成证件照</button>
      <image v-if="previewUrl" :src="previewUrl" style="width: 300rpx; height: 400rpx; margin: 16rpx auto; display: block; background: #fff" />
      <button v-if="previewUrl" class="lb-btn lb-btn-plain" @click="exportPng">导出PNG(300DPI)</button>
      <button v-if="previewUrl" class="lb-btn lb-btn-plain" @click="exportJpg">导出JPG(300DPI)</button>
    </view>
  </ToolPage>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import { photoSpecs, idPhotoTools, loadImage } from '@localbox/core/index'
import { chooseFiles, saveBlobAs } from '../../utils/files'
import { useToolHistory } from '../../composables/useHistory'

const specs = photoSpecs.PHOTO_SPECS
const specNames = computed(() => specs.map((s) => `${s.name} ${s.widthMm}×${s.heightMm}mm`))
const specIdx = ref(0)
const bgs = [
  { value: 'white', label: '白底' },
  { value: 'blue', label: '蓝底' },
  { value: 'red', label: '红底' },
  { value: 'original', label: '原底' },
] as const
const bg = ref<'white' | 'blue' | 'red' | 'original'>('white')
const faceRatio = ref(0.55)
const previewUrl = ref('')
const lastFile = ref<File | null>(null)
const record = useToolHistory('idphoto')
let resultCanvas: HTMLCanvasElement | null = null

async function pick(): Promise<void> {
  try {
    const picked = await chooseFiles('.jpg,.jpeg,.png,.webp,.bmp', false)
    if (picked.length) {
      const file = picked[0]
      lastFile.value = file
      uni.showToast({ title: `已选择：${file.name}`, icon: 'none' })
    } else {
      uni.showToast({ title: '未选择照片', icon: 'none' })
    }
  } catch {
    /* 取消 */
  }
}

async function process(): Promise<void> {
  const file = pickFile()
  if (!file) {
    uni.showToast({ title: '请先选择照片', icon: 'none' })
    return
  }
  try {
    const img = await loadImage(file)
    const { canvas } = await idPhotoTools.makeIdPhoto(img, {
      spec: specs[specIdx.value],
      background: bg.value,
      faceRatio: faceRatio.value,
      zoom: 1,
      tolerance: 60,
    })
    resultCanvas = canvas
    previewUrl.value = canvas.toDataURL('image/png')
    record('制作证件照', `${specs[specIdx.value].name}/${bg.value}`)
  } catch (e) {
    uni.showToast({ title: e instanceof Error ? e.message : String(e), icon: 'none' })
  }
}

function pickFile(): File | null {
  return lastFile.value
}

async function exportPng(): Promise<void> {
  if (!resultCanvas) return
  const blob = await idPhotoTools.exportIdPhoto(resultCanvas, 'png', 300)
  saveBlobAs('idphoto-300dpi.png', blob)
  record('导出', 'PNG 300DPI')
}

async function exportJpg(): Promise<void> {
  if (!resultCanvas) return
  const blob = await idPhotoTools.exportIdPhoto(resultCanvas, 'jpg', 300)
  saveBlobAs('idphoto-300dpi.jpg', blob)
  record('导出', 'JPG 300DPI')
}
</script>
