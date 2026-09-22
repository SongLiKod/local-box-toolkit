import type { NativeBridge } from './types'

export function getNative(): NativeBridge | null {
  if (typeof window === 'undefined') return null
  return window.localboxNative ?? null
}

export function isElectron(): boolean {
  return getNative() !== null
}

export function assetBase(): string {
  if (typeof document === 'undefined') return '/'
  const b = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL
  return b && b.length > 0 ? b : '/'
}
