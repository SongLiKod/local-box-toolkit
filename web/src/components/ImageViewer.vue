<template>
  <ElImageViewer
    v-if="viewer.visible"
    :url-list="viewer.urls"
    :initial-index="viewer.index"
    :hide-on-click-modal="true"
    :teleported="true"
    :z-index="3000"
    @close="closeImageViewer"
  />
</template>

<script setup lang="ts">
import { ElImageViewer } from 'element-plus'
import { useImageViewer, closeImageViewer } from '../composables/useImageViewer'

const viewer = useImageViewer()
</script>
