import { onMounted, ref, watch, type Ref } from 'vue'
import { store } from '../store/bootstrap'
import { toolById } from '../registry'
import { recordHistory } from './useFavorites'

/**
 * 工具页通用逻辑：
 * - 常用参数配置持久化（PRD 3.5.4）
 * - 操作历史记录（PRD 3.5.3）
 */
export function useToolParams<T extends object>(toolId: string, defaults: T): { params: Ref<T>; ready: Ref<boolean> } {
  const params = ref({ ...defaults }) as Ref<T>
  const ready = ref(false)
  onMounted(async () => {
    try {
      const saved = await store.getToolParams<T>(toolId)
      if (saved) params.value = { ...defaults, ...saved }
    } catch {
      /* 使用默认参数 */
    }
    ready.value = true
    watch(
      params,
      (v) => {
        if (ready.value) void store.setToolParams(toolId, JSON.parse(JSON.stringify(v)))
      },
      { deep: true }
    )
  })
  return { params, ready }
}

export function useToolHistory(toolId: string) {
  return (action: string, detail: string, payload?: unknown): Promise<void> => {
    const meta = toolById(toolId)
    return recordHistory(toolId, meta?.name ?? toolId, action, detail, payload)
  }
}
