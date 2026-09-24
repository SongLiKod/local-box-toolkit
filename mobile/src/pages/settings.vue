<template>
  <view :class="['lb-page', themeClass]" :style="themeStyle">
    <view class="lb-card">
      <view class="lb-title">外观</view>
      <view class="lb-desc">主题与配色即时生效，保存在本机。</view>
      <view class="lb-label">显示模式</view>
      <view class="lb-chip-row">
        <view
          v-for="m in modes"
          :key="m.value"
          class="lb-chip"
          :class="{ active: themeMode === m.value }"
          @click="pickTheme(m.value)"
        >
          {{ m.label }}
        </view>
      </view>
      <view class="lb-label">主题配色</view>
      <view class="lb-chip-row">
        <view
          v-for="p in palettes"
          :key="p.id"
          class="lb-chip"
          :class="{ active: themePalette === p.id }"
          @click="pickPalette(p.id)"
        >
          {{ p.name }}
        </view>
      </view>
    </view>

    <view class="lb-card">
      <view class="lb-title">本地数据</view>
      <view class="lb-desc">配置保存在本机。可导出备份，换设备时手动导入。</view>
      <button class="lb-btn" @click="exportBak">导出备份</button>
      <button class="lb-btn lb-btn-plain" @click="clearHist">清空操作历史</button>
    </view>

    <view class="lb-card">
      <view class="lb-title">版本与更新</view>
      <view class="lb-desc">{{ descText }}</view>
      <button class="lb-btn" :disabled="checking || upgrading" @click="checkUpgrade">
        {{ checking ? '检查中…' : upgrading ? '升级中…' : '检查更新' }}
      </button>
      <view v-if="statusText" class="lb-notice">{{ statusText }}</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  themeClass,
  themeStyle,
  themeMode,
  themePalette,
  setThemeMode,
  setThemePalette,
} from '../composables/useTheme'
import { THEME_PRESETS, type ThemeMode, type ThemePaletteId } from '@localbox/core/index'
import { store } from '../store'
import { saveTextAs } from '../utils/files'
import { APP_VERSION, checkForUpdate, currentVersion, runUpgrade, type UpgradeInfo } from '../utils/upgrade'

const modes: Array<{ value: ThemeMode; label: string }> = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟随系统' },
]
const palettes = THEME_PRESETS

function pickTheme(m: ThemeMode): void {
  void setThemeMode(m)
}
function pickPalette(id: ThemePaletteId): void {
  void setThemePalette(id)
}

async function exportBak(): Promise<void> {
  const bak = await store.exportBackup()
  saveTextAs(`localbox-backup-${Date.now()}.json`, JSON.stringify(bak, null, 2))
  uni.showToast({ title: '已导出备份', icon: 'none' })
}

async function clearHist(): Promise<void> {
  await store.clearHistory()
  uni.showToast({ title: '已清空历史', icon: 'none' })
}

const nativeVer = currentVersion()
const preview = !nativeVer
const verText = nativeVer || APP_VERSION
const descText = preview
  ? `当前版本 v${verText}。网页预览模式：安装升级请在安卓 App 内操作。`
  : `当前版本 v${verText}。升级全程在应用内完成：静默下载后由系统确认安装，无需跳转浏览器或文件管理器。`
const checking = ref(false)
const upgrading = ref(false)
const statusText = ref('')

/** 检查更新 → 有新版本弹确认 → 应用内完成下载与安装 */
async function checkUpgrade(): Promise<void> {
  if (checking.value || upgrading.value) return
  statusText.value = ''
  checking.value = true
  let found: UpgradeInfo | null = null
  try {
    uni.showLoading({ title: '检查更新…', mask: true })
    found = await checkForUpdate()
    uni.hideLoading()
  } catch (e) {
    uni.hideLoading()
    const msg = e instanceof Error ? e.message : String(e)
    statusText.value = `检查失败：${msg}`
    uni.showToast({ title: '检查更新失败', icon: 'none' })
    return
  } finally {
    checking.value = false
  }
  if (!found) {
    statusText.value = '已是最新版本'
    uni.showToast({ title: '已是最新版本', icon: 'none' })
    return
  }
  const target = found
  uni.showModal({
    title: `发现新版本 v${target.version}`,
    content: (target.notes || '修复与体验优化').slice(0, 300),
    confirmText: '立即升级',
    success: (r) => {
      if (r.confirm) void doUpgrade(target)
    },
  })
}

async function doUpgrade(info: UpgradeInfo): Promise<void> {
  upgrading.value = true
  try {
    const res = await runUpgrade(info, (t) => {
      statusText.value = t
    })
    statusText.value = res.message
    uni.showToast({ title: res.message, icon: 'none' })
  } finally {
    upgrading.value = false
  }
}
</script>
