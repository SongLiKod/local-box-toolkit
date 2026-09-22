<template>
  <div class="lb-tool-header">
    <div>
      <h2 class="lb-title">
        {{ meta.name }}
        <el-button
          class="lb-fav-btn"
          link
          :type="isFav ? 'warning' : 'default'"
          @click="onFav"
        >
          {{ isFav ? '★ 已收藏' : '☆ 收藏' }}
        </el-button>
      </h2>
      <p class="lb-desc">{{ meta.desc }}</p>
    </div>
  </div>
  <el-alert
    v-if="notice"
    class="lb-notice"
    type="warning"
    :closable="false"
    show-icon
    :title="notice"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { toolById } from '../registry'
import { favorites, toggleFavorite } from '../composables/useFavorites'

const props = defineProps<{ toolId: string; notice?: string }>()
const meta = computed(() => toolById(props.toolId)!)
const isFav = computed(() => favorites.value.has(props.toolId))

async function onFav(): Promise<void> {
  await toggleFavorite(props.toolId)
}
</script>

<style scoped>
.lb-tool-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.lb-fav-btn {
  margin-left: 10px;
  font-size: 13px;
}
.lb-notice {
  margin-bottom: 16px;
}
</style>
