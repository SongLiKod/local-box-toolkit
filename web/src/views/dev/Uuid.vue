<template>
  <div class="lb-card">
    <ToolHeader tool-id="uuid" />
    <div class="lb-row lb-section">
      <span>版本</span>
      <el-radio-group v-model="params.version">
        <el-radio-button value="v1">v1</el-radio-button>
        <el-radio-button value="v3">v3</el-radio-button>
        <el-radio-button value="v4">v4</el-radio-button>
        <el-radio-button value="v5">v5</el-radio-button>
      </el-radio-group>
      <span>数量</span>
      <el-input-number v-model="params.count" :min="1" :max="10000" controls-position="right" style="width: 130px" />
      <template v-if="params.version === 'v3' || params.version === 'v5'">
        <el-input v-model="params.name" placeholder="命名名称" style="width: 160px" />
        <el-select v-model="params.namespace" style="width: 200px">
          <el-option label="URL 命名空间" value="6ba7b811-9dad-11d1-80b4-00c04fd430c8" />
          <el-option label="DNS 命名空间" value="6ba7b810-9dad-11d1-80b4-00c04fd430c8" />
        </el-select>
      </template>
      <el-button type="primary" @click="gen">生成</el-button>
      <el-button :disabled="!list.length" @click="copyAll">复制全部</el-button>
      <el-button :disabled="!list.length" @click="exportTxt">导出 TXT</el-button>
    </div>

    <div v-if="list.length" class="lb-uuid-list">
      <div v-for="(u, i) in list" :key="i" class="lb-uuid-row">
        <span class="lb-uuid-idx">{{ i + 1 }}</span>
        <code>{{ u }}</code>
        <el-button link type="primary" size="small" @click="copyOne(u)">复制</el-button>
      </div>
    </div>

    <template v-if="hist.length">
      <h4 class="lb-sub">本地历史记录</h4>
      <p class="lb-hist-hint">点击条目可查看当时生成的 UUID，不会重新生成。</p>
      <div class="lb-history-list">
        <div v-for="h in hist" :key="h.id" class="lb-hist-item">
          <div class="lb-hist-row" @click="toggle(h)">
            <span class="lb-hist-detail">{{ h.detail }}</span>
            <span class="lb-hist-time">{{ new Date(h.time).toLocaleString() }}</span>
          </div>
          <div v-if="openId === h.id" class="lb-hist-body">
            <template v-if="openedPayload(h)">
              <p v-if="openedPayload(h)?.truncated" class="lb-hist-note">数量较多，仅保存了前 {{ openedPayload(h)?.uuids.length }} 条。</p>
              <div class="lb-hist-uuids">
                <div v-for="(u, i) in openedPayload(h)?.uuids" :key="i" class="lb-uuid-row">
                  <span class="lb-uuid-idx">{{ i + 1 }}</span>
                  <code>{{ u }}</code>
                  <el-button link type="primary" size="small" @click.stop="copyOne(u)">复制</el-button>
                </div>
              </div>
              <div class="lb-hist-actions">
                <el-button size="small" @click.stop="restore(h)">恢复到结果区</el-button>
                <el-button size="small" @click.stop="copyHist(h)">复制全部</el-button>
              </div>
            </template>
            <p v-else class="lb-hist-note">该条旧记录未保存 UUID 内容，仅记录了生成参数。</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import ToolHeader from '../../components/ToolHeader.vue'
import { saveBlob, uuidTools, type UuidVersion, type HistoryItem, type UuidHistoryPayload } from '@localbox/core/index'
import { store } from '../../store/bootstrap'
import { useToolHistory, useToolParams } from '../../composables/useTool'

const list = ref<string[]>([])
const hist = ref<HistoryItem[]>([])
const openId = ref('')
const { params } = useToolParams('uuid', {
  version: 'v4' as UuidVersion,
  count: 10,
  name: '',
  namespace: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
})
const record = useToolHistory('uuid')

async function gen(): Promise<void> {
  try {
    list.value = uuidTools.generateUuids(params.value.version, params.value.count, {
      name: params.value.name,
      namespace: params.value.namespace,
    })
    const payload = uuidTools.buildUuidHistoryPayload(params.value.version, list.value, {
      name: params.value.name,
      namespace: params.value.namespace,
    })
    await record('生成UUID', uuidTools.summarizeUuidHistory(payload), payload)
    await reloadHist()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : String(e))
  }
}

async function copyOne(u: string): Promise<void> {
  await navigator.clipboard.writeText(u)
  ElMessage.success('已复制')
}

async function copyAll(): Promise<void> {
  await navigator.clipboard.writeText(list.value.join('\n'))
  ElMessage.success('已复制全部')
}

function exportTxt(): void {
  const blob = new Blob([uuidTools.uuidsToText(list.value)], { type: 'text/plain;charset=utf-8' })
  void saveBlob(`uuid-${Date.now()}.txt`, blob)
  record('导出UUID', `${list.value.length} 条TXT`)
}

async function reloadHist(): Promise<void> {
  const all = await store.getHistory()
  hist.value = all.filter((h) => h.toolId === 'uuid' && h.action === '生成UUID').slice(0, 10)
}

function openedPayload(h: HistoryItem): UuidHistoryPayload | null {
  return uuidTools.parseUuidHistory(h)
}

function toggle(h: HistoryItem): void {
  openId.value = openId.value === h.id ? '' : h.id
}

function restore(h: HistoryItem): void {
  const payload = uuidTools.parseUuidHistory(h)
  if (!payload) {
    ElMessage.warning('该条旧记录未保存 UUID 内容')
    return
  }
  params.value.version = payload.version
  params.value.count = payload.count
  if (payload.name) params.value.name = payload.name
  if (payload.namespace) params.value.namespace = payload.namespace
  list.value = payload.uuids.slice()
  ElMessage.success('已恢复历史 UUID')
}

async function copyHist(h: HistoryItem): Promise<void> {
  const payload = uuidTools.parseUuidHistory(h)
  if (!payload) return
  await navigator.clipboard.writeText(payload.uuids.join('\n'))
  ElMessage.success('已复制全部')
}

onMounted(() => {
  void reloadHist()
})
</script>

<style scoped>
.lb-uuid-list {
  max-height: 360px;
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px 12px;
}
.lb-uuid-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
  font-size: 13px;
}
.lb-uuid-idx {
  color: var(--color-text-secondary);
  width: 40px;
  text-align: right;
}
.lb-sub {
  margin: 18px 0 6px;
}
.lb-hist-hint {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin: 0 0 8px;
}
.lb-hist-item {
  border-bottom: 1px solid var(--color-border);
}
.lb-hist-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  padding: 8px 0;
  color: var(--color-text-secondary);
  cursor: pointer;
}
.lb-hist-detail {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lb-hist-time {
  flex-shrink: 0;
  color: var(--color-primary);
}
.lb-hist-body {
  padding: 0 0 10px;
}
.lb-hist-uuids {
  max-height: 220px;
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 6px 10px;
}
.lb-hist-note {
  font-size: 12px;
  color: var(--color-warning);
  margin: 0 0 8px;
}
.lb-hist-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
</style>
