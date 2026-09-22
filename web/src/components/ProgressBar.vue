<template>
  <div v-if="visible" class="lb-progress">
    <el-progress
      :percentage="percent"
      :status="status"
      :stroke-width="10"
      striped
      :striped-flow="running"
    />
    <div class="lb-progress-label">{{ label }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  visible: boolean
  done: number
  total: number
  label: string
  running?: boolean
  status?: '' | 'success' | 'exception' | 'warning'
}>()

const percent = computed(() =>
  props.total > 0 ? Math.min(100, Math.round((props.done / props.total) * 100)) : 0
)
</script>

<style scoped>
.lb-progress {
  margin: 14px 0;
}
.lb-progress-label {
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
