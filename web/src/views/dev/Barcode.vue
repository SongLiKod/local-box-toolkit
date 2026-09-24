<template>
  <div class="lb-card">
    <ToolHeader tool-id="barcode" />
    <el-radio-group v-model="params.kind" class="lb-section">
      <el-radio-button value="qr">二维码</el-radio-button>
      <el-radio-button value="bar">条形码</el-radio-button>
    </el-radio-group>

    <div class="lb-row lb-section">
      <el-input v-model="params.text" placeholder="输入内容" style="width: 360px" />
      <template v-if="params.kind === 'qr'">
        <el-select v-model="params.level" style="width: 110px">
          <el-option label="容错L" value="L" />
          <el-option label="容错M" value="M" />
          <el-option label="容错Q" value="Q" />
          <el-option label="容错H" value="H" />
        </el-select>
        <span>尺寸</span>
        <el-input-number v-model="params.size" :min="128" :max="1024" :step="64" controls-position="right" style="width: 120px" />
      </template>
      <template v-else>
        <el-select v-model="params.format" style="width: 140px">
          <el-option v-for="f in formats" :key="f" :label="f" :value="f" />
        </el-select>
        <el-text size="small" type="info">{{ hint }}</el-text>
      </template>
      <el-button type="primary" @click="gen">生成</el-button>
      <el-button :disabled="!result" @click="download">下载</el-button>
    </div>

    <div v-if="result" class="lb-preview lb-zoomable" v-html="result" @click="previewResult"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import ToolHeader from '../../components/ToolHeader.vue'
import { codeTools, saveBlob } from '@localbox/core/index'
import { useToolHistory, useToolParams } from '../../composables/useTool'
import { openImageViewer } from '../../composables/useImageViewer'

const formats = ['CODE128', 'CODE39', 'EAN13', 'EAN8', 'UPC', 'ITF14', 'pharmacode'] as const
const result = ref('')
const previewSrc = ref('')
const { params } = useToolParams('barcode', {
  kind: 'qr' as 'qr' | 'bar',
  text: 'https://example.com',
  level: 'M' as 'L' | 'M' | 'Q' | 'H',
  size: 256,
  format: 'CODE128' as (typeof formats)[number],
})
const record = useToolHistory('barcode')
const hint = computed(() => codeTools.barcodeHint(params.value.format))

async function gen(): Promise<void> {
  if (!params.value.text) {
    ElMessage.error('请输入内容')
    return
  }
  try {
    if (params.value.kind === 'qr') {
      const url = await codeTools.generateQrDataUrl(params.value.text, {
        size: params.value.size,
        level: params.value.level,
      })
      result.value = `<img src="${url}" width="${params.value.size}" height="${params.value.size}" alt="qrcode" />`
      previewSrc.value = url
    } else {
      const svg = codeTools.generateBarcodeSvg(params.value.text, params.value.format)
      result.value = svg
      previewSrc.value = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    }
    record('生成', `${params.value.kind === 'qr' ? '二维码' : params.value.format}`)
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : String(e))
    result.value = ''
    previewSrc.value = ''
  }
}

function previewResult(): void {
  if (previewSrc.value) openImageViewer(previewSrc.value)
}

async function download(): Promise<void> {
  if (params.value.kind === 'qr') {
    const blob = await codeTools.generateQrBlob(params.value.text, { size: params.value.size, level: params.value.level })
    await saveBlob('qrcode.png', blob)
  } else {
    const svg = codeTools.generateBarcodeSvg(params.value.text, params.value.format)
    await saveBlob('barcode.svg', new Blob([svg], { type: 'image/svg+xml' }))
  }
}
</script>

<style scoped>
.lb-preview {
  margin-top: 16px;
  padding: 20px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: #fff;
  display: inline-block;
}
</style>
