<template>
  <div class="lb-card">
    <ToolHeader
      tool-id="rename"
      notice="浏览器无法直接改写本机文件名：可下载重命名脚本，Electron 客户端支持一键落盘重命名。"
    />
    <FileDrop v-model="files" hint="选择一批文件（或任意文件用于演示规则）" />

    <div class="lb-row lb-section" style="margin-top: 16px">
      <el-input v-model="rule.prefix" placeholder="前缀" style="width: 140px" />
      <el-input v-model="rule.suffix" placeholder="后缀" style="width: 140px" />
      <el-input v-model="rule.find" placeholder="查找" style="width: 130px" />
      <el-input v-model="rule.replace" placeholder="替换为" style="width: 130px" />
      <el-checkbox v-model="rule.useRegex">正则</el-checkbox>
    </div>
    <div class="lb-row lb-section">
      <el-checkbox v-model="numberOn">添加序号</el-checkbox>
      <template v-if="numberOn">
        <el-input-number v-model="rule.numbering.start" :min="0" size="small" controls-position="right" style="width: 100px" />
        步长
        <el-input-number v-model="rule.numbering.step" :min="1" size="small" controls-position="right" style="width: 90px" />
        位数
        <el-input-number v-model="rule.numbering.digits" :min="1" :max="8" size="small" controls-position="right" style="width: 90px" />
        <el-select v-model="rule.numbering.position" size="small" style="width: 100px">
          <el-option label="前" value="prefix" />
          <el-option label="后" value="suffix" />
        </el-select>
      </template>
      <el-select v-model="rule.casing" size="small" style="width: 110px">
        <el-option label="不改大小写" value="none" />
        <el-option label="转大写" value="upper" />
        <el-option label="转小写" value="lower" />
      </el-select>
      <el-select v-model="rule.extTo" size="small" clearable placeholder="扩展名" style="width: 120px">
        <el-option label="不改" :value="null" />
        <el-option label="jpg" value="jpg" />
        <el-option label="png" value="png" />
        <el-option label="pdf" value="pdf" />
        <el-option label="txt" value="txt" />
      </el-select>
    </div>

    <div class="lb-row lb-section">
      <el-button type="primary" :disabled="!files.length" @click="preview">预览重命名</el-button>
      <el-button :disabled="!items.length" @click="downloadScript('win')">导出 .bat</el-button>
      <el-button :disabled="!items.length" @click="downloadScript('nix')">导出 .sh</el-button>
      <el-button v-if="isDesktop" type="success" :disabled="!items.length" @click="applyReal">本机执行重命名</el-button>
    </div>

    <el-table v-if="items.length" :data="items" size="small" max-height="360">
      <el-table-column prop="from" label="原文件名" show-overflow-tooltip />
      <el-table-column label="新文件名" show-overflow-tooltip>
        <template #default="{ row }">
          <span :class="{ changed: row.from !== row.to }">{{ row.to }}</span>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import ToolHeader from '../../components/ToolHeader.vue'
import FileDrop from '../../components/FileDrop.vue'
import { renameTools, saveBlob, getNative } from '@localbox/core/index'
import { useToolHistory } from '../../composables/useTool'
import type { RenameItem } from '@localbox/core/tools/rename'

const files = ref<File[]>([])
const items = ref<RenameItem[]>([])
const numberOn = ref(false)
const isDesktop = !!getNative()
const record = useToolHistory('rename')

const rule = reactive({
  prefix: '',
  suffix: '',
  find: '',
  replace: '',
  useRegex: false,
  casing: 'none' as 'none' | 'upper' | 'lower',
  extTo: null as string | null,
  numbering: { start: 1, step: 1, digits: 2, position: 'suffix' as 'prefix' | 'suffix' },
})

function preview(): void {
  const opts = {
    prefix: rule.prefix || undefined,
    suffix: rule.suffix || undefined,
    find: rule.find || undefined,
    replace: rule.replace,
    useRegex: rule.useRegex,
    casing: rule.casing,
    extTo: rule.extTo,
    numbering: numberOn.value ? rule.numbering : undefined,
  }
  items.value = renameTools.applyRename(files.value.map((f) => f.name), opts)
  record('预览重命名', `${items.value.length} 个文件`)
}

async function downloadScript(os: 'win' | 'nix'): Promise<void> {
  const text = renameTools.buildRenameScript(items.value, os)
  await saveBlob(os === 'win' ? 'rename.bat' : 'rename.sh', new Blob([text], { type: 'text/plain;charset=utf-8' }))
  record('导出脚本', os)
}

async function applyReal(): Promise<void> {
  const native = getNative()
  if (!native) {
    ElMessage.error('仅 Electron 客户端支持本机执行')
    return
  }
  const map: Record<string, string> = {}
  files.value.forEach((f, i) => {
    const p = (f as unknown as { path?: string }).path
    if (p && items.value[i]) map[p] = items.value[i].to
  })
  if (Object.keys(map).length === 0) {
    ElMessage.error('未获取到本机文件路径，请使用导出脚本方式')
    return
  }
  const done = await native.renameFiles(map)
  ElMessage.success(`已重命名 ${done.length} 个文件`)
  record('本机重命名', `${done.length} 个文件`)
}
</script>

<style scoped>
.changed {
  color: var(--color-primary);
  font-weight: 600;
}
</style>
