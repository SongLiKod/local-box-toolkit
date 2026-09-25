<template>
  <ToolPage tool-id="vault">
    <view class="lb-card">
      <!-- 首次创建 -->
      <block v-if="mode === 'create'">
        <text class="lb-title">创建保险箱</text>
        <text class="vault-sub">用主口令在本机加密，口令不保存、无法找回</text>
        <input v-model="newPass" class="lb-input" password placeholder="主口令（至少 8 位）" />
        <input
          v-model="newPass2"
          class="lb-input vault-gap"
          password
          placeholder="再输一次确认"
          @confirm="create"
        />
        <view class="vault-strength">
          <view
            v-for="i in 4"
            :key="i"
            class="vault-bar"
            :class="{ on: strength.score >= i, s1: strength.score === 1, s2: strength.score === 2, s3: strength.score === 3, s4: strength.score === 4 }"
          ></view>
          <text class="vault-strength-label">{{ strength.label }}</text>
        </view>
        <button class="lb-btn lb-btn-primary vault-btn" :disabled="!canCreate" @click="create">
          创建并进入
        </button>
      </block>

      <!-- 已锁定 -->
      <block v-else-if="mode === 'locked'">
        <text class="lb-title">🔒 保险箱已锁定</text>
        <text class="vault-sub">输入主口令解锁 {{ blobCount }} 条记录</text>
        <input
          v-model="unlockPass"
          class="lb-input"
          password
          placeholder="主口令"
          @confirm="unlock"
        />
        <button
          class="lb-btn lb-btn-primary vault-btn"
          :disabled="!unlockPass"
          :loading="busy"
          @click="unlock"
        >
          解锁
        </button>
      </block>

      <!-- 已解锁 -->
      <block v-else>
        <view class="vault-head">
          <view>
            <text class="lb-title">保险箱</text>
            <text class="vault-sub">已解锁 · {{ entries.length }} 条 · AES-256</text>
          </view>
          <button class="lb-btn vault-lock" @click="lock">锁定</button>
        </view>

        <view class="vault-form">
          <input v-model="draft.label" class="lb-input" placeholder="名称，如：GitHub Token" />
          <view class="vault-chips">
            <text
              v-for="k in KINDS"
              :key="k.value"
              class="vault-chip"
              :class="{ on: draft.kind === k.value }"
              @click="draft.kind = k.value"
              >{{ k.label }}</text
            >
          </view>
          <view class="vault-value-row">
            <input
              v-model="draft.value"
              class="lb-input"
              :password="!draftReveal"
              placeholder="内容"
              @confirm="add"
            />
            <text class="vault-toggle" @click="draftReveal = !draftReveal">{{
              draftReveal ? '隐藏' : '显示'
            }}</text>
          </view>
          <input v-model="draft.memo" class="lb-input" placeholder="备注（可选）" />
          <button
            class="lb-btn lb-btn-primary vault-btn"
            :disabled="!draft.label.trim() || !draft.value"
            @click="add"
          >
            添加
          </button>
        </view>

        <view v-if="!entries.length" class="lb-empty">
          <text>还没有记录，添加第一条吧</text>
        </view>

        <view v-for="e in entries" :key="e.id" class="vault-item">
          <view class="vault-item-head">
            <text class="vault-kind">{{ kindLabel(e.kind) }}</text>
            <text class="vault-label">{{ e.label }}</text>
          </view>
          <view class="vault-item-body">
            <text class="vault-value">{{ isRevealed(e.id) ? e.value : mask(e.value) }}</text>
          </view>
          <view v-if="e.memo" class="vault-memo">{{ e.memo }}</view>
          <view class="vault-acts">
            <text class="vault-act" @click="toggleReveal(e.id)">{{
              isRevealed(e.id) ? '隐藏' : '显示'
            }}</text>
            <text class="vault-act" @click="copy(e.value)">复制</text>
            <text class="vault-act danger" @click="askDelete(e)">删除</text>
          </view>
        </view>
      </block>
    </view>
  </ToolPage>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import { store } from '../../store'
import { vaultTools, type SealedVault, type VaultEntry } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useHistory'

type Mode = 'create' | 'locked' | 'open'
type EntryKind = VaultEntry['kind']

const KINDS: { value: EntryKind; label: string }[] = [
  { value: 'password', label: '密码' },
  { value: 'key', label: '密钥' },
  { value: 'card', label: '银行卡' },
  { value: 'note', label: '备注' },
]
const KIND_LABELS: Record<EntryKind, string> = {
  password: '密码',
  key: '密钥',
  card: '银行卡',
  note: '备注',
}

const mode = ref<Mode>('create')
const blob = ref<SealedVault | null>(null)
const blobCount = ref(0)
const newPass = ref('')
const newPass2 = ref('')
const unlockPass = ref('')
const busy = ref(false)
const entries = ref<VaultEntry[]>([])
const revealed = ref<string[]>([])
const draftReveal = ref(false)
const draft = ref({ label: '', kind: 'password' as EntryKind, value: '', memo: '' })
const record = useToolHistory('vault')

/** 解锁后驻留内存的口令，仅用于重新封装；锁定即清空 */
let keyPass = ''

const strength = computed(() => vaultTools.passwordStrength(newPass.value))
const canCreate = computed(() => newPass.value.length >= 8 && newPass.value === newPass2.value)
const kindLabel = (k: EntryKind): string => KIND_LABELS[k]
const mask = (v: string): string => '•'.repeat(Math.min(16, Math.max(6, v.length)))
const isRevealed = (id: string): boolean => revealed.value.includes(id)

async function init(): Promise<void> {
  try {
    blob.value = await store.getVaultBlob()
  } catch {
    blob.value = null
  }
  mode.value = blob.value ? 'locked' : 'create'
}

async function create(): Promise<void> {
  if (!canCreate.value) {
    uni.showToast({ title: newPass.value.length < 8 ? '口令至少 8 位' : '两次口令不一致', icon: 'none' })
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
    uni.showToast({ title: err instanceof Error ? err.message : '创建失败', icon: 'none' })
  }
}

async function unlock(): Promise<void> {
  if (!blob.value || !unlockPass.value) return
  busy.value = true
  try {
    const list = await vaultTools.openVault(unlockPass.value, blob.value)
    keyPass = unlockPass.value
    entries.value = list
    revealed.value = []
    unlockPass.value = ''
    mode.value = 'open'
    record('解锁保险箱', `${list.length} 条`)
  } catch (err) {
    uni.showToast({ title: err instanceof Error ? err.message : '解锁失败', icon: 'none' })
  } finally {
    busy.value = false
  }
}

async function persist(): Promise<void> {
  if (!keyPass) return
  try {
    const sealed = await vaultTools.sealVault(keyPass, entries.value)
    await store.setVaultBlob(sealed)
    blob.value = sealed
    blobCount.value = entries.value.length
  } catch (err) {
    uni.showToast({ title: err instanceof Error ? err.message : '保存失败', icon: 'none' })
    lock()
  }
}

function lock(): void {
  keyPass = ''
  entries.value = []
  revealed.value = []
  mode.value = blob.value ? 'locked' : 'create'
}

async function add(): Promise<void> {
  const d = draft.value
  if (!d.label.trim() || !d.value) return
  entries.value = [
    ...entries.value,
    {
      id: vaultTools.newEntryId(),
      label: d.label.trim(),
      kind: d.kind,
      value: d.value,
      memo: d.memo.trim() || undefined,
      updatedAt: Date.now(),
    },
  ]
  draft.value = { label: '', kind: 'password', value: '', memo: '' }
  draftReveal.value = false
  await persist()
  record('新增记录', d.label.trim())
}

function askDelete(e: VaultEntry): void {
  uni.showModal({
    title: '删除记录',
    content: `删除「${e.label}」？`,
    confirmText: '删除',
    confirmColor: '#F53F3F',
    success: (res) => {
      if (!res.confirm) return
      entries.value = entries.value.filter((x) => x.id !== e.id)
      revealed.value = revealed.value.filter((id) => id !== e.id)
      void persist()
      record('删除记录', e.label)
    },
  })
}

function toggleReveal(id: string): void {
  revealed.value = isRevealed(id) ? revealed.value.filter((x) => x !== id) : [...revealed.value, id]
}

function copy(v: string): void {
  uni.setClipboardData({
    data: v,
    success: () => uni.showToast({ title: '已复制', icon: 'success' }),
  })
}

init()
</script>

<style scoped>
.vault-sub {
  display: block;
  font-size: 24rpx;
  color: var(--color-text-secondary);
  margin: 8rpx 0 20rpx;
}
.vault-gap {
  margin-top: 16rpx;
}
.vault-strength {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-top: 14rpx;
}
.vault-bar {
  width: 56rpx;
  height: 8rpx;
  border-radius: 6rpx;
  background: var(--color-border);
}
.vault-bar.on.s1 {
  background: var(--color-error);
}
.vault-bar.on.s2 {
  background: var(--color-warning);
}
.vault-bar.on.s3,
.vault-bar.on.s4 {
  background: var(--color-primary);
}
.vault-bar.on.s4 {
  background: #00b42a;
}
.vault-strength-label {
  font-size: 22rpx;
  color: var(--color-text-secondary);
}
.vault-btn {
  margin-top: 24rpx;
}
.vault-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}
.vault-lock {
  padding: 6rpx 24rpx;
  font-size: 24rpx;
}
.vault-form {
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 24rpx;
  margin-bottom: 8rpx;
}
.vault-chips {
  display: flex;
  gap: 12rpx;
  margin: 14rpx 0;
}
.vault-chip {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  border-radius: 999rpx;
  padding: 6rpx 20rpx;
  background: var(--color-bg-page);
}
.vault-chip.on {
  color: var(--color-primary);
  border-color: var(--color-primary);
  background: var(--color-primary-light);
  font-weight: 600;
}
.vault-value-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-bottom: 14rpx;
}
.vault-value-row .lb-input {
  flex: 1;
  min-width: 0;
  margin-top: 0;
}
.vault-toggle {
  font-size: 24rpx;
  color: var(--color-primary);
  flex-shrink: 0;
}
.vault-item {
  border: 1px solid var(--color-border);
  border-radius: 14rpx;
  padding: 18rpx 20rpx;
  margin-top: 16rpx;
}
.vault-item-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.vault-kind {
  font-size: 20rpx;
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
  border-radius: 6rpx;
  padding: 2rpx 10rpx;
}
.vault-label {
  font-size: 28rpx;
  font-weight: 600;
  flex: 1;
  min-width: 0;
}
.vault-item-body {
  margin-top: 10rpx;
}
.vault-value {
  font-size: 26rpx;
  font-family: ui-monospace, Menlo, Consolas, monospace;
  word-break: break-all;
}
.vault-memo {
  font-size: 22rpx;
  color: var(--color-text-secondary);
  margin-top: 8rpx;
}
.vault-acts {
  display: flex;
  gap: 28rpx;
  margin-top: 12rpx;
}
.vault-act {
  font-size: 24rpx;
  color: var(--color-primary);
}
.vault-act.danger {
  color: var(--color-error);
}
</style>
