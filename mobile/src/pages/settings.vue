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

      <view class="lb-ver-row">
        <view class="lb-ver">
          当前版本 <text class="lb-ver-num">v{{ verText }}</text>
        </view>
        <button
          class="lb-btn lb-btn-sm"
          :disabled="checking || upgrading"
          @click="checkUpgrade"
        >
          {{ checking ? '检查中…' : '检查更新' }}
        </button>
      </view>
      <view v-if="lastChecked" class="lb-meta">上次检查：{{ lastChecked }}</view>
      <view v-if="errText" class="lb-err">{{ errText }}</view>

      <!-- 已是最新 -->
      <view v-if="checked && !found && !errText" class="lb-ok">
        <text class="lb-ok-icon">✓</text> 已是最新版本
      </view>

      <!-- 发现新版本：说明 + 应用内升级 + 发布页 -->
      <view v-if="found" class="lb-update">
        <view class="lb-update-head">
          <text class="lb-update-title">发现新版本 v{{ found.version }}</text>
          <text v-if="publishText" class="lb-meta">{{ publishText }}</text>
        </view>
        <scroll-view v-if="notesLines.length" scroll-y class="lb-notes">
          <view v-for="(line, i) in notesLines" :key="i" class="lb-note-line">{{ line }}</view>
        </scroll-view>
        <view v-else class="lb-desc">本次更新未提供更新说明。</view>
        <button class="lb-btn" :disabled="upgrading" @click="doUpgrade(found)">
          {{ upgrading ? '升级中…' : '立即升级' }}
        </button>
        <view class="lb-row">
          <button
            v-if="found.htmlUrl"
            class="lb-btn lb-btn-plain"
            :disabled="upgrading"
            @click="openPage"
          >
            查看发布页
          </button>
        </view>
      </view>

      <!-- 下载进度 -->
      <view v-if="progress !== null" class="lb-progress">
        <view class="lb-progress-track">
          <view class="lb-progress-inner" :style="{ width: progress + '%' }"></view>
        </view>
        <text class="lb-progress-num">{{ progress }}%</text>
      </view>
      <view v-if="statusText" class="lb-notice">{{ statusText }}</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  themeClass,
  themeStyle,
  themeMode,
  themePalette,
  setThemeMode,
  setThemePalette,
} from '../composables/useTheme'
import { THEME_PRESETS, updateTools, type ThemeMode, type ThemePaletteId } from '@localbox/core/index'
import { store } from '../store'
import { saveTextAs } from '../utils/files'
import {
  APP_VERSION,
  checkForUpdate,
  currentVersion,
  openExternalUrl,
  runUpgrade,
  type UpgradeInfo,
} from '../utils/upgrade'

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
  ? `网页预览模式：只能检查更新，安装升级请在安卓 App 内操作。`
  : `升级全程在应用内完成：静默下载后由系统确认安装，无需跳转浏览器或文件管理器。`

const checking = ref(false)
const upgrading = ref(false)
const checked = ref(false)
const found = ref<UpgradeInfo | null>(null)
const errText = ref('')
const statusText = ref('')
const lastChecked = ref('')
const progress = ref<number | null>(null)

const notesLines = computed(() =>
  found.value ? updateTools.releaseNotesLines(found.value.notes) : []
)
const publishText = computed(() =>
  found.value?.publishedAt
    ? `发布于 ${updateTools.formatReleaseTime(found.value.publishedAt)}`
    : ''
)

/** 检查更新：结果内联展示（已最新 / 新版本说明），失败可直接重试 */
async function checkUpgrade(): Promise<void> {
  if (checking.value || upgrading.value) return
  errText.value = ''
  statusText.value = ''
  found.value = null
  progress.value = null
  checking.value = true
  uni.showLoading({ title: '检查更新…', mask: true })
  try {
    found.value = await checkForUpdate()
    checked.value = true
    lastChecked.value = updateTools.formatReleaseTime(new Date().toISOString())
    if (!found.value) uni.showToast({ title: '已是最新版本', icon: 'none' })
  } catch (e) {
    errText.value = `检查失败：${e instanceof Error ? e.message : String(e)}`
    uni.showToast({ title: '检查更新失败', icon: 'none' })
  } finally {
    uni.hideLoading()
    checking.value = false
  }
}

/** 应用内升级：进度条 + 状态文字内联展示 */
async function doUpgrade(info: UpgradeInfo): Promise<void> {
  if (upgrading.value) return
  upgrading.value = true
  errText.value = ''
  statusText.value = ''
  progress.value = 0
  try {
    const res = await runUpgrade(
      info,
      (t) => {
        statusText.value = t
      },
      (p) => {
        progress.value = p
      }
    )
    statusText.value = res.message
    if (res.outcome === 'success') {
      // 应用即将重启，收敛面板
      found.value = null
      progress.value = null
    } else if (res.outcome === 'unsupported') {
      progress.value = null
    }
    if (res.outcome !== 'success') uni.showToast({ title: res.message, icon: 'none' })
  } finally {
    upgrading.value = false
  }
}

/** 打开 Release 页面（安卓走原生系统浏览器，预览走新标签页） */
function openPage(): void {
  const url = found.value?.htmlUrl
  if (url) openExternalUrl(url)
}
</script>

<style scoped>
.lb-ver-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-top: 8rpx;
}
.lb-ver {
  font-size: 26rpx;
  color: var(--color-text-secondary);
}
.lb-ver-num {
  font-weight: 600;
  color: var(--color-text-primary);
}
.lb-btn-sm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: auto !important;
  min-height: 72rpx;
  padding: 0 36rpx;
  margin: 0;
  font-size: 26rpx;
}
.lb-meta {
  margin-top: 12rpx;
  font-size: 22rpx;
  color: var(--color-text-secondary);
}
.lb-err {
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--color-error);
  background: var(--color-bg-page);
  border: 1px solid var(--color-border);
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  word-break: break-all;
}
.lb-ok {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-top: 20rpx;
  font-size: 26rpx;
  font-weight: 500;
  color: var(--color-success);
}
.lb-ok-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: var(--color-success);
  color: #fff;
  font-size: 22rpx;
}
.lb-update {
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1px solid var(--color-border);
}
.lb-update-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16rpx;
  flex-wrap: wrap;
}
.lb-update-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}
.lb-update .lb-meta {
  margin-top: 0;
}
.lb-notes {
  max-height: 320rpx;
  margin-top: 16rpx;
  padding: 16rpx 20rpx;
  background: var(--color-bg-page);
  border: 1px solid var(--color-border);
  border-radius: 12rpx;
}
.lb-note-line {
  font-size: 24rpx;
  line-height: 1.7;
  color: var(--color-text-secondary);
  word-break: break-all;
}
.lb-progress {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 8rpx;
}
.lb-progress-track {
  flex: 1;
  height: 16rpx;
  background: var(--color-bg-page);
  border: 1px solid var(--color-border);
  border-radius: 8rpx;
  overflow: hidden;
}
.lb-progress-inner {
  height: 100%;
  background: var(--color-primary);
  border-radius: 8rpx;
  transition: width 200ms ease;
}
.lb-progress-num {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--color-text-primary);
  min-width: 72rpx;
  text-align: right;
}
</style>
