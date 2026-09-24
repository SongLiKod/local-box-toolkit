<template>
  <div class="lb-theme-switch">
    <el-radio-group v-model="themeMode" size="small">
      <el-radio-button value="light">浅色</el-radio-button>
      <el-radio-button value="dark">深色</el-radio-button>
      <el-radio-button value="system">跟随系统</el-radio-button>
    </el-radio-group>
    <el-dropdown v-if="showPalette" trigger="click" @command="onPickPalette">
      <button class="lb-palette-btn" type="button">
        <span class="lb-dots">
          <i :style="{ background: preview.primary }"></i>
          <i :style="{ background: preview.bgCard }"></i>
          <i :style="{ background: preview.bgPage }"></i>
        </span>
        <span>{{ paletteName }}</span>
      </button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item
            v-for="p in THEME_PRESETS"
            :key="p.id"
            :command="p.id"
            :class="{ 'is-active': themePalette === p.id }"
          >
            <span class="lb-opt">
              <span class="lb-dot" :style="{ background: swatch(p.id) }"></span>
              {{ p.name }}
            </span>
          </el-dropdown-item>
          <el-dropdown-item command="custom" divided :class="{ 'is-active': themePalette === 'custom' }">
            自定义
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  THEME_PRESETS,
  getPresetById,
  resolveAppearanceTokens,
  type ThemePaletteId,
} from '@localbox/core/index'
import { themeMode, themePalette, themePreference, resolvedTheme, setThemePalette } from '../composables/useTheme'

withDefaults(defineProps<{ showPalette?: boolean }>(), { showPalette: true })
const router = useRouter()

const preview = computed(() => resolveAppearanceTokens(themePreference.value, resolvedTheme.value))
const paletteName = computed(() =>
  themePalette.value === 'custom' ? '自定义' : (getPresetById(themePalette.value)?.name ?? '晴空蓝'),
)

function swatch(id: Exclude<ThemePaletteId, 'custom'>): string {
  return resolveAppearanceTokens({ mode: resolvedTheme.value, palette: id }, resolvedTheme.value).primary
}

function onPickPalette(id: ThemePaletteId): void {
  if (id === 'custom') {
    void setThemePalette('custom')
    void router.push('/settings')
    return
  }
  void setThemePalette(id)
}
</script>

<style scoped>
.lb-theme-switch {
  display: flex;
  align-items: center;
  gap: 10px;
}
.lb-palette-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 24px;
  padding: 0 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  font-size: 12px;
  cursor: pointer;
}
.lb-dots {
  display: inline-flex;
  gap: 3px;
}
.lb-dots i,
.lb-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  display: inline-block;
}
.lb-opt {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
</style>
