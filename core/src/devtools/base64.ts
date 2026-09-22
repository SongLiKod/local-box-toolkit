/** Base64 编码/解码：原生 API，UTF-8 安全 */
export function base64Encode(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

export function base64Decode(b64: string): string {
  const clean = b64.replace(/\s+/g, '')
  const bin = atob(clean)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

export function base64EncodeUrlSafe(text: string): string {
  return base64Encode(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function base64DecodeUrlSafe(b64: string): string {
  let s = b64.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4 !== 0) s += '='
  return base64Decode(s)
}
