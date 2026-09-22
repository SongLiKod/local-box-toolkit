import CryptoJS from 'crypto-js'

export type HashAlgo = 'md5' | 'sha1' | 'sha256'

function bufferToWordArray(buf: ArrayBuffer): CryptoJS.lib.WordArray {
  const bytes = new Uint8Array(buf)
  const words: number[] = []
  for (let i = 0; i < bytes.length; i++) {
    words[i >>> 2] |= bytes[i] << (24 - (i % 4) * 8)
  }
  return CryptoJS.lib.WordArray.create(words, bytes.length)
}

/** 字符串哈希：MD5 / SHA1 / SHA256（crypto-js，纯本地计算） */
export function hashText(algo: HashAlgo, text: string): string {
  const src = CryptoJS.enc.Utf8.parse(text)
  switch (algo) {
    case 'md5':
      return CryptoJS.MD5(src).toString(CryptoJS.enc.Hex)
    case 'sha1':
      return CryptoJS.SHA1(src).toString(CryptoJS.enc.Hex)
    case 'sha256':
      return CryptoJS.SHA256(src).toString(CryptoJS.enc.Hex)
  }
}

/** 文件哈希：本地读取 ArrayBuffer 计算，不上传 */
export async function hashFile(algo: HashAlgo, file: File | Blob): Promise<string> {
  const buf = await file.arrayBuffer()
  switch (algo) {
    case 'md5':
      return CryptoJS.MD5(bufferToWordArray(buf)).toString(CryptoJS.enc.Hex)
    case 'sha1':
    case 'sha256': {
      const subtle = globalThis.crypto?.subtle
      if (subtle) {
        const digest = await subtle.digest(
          algo === 'sha1' ? 'SHA-1' : 'SHA-256',
          buf.slice(0)
        )
        return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
      }
      const wa = bufferToWordArray(buf)
      return (algo === 'sha1' ? CryptoJS.SHA1(wa) : CryptoJS.SHA256(wa)).toString(CryptoJS.enc.Hex)
    }
  }
}
