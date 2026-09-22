<template>
  <el-radio-group v-model="themeMode" size="small" class="lb-theme-switch">
    <el-radio-button value="light">浅色</el-radio-button>
    <el-radio-button value="dark">深色</el-radio-button>
    <el-radio-button value="system">跟随系统</el-radio-button>
  </el-radio-group>
</template>

<script setup lang="ts">
import { themeMode } from '../composables/useTheme'
</script>

<style scoped>
.lb-theme-switch {
  transform: scale(0.92);
}
</style>
