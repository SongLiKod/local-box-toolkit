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
        <view
          class="lb-chip"
          :class="{ active: themePalette === 'custom' }"
          @click="pickPalette('custom')"
        >
          自定义
        </view>
      </view>

      <!-- 自定义配色编辑器（与 Web 设置同源：浅/深色分别编辑，改完存为「自定义」） -->
      <template v-if="themePalette === 'custom'">
        <view class="lb-label">自定义配色</view>
        <view class="lb-desc">先用「用当前预设生成」垫底，再微调色值；浅色与深色分别保存。</view>
        <view class="lb-chip-row">
          <view
            class="lb-chip"
            :class="{ active: editAppearance === 'light' }"
            @click="editAppearance = 'light'"
          >
            编辑浅色
          </view>
          <view
            class="lb-chip"
            :class="{ active: editAppearance === 'dark' }"
            @click="editAppearance = 'dark'"
          >
            编辑深色
          </view>
        </view>
        <view v-for="f in colorFields" :key="f.key" class="lb-color-row">
          <text class="lb-color-label">{{ f.label }}</text>
          <input
            class="lb-hex"
            :value="draft[f.key]"
            @input="onHexInput(f.key, $event)"
            @blur="applyDraft"
          />
          <view
            class="lb-swatch"
            :style="{ background: draft[f.key] }"
            @click="pickColor(f.key)"
          ></view>
        </view>
        <view class="lb-row">
          <button class="lb-btn lb-btn-plain" @click="usePresetAsCustom">用当前预设生成</button>
          <button class="lb-btn lb-btn-plain" @click="doResetCustom">恢复默认</button>
        </view>
      </template>
    </view>

    <view class="lb-card">
      <view class="lb-title">本地数据</view>
      <view class="lb-desc">配置保存在本机。可导出备份，换设备时手动导入（与现有数据合并）。</view>
      <view class="lb-counts">
        收藏 {{ counts.fav }} 项 · 历史 {{ counts.hist }} 条 · 便签 {{ counts.notes }} 条
      </view>
      <view class="lb-row">
        <button class="lb-btn" @click="exportBak">导出备份</button>
        <button class="lb-btn lb-btn-plain" @click="importBak">导入备份</button>
      </view>
      <view class="lb-row">
        <button class="lb-btn lb-btn-plain" :disabled="!counts.fav" @click="clearFav">
          清空收藏
        </button>
        <button class="lb-btn lb-btn-plain" :disabled="!counts.hist" @click="clearHist">
          清空操作历史
        </button>
      </view>
    </view>

    <view class="lb-card">
      <view class="lb-title">运行环境</view>
      <view class="lb-env-row">
        <text class="lb-env-key">平台</text>
        <text class="lb-env-val">{{ envPlatform }}</text>
      </view>
      <view class="lb-env-row">
        <text class="lb-env-key">存储介质</text>
        <text class="lb-env-val">{{ envStorage }}</text>
      </view>
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

    <view class="lb-notice">
      🔒 隐私声明：全部运算本地执行，无广告、无强制登录、基础功能无次数与文件大小限制，不收集任何个人信息。
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  themeClass,
  themeStyle,
  themeMode,
  themePalette,
  resolvedTheme,
  customColors,
  initTheme,
  setThemeMode,
  setThemePalette,
  setCustomTokens,
  resetCustomTheme,
} from '../composables/useTheme'
import {
  THEME_PRESETS,
  TOKEN_LABELS,
  getPresetTokens,
  normalizeThemePreference,
  resolveAppearanceTokens,
  updateTools,
  type LocalBackup,
  type ResolvedTheme,
  type ThemeMode,
  type ThemePaletteId,
  type ThemeTokens,
} from '@localbox/core/index'
import { store } from '../store'
import { chooseFiles, saveTextAs, openColorPicker } from '../utils/files'
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

/* ---------- 自定义配色编辑器（浅/深色分别编辑，改完自动存为「自定义」） ---------- */
const editAppearance = ref<ResolvedTheme>(resolvedTheme.value)
const colorFields: Array<{ key: keyof ThemeTokens; label: string }> = [
  { key: 'primary', label: TOKEN_LABELS.primary },
  { key: 'primaryLight', label: TOKEN_LABELS.primaryLight },
  { key: 'bgPage', label: TOKEN_LABELS.bgPage },
  { key: 'bgCard', label: TOKEN_LABELS.bgCard },
  { key: 'textPrimary', label: TOKEN_LABELS.textPrimary },
  { key: 'textSecondary', label: TOKEN_LABELS.textSecondary },
  { key: 'border', label: TOKEN_LABELS.border },
  { key: 'success', label: TOKEN_LABELS.success },
  { key: 'warning', label: TOKEN_LABELS.warning },
  { key: 'error', label: TOKEN_LABELS.error },
]
const draft = reactive({} as Record<keyof ThemeTokens, string>)

function appearancePref(): ReturnType<typeof normalizeThemePreference> {
  return normalizeThemePreference({
    mode: themeMode.value,
    palette: themePalette.value,
    custom: customColors.value,
  })
}

function syncDraft(): void {
  Object.assign(draft, resolveAppearanceTokens(appearancePref(), editAppearance.value))
}

watch(editAppearance, syncDraft)
watch(themePalette, syncDraft)
syncDraft()

/** 归一化输入的色值（允许省略 #），非法返回 null */
function normHex(v: string): string | null {
  const raw = (v ?? '').trim().replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null
  return `#${raw.toUpperCase()}`
}

/** 把草稿里的合法色值写入自定义主题（非法的保持原值） */
async function applyDraft(): Promise<void> {
  const patch: Partial<ThemeTokens> = {}
  for (const f of colorFields) {
    const hex = normHex(draft[f.key])
    if (hex) patch[f.key] = hex
  }
  if (!Object.keys(patch).length) return
  await setCustomTokens(editAppearance.value, patch)
  syncDraft()
}

function onHexInput(key: keyof ThemeTokens, e: { detail?: { value?: string } }): void {
  const v = e?.detail?.value
  if (typeof v === 'string') draft[key] = v
}

/** 色块点击唤起系统取色器（H5/WebView 的 input[type=color]） */
function pickColor(key: keyof ThemeTokens): void {
  openColorPicker(normHex(draft[key]) ?? '#1677FF', (hex) => {
    draft[key] = hex
    void applyDraft()
  })
}

/** 用当前预设的色值填充自定义（与 Web「用当前预设生成自定义」一致） */
async function usePresetAsCustom(): Promise<void> {
  const source = (themePalette.value === 'custom'
    ? 'azure'
    : themePalette.value) as Exclude<ThemePaletteId, 'custom'>
  const tokens = getPresetTokens(source, editAppearance.value)
  Object.assign(draft, tokens)
  await setCustomTokens(editAppearance.value, tokens)
}

async function doResetCustom(): Promise<void> {
  await resetCustomTheme()
  syncDraft()
}

/* ---------- 本地数据：统计 / 导出 / 导入 / 清空 ---------- */
const counts = ref({ fav: 0, hist: 0, notes: 0 })

async function refreshCounts(): Promise<void> {
  try {
    const [fav, hist, notes] = await Promise.all([
      store.getFavorites(),
      store.getHistory(),
      store.getNotes(),
    ])
    counts.value = { fav: fav.length, hist: hist.length, notes: notes.length }
  } catch {
    /* 计数失败不阻塞设置页 */
  }
}

async function exportBak(): Promise<void> {
  const bak = await store.exportBackup()
  saveTextAs(`localbox-backup-${Date.now()}.json`, JSON.stringify(bak, null, 2))
  uni.showToast({ title: '已导出备份', icon: 'none' })
}

function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsText(file, 'utf-8')
  })
}

function confirmDlg(title: string, content: string): Promise<boolean> {
  return new Promise((resolve) => {
    uni.showModal({
      title,
      content,
      success: (res) => resolve(!!res.confirm),
      fail: () => resolve(false),
    })
  })
}

async function importBak(): Promise<void> {
  let files: File[]
  try {
    files = await chooseFiles('application/json,.json', false)
  } catch {
    return // 用户取消选择
  }
  const file = files[0]
  if (!file) return
  let data: LocalBackup
  try {
    data = JSON.parse(await readFileText(file)) as LocalBackup
  } catch {
    uni.showToast({ title: '备份文件解析失败', icon: 'none' })
    return
  }
  const ok = await confirmDlg(
    '导入备份',
    '导入后与现有数据合并。主题、收藏、历史、参数、便签会写入本机。',
  )
  if (!ok) return
  try {
    await store.importBackup(data, 'merge')
    await initTheme() // 备份里的主题立即生效
    await refreshCounts()
    syncDraft()
    uni.showToast({ title: '已导入备份', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e instanceof Error ? e.message : '导入失败', icon: 'none' })
  }
}

async function clearFav(): Promise<void> {
  const ok = await confirmDlg(
    '清空收藏',
    `将删除全部 ${counts.value.fav} 个收藏，主题与历史不受影响，是否继续？`,
  )
  if (!ok) return
  await store.clearFavorites()
  uni.showToast({ title: '已清空收藏', icon: 'none' })
  void refreshCounts()
}

async function clearHist(): Promise<void> {
  const ok = await confirmDlg('清空历史', `将删除 ${counts.value.hist} 条操作历史，是否继续？`)
  if (!ok) return
  await store.clearHistory()
  uni.showToast({ title: '已清空历史', icon: 'none' })
  void refreshCounts()
}

/* ---------- 运行环境 ---------- */
const nativeVer = currentVersion()
const preview = !nativeVer
const envPlatform = preview ? '网页预览（H5）' : '安卓 App（Android）'
const envStorage = 'uni-app 本机存储（不跨设备同步）'
const verText = nativeVer || APP_VERSION
const descText = preview
  ? `网页预览模式：只能检查更新，安装升级请在安卓 App 内操作。`
  : `升级全程在应用内完成：静默下载后由系统确认安装，无需跳转浏览器或文件管理器。`

/* ---------- 版本检查与应用内升级 ---------- */
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

// 页面每次显示时刷新统计与草稿（其他页可能改了收藏/历史/主题）
onShow(() => {
  void refreshCounts()
  syncDraft()
})
</script>

<style scoped>
.lb-counts {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  margin-bottom: 8rpx;
}
.lb-color-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 12rpx 0;
  border-bottom: 1px solid var(--color-border);
}
.lb-color-row:last-of-type {
  border-bottom: none;
}
.lb-color-label {
  width: 132rpx;
  flex-shrink: 0;
  font-size: 24rpx;
  color: var(--color-text-secondary);
}
.lb-hex {
  flex: 1;
  min-width: 0;
  height: 64rpx;
  padding: 0 16rpx;
  font-size: 26rpx;
  background: var(--color-bg-page);
  border: 1px solid var(--color-border);
  border-radius: 12rpx;
  color: var(--color-text-primary);
  box-sizing: border-box;
}
.lb-swatch {
  width: 72rpx;
  height: 72rpx;
  flex-shrink: 0;
  border-radius: 12rpx;
  border: 1px solid var(--color-border);
}
.lb-env-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 8rpx 0;
  font-size: 26rpx;
}
.lb-env-key {
  color: var(--color-text-secondary);
  flex-shrink: 0;
}
.lb-env-val {
  color: var(--color-text-primary);
  text-align: right;
}
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
