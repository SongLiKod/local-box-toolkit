<template>
  <div class="lb-card">
    <h2 class="lb-title">设置</h2>
    <p class="lb-desc">所有配置保存在当前设备本地，不上传服务器、不跨设备同步。Electron 端写入 AppData 目录 JSON 文件。</p>

    <div class="lb-group">
      <div class="lb-glabel">明暗模式</div>
      <ThemeSwitch :show-palette="false" />
      <span class="lb-hint">当前生效：{{ resolvedTheme === 'dark' ? '深色' : '浅色' }} · {{ paletteLabel }}</span>
    </div>

    <div class="lb-group">
      <div class="lb-glabel">配色方案</div>
      <div class="lb-palettes">
        <button
          v-for="p in THEME_PRESETS"
          :key="p.id"
          type="button"
          class="lb-palette-card"
          :class="{ active: themePalette === p.id }"
          @click="setThemePalette(p.id)"
        >
          <span class="lb-swatches">
            <i :style="{ background: tokenOf(p.id, 'bgPage') }"></i>
            <i :style="{ background: tokenOf(p.id, 'bgCard') }"></i>
            <i :style="{ background: tokenOf(p.id, 'primary') }"></i>
            <i :style="{ background: tokenOf(p.id, 'textPrimary') }"></i>
          </span>
          <strong>{{ p.name }}</strong>
          <em>{{ p.desc }}</em>
        </button>
        <button
          type="button"
          class="lb-palette-card"
          :class="{ active: themePalette === 'custom' }"
          @click="setThemePalette('custom')"
        >
          <span class="lb-swatches">
            <i :style="{ background: customPreview.bgPage }"></i>
            <i :style="{ background: customPreview.bgCard }"></i>
            <i :style="{ background: customPreview.primary }"></i>
            <i :style="{ background: customPreview.textPrimary }"></i>
          </span>
          <strong>自定义</strong>
          <em>按当前外观微调色值</em>
        </button>
      </div>
    </div>

    <div class="lb-group">
      <div class="lb-glabel">自定义样式</div>
      <p class="lb-hint-block">先选一套预设作底，再改下面的颜色。修改后会保存为「自定义」，浅色和深色可分别配置。</p>
      <el-radio-group v-model="editAppearance" size="small" class="lb-edit-mode">
        <el-radio-button value="light">编辑浅色</el-radio-button>
        <el-radio-button value="dark">编辑深色</el-radio-button>
      </el-radio-group>
      <div class="lb-custom-grid">
        <div v-for="field in colorFields" :key="field.key" class="lb-color-field">
          <span>{{ field.label }}</span>
          <el-color-picker v-model="draft[field.key]" color-format="hex" @change="onColorChange" />
          <el-input v-model="draft[field.key]" size="small" @change="onColorChange" />
        </div>
      </div>
      <div class="lb-row">
        <el-button size="small" @click="useCurrentPresetAsCustom">用当前预设生成自定义</el-button>
        <el-button size="small" @click="resetCustomTheme">恢复默认晴空蓝</el-button>
      </div>
    </div>

    <div class="lb-group">
      <div class="lb-glabel">运行环境</div>
      <el-tag size="small" :type="isDesktop ? 'success' : 'info'">
        {{ isDesktop ? 'Electron 桌面客户端（完全离线可用）' : 'Web 浏览器（PWA 离线可用）' }}
      </el-tag>
      <el-tag size="small" type="info" style="margin-left: 8px">存储介质：{{ storageLabel }}</el-tag>
    </div>

    <div class="lb-group">
      <div class="lb-glabel">版本信息</div>
      <div class="lb-row">
        <el-tag size="small">LocalBox v{{ appVersion }}</el-tag>
        <el-button size="small" type="primary" :loading="checking" @click="checkUpdate">
          检查更新
        </el-button>
        <span class="lb-hint">与 Electron、安卓端及应用内升级检查同源</span>
      </div>

      <el-alert
        v-if="updateError"
        class="lb-update-alert"
        type="error"
        :closable="false"
        show-icon
        :title="updateError"
      />

      <el-alert
        v-else-if="updateResult && !updateResult.hasUpdate"
        class="lb-update-alert"
        type="success"
        :closable="false"
        show-icon
        :title="upToDateTitle"
        :description="`检查于 ${lastCheckedLabel}`"
      />

      <div v-else-if="updateResult" class="lb-update">
        <el-alert
          class="lb-update-alert"
          type="warning"
          :closable="false"
          show-icon
          :title="`发现新版本 v${updateResult.release.version}（当前 v${updateResult.current}）`"
          :description="updateReleaseMeta"
        />
        <div class="lb-notes">
          <div v-for="(line, i) in updateNotes" :key="i" class="lb-note-line">{{ line }}</div>
          <div v-if="!updateNotes.length" class="lb-note-line">本次更新未提供更新说明。</div>
        </div>
        <div class="lb-row">
          <el-button size="small" type="primary" @click="openReleasePage">打开发布页</el-button>
          <el-button v-if="updateAsset" size="small" @click="downloadUpdateAsset">
            下载 {{ updateAsset.name }}{{ assetSizeLabel }}
          </el-button>
        </div>
        <p class="lb-hint-block">
          {{ isDesktop
            ? '桌面端：下载安装包后覆盖安装即可；配置与数据保留在 AppData。'
            : '网页端可在发布页下载安装包；安卓 App 内可在「设置 → 版本与更新」一键应用内升级。' }}
        </p>
      </div>
    </div>

    <div class="lb-group">
      <div class="lb-glabel">本地数据</div>
      <div class="lb-row">
        <el-button size="small" @click="exportBak">导出备份</el-button>
        <el-button size="small" @click="importBak">导入备份</el-button>
        <el-button size="small" type="danger" @click="clearAll">清空收藏与历史记录</el-button>
      </div>
      <span class="lb-hint">收藏 {{ favCount }} 项 · 历史 {{ histCount }} 条 · 备份含主题/收藏/历史/参数/便签</span>
    </div>

    <el-alert type="success" :closable="false" show-icon
      title="隐私声明：全部运算本地执行，无广告、无强制登录、基础功能无次数与文件大小限制，不收集任何个人信息。" />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import ThemeSwitch from '../components/ThemeSwitch.vue'
import {
  THEME_PRESETS,
  TOKEN_LABELS,
  getPresetById,
  getPresetTokens,
  resolveAppearanceTokens,
  type ResolvedTheme,
  saveBlob,
  updateTools,
  type LocalBackup,
  type ThemePaletteId,
  type ThemeTokens,
  type UpdateCheck,
} from '@localbox/core/index'
import {
  resolvedTheme,
  themePalette,
  themePreference,
  setThemePalette,
  setCustomTokens,
  resetCustomTheme,
} from '../composables/useTheme'
import { favorites, history, loadFavorites, loadHistory, clearHistory, clearFavorites } from '../composables/useFavorites'
import { nativeBridge, store } from '../store/bootstrap'
// 版本号唯一来源 = 仓库根 package.json（构建时内联为字符串，各端一致）
import rootPkg from '../../../package.json'

const appVersion: string = rootPkg.version
const isDesktop = !!nativeBridge
const storageLabel = computed(() => (isDesktop ? 'AppData JSON 文件' : 'IndexedDB + localStorage'))
const favCount = computed(() => favorites.value.size)
const histCount = computed(() => history.value.length)
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
const draft = reactive<Record<keyof ThemeTokens, string>>({ ...resolveAppearanceTokens(themePreference.value, editAppearance.value) })

const paletteLabel = computed(() =>
  themePalette.value === 'custom' ? '自定义' : (getPresetById(themePalette.value)?.name ?? '晴空蓝'),
)
const customPreview = computed(() => resolveAppearanceTokens(themePreference.value, resolvedTheme.value))

function tokenOf(id: Exclude<ThemePaletteId, 'custom'>, key: keyof ThemeTokens): string {
  return getPresetTokens(id, resolvedTheme.value)[key]
}

function syncDraft(): void {
  Object.assign(draft, resolveAppearanceTokens(themePreference.value, editAppearance.value))
}

watch(editAppearance, syncDraft)
watch(themePalette, syncDraft)

function onColorChange(): void {
  const patch: Partial<ThemeTokens> = {}
  colorFields.forEach((f) => {
    const value = draft[f.key]
    if (typeof value === 'string' && value.trim()) patch[f.key] = value.trim()
  })
  if (Object.keys(patch).length) void setCustomTokens(editAppearance.value, patch)
}

function useCurrentPresetAsCustom(): void {
  const source = themePalette.value === 'custom' ? 'azure' : themePalette.value
  const tokens = getPresetTokens(source, editAppearance.value)
  Object.assign(draft, tokens)
  void setCustomTokens(editAppearance.value, tokens)
}

async function exportBak(): Promise<void> {
  const bak = await store.exportBackup()
  const blob = new Blob([JSON.stringify(bak, null, 2)], { type: 'application/json;charset=utf-8' })
  await saveBlob(`localbox-backup-${Date.now()}.json`, blob)
  ElMessage.success('已导出本地备份')
}

async function importBak(): Promise<void> {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'application/json,.json'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      const data = JSON.parse(await file.text()) as LocalBackup
      await ElMessageBox.confirm('导入后与现有数据合并。主题、收藏、历史、参数、便签会写入本机。', '导入备份', { type: 'warning' })
      await store.importBackup(data, 'merge')
      await loadFavorites()
      await loadHistory()
      ElMessage.success('已导入备份')
    } catch (e) {
      ElMessage.error(e instanceof Error ? e.message : '导入失败')
    }
  }
  input.click()
}

async function clearAll(): Promise<void> {
  await ElMessageBox.confirm('将清空收藏、历史记录，是否继续？', '确认', { type: 'warning' })
  await clearHistory()
  await clearFavorites()
  ElMessage.success('已清空本地数据')
}

/* ---------- 版本检查（core/update，与移动端同源） ---------- */
const checking = ref(false)
const updateResult = ref<UpdateCheck | null>(null)
const updateError = ref('')

const lastCheckedLabel = computed(() =>
  updateResult.value ? updateTools.formatReleaseTime(new Date(updateResult.value.checkedAt).toISOString()) : ''
)
const upToDateTitle = computed(() => {
  const r = updateResult.value
  if (!r) return ''
  // tag 与包内版本号可能不同号：装完这一版（alreadyInstalled）要说清是「已安装」而非版本相等
  return r.alreadyInstalled
    ? `已安装最新发布 v${r.release.version}（当前包版本 v${r.current}）`
    : `已是最新版本（当前 v${r.current}，最新 v${r.release.version}）`
})
const updateReleaseMeta = computed(() => {
  const release = updateResult.value?.release
  if (!release) return ''
  const parts: string[] = []
  if (release.publishedAt) parts.push(`发布于 ${updateTools.formatReleaseTime(release.publishedAt)}`)
  if (release.prerelease) parts.push('预发布版本')
  if (lastCheckedLabel.value) parts.push(`检查于 ${lastCheckedLabel.value}`)
  return parts.join(' · ')
})
const updateNotes = computed(() =>
  updateResult.value ? updateTools.releaseNotesLines(updateResult.value.release.notes) : []
)
const updateAsset = computed(() =>
  updateResult.value ? updateTools.pickAsset(updateResult.value.release, isDesktop ? 'desktop' : 'apk') : null
)
const assetSizeLabel = computed(() =>
  updateAsset.value?.size ? `（${updateTools.formatSize(updateAsset.value.size)}）` : ''
)

async function checkUpdate(): Promise<void> {
  if (checking.value) return
  checking.value = true
  updateError.value = ''
  try {
    updateResult.value = await updateTools.checkUpdate(appVersion)
    if (!updateResult.value.hasUpdate) {
      ElMessage.success(
        updateResult.value.alreadyInstalled
          ? `已安装最新发布 v${updateResult.value.release.version}`
          : '已是最新版本'
      )
    }
  } catch (e) {
    updateResult.value = null
    updateError.value = `检查更新失败：${e instanceof Error ? e.message : String(e)}`
  } finally {
    checking.value = false
  }
}

/** 外链统一出口：Electron 走系统浏览器，Web 开新标签页 */
async function openUrl(url: string): Promise<void> {
  if (!/^https?:\/\//i.test(url)) return
  if (nativeBridge?.openExternal) {
    await nativeBridge.openExternal(url)
    return
  }
  window.open(url, '_blank', 'noopener')
}

function openReleasePage(): void {
  const url = updateResult.value?.release.htmlUrl
  if (url) void openUrl(url)
}

function downloadUpdateAsset(): void {
  const url = updateAsset.value?.url
  if (url) void openUrl(url)
}
</script>

<style scoped>
.lb-group {
  margin-bottom: 22px;
}
.lb-glabel {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}
.lb-hint {
  margin-left: 12px;
  font-size: 12px;
  color: var(--color-text-secondary);
}
.lb-hint-block {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--color-text-secondary);
}
.lb-palettes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}
.lb-palette-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg-page);
  color: var(--color-text-primary);
  cursor: pointer;
  text-align: left;
}
.lb-palette-card.active {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px var(--color-primary);
}
.lb-palette-card strong {
  font-size: 13px;
}
.lb-palette-card em {
  font-size: 12px;
  font-style: normal;
  color: var(--color-text-secondary);
}
.lb-swatches {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
}
.lb-swatches i {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1px solid var(--color-border);
}
.lb-edit-mode {
  margin-bottom: 12px;
}
.lb-custom-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}
.lb-color-field {
  display: grid;
  grid-template-columns: 72px auto 1fr;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  color: var(--color-text-secondary);
}
.lb-update-alert {
  margin-top: 10px;
}
.lb-update {
  margin-top: 2px;
}
.lb-notes {
  max-height: 220px;
  overflow: auto;
  margin-top: 10px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg-page);
}
.lb-note-line {
  font-size: 12px;
  line-height: 1.7;
  color: var(--color-text-secondary);
  word-break: break-all;
}
.lb-update .lb-row {
  margin-top: 10px;
}
</style>
