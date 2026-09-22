<template>
  <div class="lb-card">
    <h2 class="lb-title">设置</h2>
    <p class="lb-desc">所有配置保存在当前设备本地，不上传服务器、不跨设备同步。Electron 端写入 AppData 目录 JSON 文件。</p>

    <div class="lb-group">
      <div class="lb-glabel">界面主题</div>
      <ThemeSwitch />
      <span class="lb-hint">当前生效：{{ resolvedTheme === 'dark' ? '深色' : '浅色' }}</span>
    </div>

    <div class="lb-group">
      <div class="lb-glabel">运行环境</div>
      <el-tag size="small" :type="isDesktop ? 'success' : 'info'">
        {{ isDesktop ? 'Electron 桌面客户端（完全离线可用）' : 'Web 浏览器（PWA 离线可用）' }}
      </el-tag>
      <el-tag size="small" type="info" style="margin-left: 8px">存储介质：{{ storageLabel }}</el-tag>
    </div>

    <div class="lb-group">
      <div class="lb-glabel">本地数据</div>
      <div class="lb-row">
        <el-button size="small" type="danger" @click="clearAll">清空收藏与历史记录</el-button>
      </div>
      <span class="lb-hint">收藏 {{ favCount }} 项 · 历史 {{ histCount }} 条</span>
    </div>

    <el-alert type="success" :closable="false" show-icon
      title="隐私声明：全部运算本地执行，无广告、无强制登录、基础功能无次数与文件大小限制，不收集任何个人信息。" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import ThemeSwitch from '../components/ThemeSwitch.vue'
import { resolvedTheme } from '../composables/useTheme'
import { favorites, history, loadFavorites, loadHistory, clearHistory, toggleFavorite } from '../composables/useFavorites'
import { nativeBridge } from '../store/bootstrap'

const isDesktop = !!nativeBridge
const storageLabel = computed(() => (isDesktop ? 'AppData JSON 文件' : 'IndexedDB + localStorage'))
const favCount = computed(() => favorites.value.size)
const histCount = computed(() => history.value.length)

async function clearAll(): Promise<void> {
  await ElMessageBox.confirm('将清空收藏、历史记录，是否继续？', '确认', { type: 'warning' })
  await clearHistory()
  for (const id of [...favorites.value]) await toggleFavorite(id)
  await loadFavorites()
  ElMessage.success('已清空本地数据')
}
</script>

<style scoped>
.lb-group {
  margin-bottom: 18px;
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
</style>
