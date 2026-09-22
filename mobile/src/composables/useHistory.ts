import { store } from '../store'
import { toolById } from '../registry'

export function useToolHistory(toolId: string) {
  return (action: string, detail: string): void => {
    const meta = toolById(toolId)
    void store.addHistory({
      toolId,
      toolName: meta?.name ?? toolId,
      action,
      detail,
    })
  }
}
