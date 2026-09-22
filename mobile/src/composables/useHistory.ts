import { store } from '../store'
import { toolById } from '../registry'

export function useToolHistory(toolId: string) {
  return (action: string, detail: string, payload?: unknown): Promise<void> => {
    const meta = toolById(toolId)
    return store.addHistory({
      toolId,
      toolName: meta?.name ?? toolId,
      action,
      detail,
      payload,
    }).then(() => undefined)
  }
}
