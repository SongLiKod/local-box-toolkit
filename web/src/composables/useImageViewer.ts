import { reactive } from 'vue'

export interface ImageViewerState {
  visible: boolean
  urls: string[]
  index: number
}

const state = reactive<ImageViewerState>({
  visible: false,
  urls: [],
  index: 0,
})

/** 打开全局图片放大器；urls 可为单张图片或图片组，index 为初始位置 */
export function openImageViewer(urls: string | string[], index = 0): void {
  const list = (Array.isArray(urls) ? urls : [urls]).filter((u): u is string => !!u)
  if (list.length === 0) return
  state.urls = list
  state.index = Math.min(Math.max(0, index), list.length - 1)
  state.visible = true
}

export function closeImageViewer(): void {
  state.visible = false
}

export function useImageViewer(): ImageViewerState {
  return state
}
