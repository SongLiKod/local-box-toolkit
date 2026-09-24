export interface JsonFormatResult {
  ok: boolean
  text: string
  error?: string
}

export function formatJson(input: string, indent = 2): JsonFormatResult {
  const src = input.trim()
  if (!src) return { ok: false, text: '', error: '请输入 JSON' }
  try {
    const value = JSON.parse(src) as unknown
    return { ok: true, text: JSON.stringify(value, null, Math.max(0, Math.min(8, indent))) }
  } catch (e) {
    return { ok: false, text: input, error: e instanceof Error ? e.message : String(e) }
  }
}

export function minifyJson(input: string): JsonFormatResult {
  const src = input.trim()
  if (!src) return { ok: false, text: '', error: '请输入 JSON' }
  try {
    const value = JSON.parse(src) as unknown
    return { ok: true, text: JSON.stringify(value) }
  } catch (e) {
    return { ok: false, text: input, error: e instanceof Error ? e.message : String(e) }
  }
}

export function validateJson(input: string): JsonFormatResult {
  const src = input.trim()
  if (!src) return { ok: false, text: '', error: '请输入 JSON' }
  try {
    JSON.parse(src)
    return { ok: true, text: 'JSON 合法' }
  } catch (e) {
    return { ok: false, text: '', error: e instanceof Error ? e.message : String(e) }
  }
}
