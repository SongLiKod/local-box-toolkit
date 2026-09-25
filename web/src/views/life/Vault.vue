<template>
  <div class="lb-card">
    <ToolHeader tool-id="vault" />

    <div class="vault-layout">
      <!-- 左：口令区 -->
      <aside class="vault-side">
        <template v-if="mode === 'create'">
          <div class="lb-label">首次使用 · 创建保险箱</div>
          <el-input
            v-model="newPass"
            type="password"
            show-password
            placeholder="设置一个主口令"
            @keyup.enter="create"
          />
          <el-input
            v-model="newPass2"
            type="password"
            show-password
            placeholder="再输一次确认"
            style="margin-top: 10px"
            @keyup.enter="create"
          />
          <div class="vault-strength">
            <div class="bars">
              <i
                v-for="i in 4"
                :key="i"
                :class="{ on: strength.score >= i }"
                :data-level="strength.score"
              ></i>
            </div>
            <span>{{ strength.label }} · 至少 8 位</span>
          </div>
          <el-button
            type="primary"
            style="width: 100%; margin-top: 12px"
            :disabled="!canCreate"
            @click="create"
          >
            创建并进入
          </el-button>
        </template>

        <template v-else-if="mode === 'locked'">
          <div class="lb-label">保险箱已锁定</div>
          <el-input
            ref="unlockRef"
            v-model="unlockPass"
            type="password"
            show-password
            placeholder="输入主口令"
            @keyup.enter="unlock"
          />
          <el-button
            type="primary"
            style="width: 100%; margin-top: 12px"
            :disabled="!unlockPass"
            :loading="busy"
            @click="unlock"
          >
            解锁
          </el-button>
        </template>

        <template v-else>
          <div class="vault-open-head">
            <div class="lb-label">已解锁</div>
            <el-button size="small" @click="lock">锁定</el-button>
          </div>
          <div class="vault-meta">
            <div>
              <span class="n">{{ entries.length }}</span>
              <span class="t">条记录</span>
            </div>
            <div>
              <span class="n">AES-256</span>
              <span class="t">加密</span>
            </div>
            <div>
              <span class="n">{{ idleSeconds }}s</span>
              <span class="t">无操作自动锁定</span>
            </div>
          </div>
          <div class="vault-hint">
            密文只存在这台设备的本地存储里，页面不联网、不上传；忘记口令无法找回。
          </div>
        </template>
      </aside>

      <!-- 右：内容区 -->
      <section class="vault-main">
        <div v-if="mode !== 'open'" class="vault-locked">
          <div class="lock-icon">🔒</div>
          <div class="lock-title">{{ mode === 'create' ? '先创建主口令' : '输入口令解锁' }}</div>
          <div class="lock-desc">
            保险箱用你的口令在本机派生密钥（PBKDF2 31 万次）加密内容，口令不保存、密文不可逆推。
          </div>
        </div>

        <template v-else>
          <div class="vault-form">
            <el-input v-model="draft.label" placeholder="名称，如：GitHub Token" style="flex: 1" />
            <el-select v-model="draft.kind" style="width: 110px">
              <el-option label="密码" value="password" />
              <el-option label="密钥" value="key" />
              <el-option label="银行卡" value="card" />
              <el-option label="备注" value="note" />
            </el-select>
            <el-input
              v-model="draft.value"
              :type="draftReveal ? 'text' : 'password'"
              placeholder="内容"
              style="flex: 1.4"
              @keyup.enter="add"
            />
            <el-button link @click="draftReveal = !draftReveal">
              {{ draftReveal ? '隐藏' : '显示' }}
            </el-button>
            <el-button type="primary" :disabled="!draft.label.trim() || !draft.value" @click="add">
              添加
            </el-button>
          </div>
          <el-input
            v-model="draft.memo"
            placeholder="备注（可选）"
            style="margin: 10px 0 4px"
          />

          <div v-if="entries.length" class="vault-list">
            <div v-for="e in entries" :key="e.id" class="vault-item">
              <div class="vault-item-head">
                <span class="vault-kind" :data-kind="e.kind">{{ kindLabel(e.kind) }}</span>
                <span class="vault-label">{{ e.label }}</span>
                <span class="vault-time">{{ fmtTime(e.updatedAt) }}</span>
              </div>
              <div class="vault-item-body">
                <code class="vault-value">{{
                  revealed.has(e.id) ? e.value : mask(e.value)
                }}</code>
                <div class="vault-acts">
                  <el-button link size="small" @click="toggleReveal(e.id)">
                    {{ revealed.has(e.id) ? '隐藏' : '显示' }}
                  </el-button>
                  <el-button link size="small" @click="copy(e.value)">复制</el-button>
                  <el-button link size="small" type="danger" @click="askDelete(e)">删除</el-button>
                </div>
              </div>
              <div v-if="e.memo" class="vault-memo">{{ e.memo }}</div>
            </div>
          </div>
          <div v-else class="vault-empty">还没有记录，在上方添加第一条。</div>
        </template>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import ToolHeader from '../../components/ToolHeader.vue'
import { store } from '../../store/bootstrap'
import { vaultTools, type SealedVault, type VaultEntry } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useTool'

type Mode = 'create' | 'locked' | 'open'
type EntryKind = VaultEntry['kind']

const KIND_LABELS: Record<EntryKind, string> = {
  password: '密码',
  key: '密钥',
  card: '银行卡',
  note: '备注',
}
const IDLE_MS = 60_000

const mode = ref<Mode>('create')
const blob = ref<SealedVault | null>(null)
const newPass = ref('')
const newPass2 = ref('')
const unlockPass = ref('')
const unlockRef = ref()
const busy = ref(false)
const entries = ref<VaultEntry[]>([])
const revealed = reactive(new Set<string>())
const draftReveal = ref(false)
const draft = reactive({ label: '', kind: 'password' as EntryKind, value: '', memo: '' })
const idleSeconds = ref(IDLE_MS / 1000)
const record = useToolHistory('vault')

/** 解锁后驻留内存的口令，仅用于自动重封；锁定即清空 */
let keyPass = ''
let debounce: number | null = null
let idleTimer: number | null = null
let countdown: number | null = null

const strength = computed(() => vaultTools.passwordStrength(newPass.value))
const canCreate = computed(
  () => newPass.value.length >= 8 && newPass.value === newPass2.value,
)

const kindLabel = (k: EntryKind): string => KIND_LABELS[k]
const mask = (v: string): string => '•'.repeat(Math.min(16, Math.max(6, v.length)))
const fmtTime = (t: number): string => {
  const d = new Date(t)
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

async function create(): Promise<void> {
  if (!canCreate.value) {
    ElMessage.warning(newPass.value.length < 8 ? '口令至少 8 位' : '两次口令不一致')
    return
  }
  try {
    const sealed = await vaultTools.sealVault(newPass.value, [])
    await store.setVaultBlob(sealed)
    blob.value = sealed
    keyPass = newPass.value
    newPass.value = ''
    newPass2.value = ''
    entries.value = []
    mode.value = 'open'
    record('创建保险箱', '空保险箱')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '创建失败')
  }
}

async function unlock(): Promise<void> {
  if (!blob.value || !unlockPass.value) return
  busy.value = true
  try {
    const list = await vaultTools.openVault(unlockPass.value, blob.value)
    keyPass = unlockPass.value
    entries.value = list
    revealed.clear()
    unlockPass.value = ''
    mode.value = 'open'
    record('解锁保险箱', `${list.length} 条`)
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '解锁失败')
  } finally {
    busy.value = false
  }
}

function lock(): void {
  keyPass = ''
  entries.value = []
  revealed.clear()
  mode.value = blob.value ? 'locked' : 'create'
  if (debounce !== null) window.clearTimeout(debounce)
}

async function persist(): Promise<void> {
  if (mode.value !== 'open' || !keyPass) return
  try {
    const sealed = await vaultTools.sealVault(keyPass, entries.value)
    await store.setVaultBlob(sealed)
    blob.value = sealed
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '保存失败')
    lock()
  }
}

/** 任何变更都重新加密落库（防抖 700ms），避免口令或明文留在存储里 */
watch(entries, () => {
  if (mode.value !== 'open' || !keyPass) return
  if (debounce !== null) window.clearTimeout(debounce)
  debounce = window.setTimeout(() => void persist(), 700)
})

// 创建/解锁进入"已解锁"态时立即启动无操作倒计时
watch(mode, () => resetIdle())

function add(): void {
  const label = draft.label.trim()
  if (!label || !draft.value) return
  entries.value = [
    ...entries.value,
    {
      id: vaultTools.newEntryId(),
      label,
      kind: draft.kind,
      value: draft.value,
      memo: draft.memo.trim() || undefined,
      updatedAt: Date.now(),
    },
  ]
  draft.label = ''
  draft.value = ''
  draft.memo = ''
  draftReveal.value = false
  record('新增记录', label)
}

async function askDelete(e: VaultEntry): Promise<void> {
  try {
    await ElMessageBox.confirm(`删除记录「${e.label}」？`, '删除', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  entries.value = entries.value.filter((x) => x.id !== e.id)
  revealed.delete(e.id)
  record('删除记录', e.label)
}

function toggleReveal(id: string): void {
  if (revealed.has(id)) revealed.delete(id)
  else revealed.add(id)
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

function resetIdle(): void {
  if (idleTimer !== null) window.clearTimeout(idleTimer)
  if (countdown !== null) window.clearInterval(countdown)
  if (mode.value !== 'open') return
  idleSeconds.value = IDLE_MS / 1000
  countdown = window.setInterval(() => {
    idleSeconds.value = Math.max(0, idleSeconds.value - 1)
  }, 1000)
  idleTimer = window.setTimeout(() => {
    lock()
    ElMessage.info('保险箱已自动锁定')
  }, IDLE_MS)
}

onMounted(async () => {
  try {
    blob.value = await store.getVaultBlob()
  } catch {
    blob.value = null
  }
  mode.value = blob.value ? 'locked' : 'create'
  window.addEventListener('keydown', resetIdle)
  window.addEventListener('pointerdown', resetIdle)
  resetIdle()
})

onBeforeUnmount(() => {
  // 离开页面前把内存里的明文封存落库
  if (mode.value === 'open') void persist()
  window.removeEventListener('keydown', resetIdle)
  window.removeEventListener('pointerdown', resetIdle)
  if (idleTimer !== null) window.clearTimeout(idleTimer)
  if (countdown !== null) window.clearInterval(countdown)
  if (debounce !== null) window.clearTimeout(debounce)
})
</script>

<style scoped>
.vault-layout {
  display: grid;
  grid-template-columns: minmax(240px, 300px) minmax(420px, 1fr);
  gap: 20px;
  align-items: start;
}
.vault-side {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  background: var(--color-bg-page);
}
.vault-strength {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  font-size: 12px;
  color: var(--color-text-secondary);
}
.bars {
  display: flex;
  gap: 4px;
}
.bars i {
  width: 26px;
  height: 5px;
  border-radius: 3px;
  background: var(--color-border);
}
.bars i.on[data-level='1'] {
  background: var(--color-error);
}
.bars i.on[data-level='2'] {
  background: var(--color-warning);
}
.bars i.on[data-level='3'] {
  background: var(--color-primary);
}
.bars i.on[data-level='4'] {
  background: #00b42a;
}
.vault-open-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.vault-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}
.vault-meta > div {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.vault-meta .n {
  font-size: 17px;
  font-weight: 700;
  color: var(--color-primary);
}
.vault-meta .t {
  font-size: 12px;
  color: var(--color-text-secondary);
}
.vault-hint {
  margin-top: 14px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--color-text-secondary);
  border-top: 1px dashed var(--color-border);
  padding-top: 12px;
}
.vault-main {
  min-width: 0;
}
.vault-locked {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 340px;
  gap: 6px;
  padding: 24px;
  border: 1px dashed var(--color-border);
  border-radius: 8px;
}
.lock-icon {
  font-size: 40px;
}
.lock-title {
  font-size: 17px;
  font-weight: 600;
}
.lock-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  max-width: 420px;
  line-height: 1.7;
}
.vault-form {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.vault-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.vault-item {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 10px 14px;
}
.vault-item-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.vault-kind {
  font-size: 11px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 1px 6px;
  color: var(--color-text-secondary);
}
.vault-kind[data-kind='password'] {
  color: var(--color-primary);
  border-color: var(--color-primary);
}
.vault-kind[data-kind='key'] {
  color: var(--color-warning);
  border-color: var(--color-warning);
}
.vault-label {
  font-size: 14px;
  font-weight: 600;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.vault-time {
  font-size: 11px;
  color: var(--color-text-secondary);
}
.vault-item-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 6px;
}
.vault-value {
  font-size: 13px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  word-break: break-all;
  user-select: none;
}
.vault-acts {
  display: flex;
  flex-shrink: 0;
}
.vault-memo {
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-secondary);
}
.vault-empty {
  margin-top: 16px;
  padding: 26px;
  text-align: center;
  font-size: 13px;
  color: var(--color-text-secondary);
  border: 1px dashed var(--color-border);
  border-radius: 8px;
}
</style>
