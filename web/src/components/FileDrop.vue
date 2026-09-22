<template>
  <el-upload
    class="lb-drop"
    drag
    multiple
    :accept="accept"
    :auto-upload="false"
    :show-file-list="false"
    :on-change="onChange"
  >
    <div class="lb-drop-inner">
      <div class="lb-drop-icon">⬆</div>
      <div class="lb-drop-text">
        将文件拖到此处，或<em>点击选择</em>（本地处理，绝不上传）
      </div>
      <div v-if="hint" class="lb-drop-hint">{{ hint }}</div>
    </div>
  </el-upload>
  <div v-if="list.length" class="lb-file-list">
    <el-tag
      v-for="(f, i) in list"
      :key="f.name + i"
      closable
      class="lb-file-tag"
      @close="remove(i)"
    >
      {{ f.name }} ({{ formatBytes(f.size) }})
    </el-tag>
    <el-button link type="danger" size="small" @click="clear">清空</el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { formatBytes } from '@localbox/core/index'
import type { UploadFile } from 'element-plus'

const props = defineProps<{
  accept?: string
  hint?: string
  modelValue: File[]
}>()
const emit = defineEmits<{ 'update:modelValue': [File[]] }>()

const list = ref<File[]>([...props.modelValue])

watch(
  () => props.modelValue,
  (v) => {
    if (v.length !== list.value.length) list.value = [...v]
  }
)

function sync(): void {
  emit('update:modelValue', [...list.value])
}

function onChange(uploadFile: UploadFile): void {
  if (uploadFile.raw) list.value.push(uploadFile.raw)
  sync()
}

function remove(i: number): void {
  list.value.splice(i, 1)
  sync()
}

function clear(): void {
  list.value = []
  sync()
}
</script>

<style scoped>
.lb-drop :deep(.el-upload-dragger) {
  background: var(--color-bg-card);
  border: 1px dashed var(--color-border);
  border-radius: 8px;
}
.lb-drop-inner {
  padding: 8px 0;
  color: var(--color-text-secondary);
}
.lb-drop-icon {
  font-size: 22px;
  color: var(--color-primary);
}
.lb-drop-text em {
  color: var(--color-primary);
  font-style: normal;
}
.lb-drop-hint {
  font-size: 12px;
  margin-top: 4px;
}
.lb-file-list {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.lb-file-tag {
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
