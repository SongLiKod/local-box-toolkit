export interface JwtPart {
  raw: string
  json?: string
  error?: string
}

export interface JwtDecodeResult {
  ok: boolean
  error?: string
  header: JwtPart
  payload: JwtPart
  signature: string
}

function padB64(s: string): string {
  const t = s.replace(/-/g, '+').replace(/_/g, '/')
  const pad = t.length % 4
  return pad ? t + '='.repeat(4 - pad) : t
}

function decodePart(raw: string): JwtPart {
  try {
    const bin = atob(padB64(raw))
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const text = new TextDecoder().decode(bytes)
    const pretty = JSON.stringify(JSON.parse(text) as unknown, null, 2)
    return { raw, json: pretty }
  } catch (e) {
    return { raw, error: e instanceof Error ? e.message : '无法解码' }
  }
}

export function decodeJwt(token: string): JwtDecodeResult {
  const src = token.trim()
  if (!src) {
    return {
      ok: false,
      error: '请输入 JWT',
      header: { raw: '' },
      payload: { raw: '' },
      signature: '',
    }
  }
  const parts = src.split('.')
  if (parts.length < 2) {
    return {
      ok: false,
      error: 'JWT 至少包含 header.payload',
      header: { raw: '' },
      payload: { raw: '' },
      signature: '',
    }
  }
  const header = decodePart(parts[0])
  const payload = decodePart(parts[1])
  const signature = parts.slice(2).join('.')
  const ok = !header.error && !payload.error
  return {
    ok,
    error: ok ? undefined : 'JWT 解码失败（仅解析，不校验签名）',
    header,
    payload,
    signature,
  }
}
