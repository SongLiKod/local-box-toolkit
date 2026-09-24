<template>
  <ToolPage
    tool-id="rename"
    notice="手机端无法直接改写系统文件名：可预览规则并导出重命名脚本，到电脑一键执行。"
  >
    <view class="lb-card">
      <button class="lb-btn lb-btn-plain" @click="pick">选择文件（可多选）</button>
      <view v-for="(f, i) in files" :key="i" class="lb-file">{{ f.name }}</view>

      <view class="lb-label">重命名规则</view>
      <view class="lb-grid2">
        <input v-model="rule.prefix" class="lb-input" placeholder="前缀" />
        <input v-model="rule.suffix" class="lb-input" placeholder="后缀" />
        <input v-model="rule.find" class="lb-input" placeholder="查找" />
        <input v-model="rule.replace" class="lb-input" placeholder="替换为" />
      </view>
      <view class="lb-chip-row">
        <view class="lb-chip" :class="{ active: rule.useRegex }" @click="rule.useRegex = !rule.useRegex">
          正则
        </view>
        <view class="lb-chip" :class="{ active: numberOn }" @click="numberOn = !numberOn">
          添加序号
        </view>
      </view>

      <template v-if="numberOn">
        <view class="lb-label">序号：起始 / 步长 / 位数</view>
        <view class="lb-grid3">
          <input v-model="rule.numbering.start" type="number" class="lb-input" placeholder="起始" />
          <input v-model="rule.numbering.step" type="number" class="lb-input" placeholder="步长" />
          <input v-model="rule.numbering.digits" type="number" class="lb-input" placeholder="位数" />
        </view>
        <picker :range="posNames" :value="posIdx" @change="posIdx = Number($event.detail.value)">
          <view class="lb-input">序号位置：{{ posNames[posIdx] }}</view>
        </picker>
      </template>

      <view class="lb-label">大小写</view>
      <picker :range="casingNames" :value="casingIdx" @change="casingIdx = Number($event.detail.value)">
        <view class="lb-input">{{ casingNames[casingIdx] }}</view>
      </picker>
      <view class="lb-label">扩展名改为</view>
      <picker :range="extNames" :value="extIdx" @change="extIdx = Number($event.detail.value)">
        <view class="lb-input">{{ extNames[extIdx] }}</view>
      </picker>

      <button class="lb-btn" :disabled="!files.length" @click="preview">预览重命名</button>
      <view class="lb-row">
        <button class="lb-btn lb-btn-plain" :disabled="!items.length" @click="exportScript('win')">
          导出 .bat
        </button>
        <button class="lb-btn lb-btn-plain" :disabled="!items.length" @click="exportScript('nix')">
          导出 .sh
        </button>
      </view>

      <view v-for="(r, i) in items" :key="i" class="lb-file lb-rn-row">
        <view class="lb-rn-from">{{ r.from }}</view>
        <view class="lb-rn-to" :class="{ changed: r.from !== r.to }">{{ r.to }}</view>
      </view>
    </view>
  </ToolPage>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import { renameTools, type RenameItem, type RenameOptions } from '@localbox/core/index'
import { chooseFiles, saveTextAs } from '../../utils/files'
import { useToolHistory } from '../../composables/useHistory'

const files = ref<File[]>([])
const items = ref<RenameItem[]>([])
const numberOn = ref(false)
const record = useToolHistory('rename')

const rule = reactive({
  prefix: '',
  suffix: '',
  find: '',
  replace: '',
  useRegex: false,
  numbering: { start: '1', step: '1', digits: '2' },
})

const posNames = ['前', '后'] as const
const posIdx = ref(1)
const casingNames = ['不改大小写', '转大写', '转小写'] as const
const casingIdx = ref(0)
const casings = ['none', 'upper', 'lower'] as const
const positions = ['prefix', 'suffix'] as const
const extNames = ['不改', 'jpg', 'png', 'pdf', 'txt'] as const
const extIdx = ref(0)

async function pick(): Promise<void> {
  try {
    files.value = await chooseFiles('')
    items.value = []
  } catch {
    /* 取消选择 */
  }
}

function toast(msg: string): void {
  uni.showToast({ title: msg, icon: 'none' })
}

function preview(): void {
  if (!files.value.length) {
    toast('请先选择文件')
    return
  }
  const opts: RenameOptions = {
    prefix: rule.prefix || undefined,
    suffix: rule.suffix || undefined,
    find: rule.find || undefined,
    replace: rule.replace,
    useRegex: rule.useRegex,
    casing: casings[casingIdx.value],
    extTo: extIdx.value === 0 ? null : extNames[extIdx.value],
    numbering: numberOn.value
      ? {
          start: Number(rule.numbering.start) || 0,
          step: Number(rule.numbering.step) || 1,
          digits: Number(rule.numbering.digits) || 2,
          position: positions[posIdx.value],
        }
      : undefined,
  }
  try {
    items.value = renameTools.applyRename(
      files.value.map((f) => f.name),
      opts
    )
    void record('预览重命名', `${items.value.length} 个文件`)
  } catch (e) {
    toast(e instanceof Error ? e.message : String(e))
  }
}

function exportScript(os: 'win' | 'nix'): void {
  if (!items.value.length) {
    toast('请先预览重命名')
    return
  }
  try {
    const script = renameTools.buildRenameScript(items.value, os)
    saveTextAs(os === 'win' ? 'rename.bat' : 'rename.sh', script)
    void record('导出脚本', os)
  } catch (e) {
    toast(e instanceof Error ? e.message : String(e))
  }
}
</script>

<style scoped>
.lb-grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12rpx;
  margin-bottom: 16rpx;
}
.lb-grid3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12rpx;
  margin-bottom: 16rpx;
}
.lb-rn-row {
  display: block;
}
.lb-rn-from {
  color: var(--color-text-secondary);
  font-size: 24rpx;
  word-break: break-all;
}
.lb-rn-to {
  margin-top: 4rpx;
  word-break: break-all;
}
.lb-rn-to.changed {
  color: var(--color-primary);
  font-weight: 600;
}
</style>
