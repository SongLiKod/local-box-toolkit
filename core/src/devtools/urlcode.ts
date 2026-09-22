/** URL 编码/解码：原生 API */
export function urlEncodeComponent(text: string): string {
  return encodeURIComponent(text)
}

export function urlDecodeComponent(text: string): string {
  return decodeURIComponent(text)
}

export function urlEncode(text: string): string {
  return encodeURI(text)
}

export function urlDecode(text: string): string {
  return decodeURI(text)
}
