export function chooseFiles(accept: string, multiple = true): Promise<File[]> {
  return new Promise((resolve, reject) => {
    // #ifdef H5
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.multiple = multiple
    input.onchange = () => {
      const list = input.files ? Array.from(input.files) : []
      resolve(list)
    }
    input.onerror = () => reject(new Error('选择文件失败'))
    input.click()
    return
    // #endif
    // eslint-disable-next-line no-unreachable
    uni.chooseImage({
      count: multiple ? 20 : 1,
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const files: File[] = []
        for (const p of res.tempFilePaths) {
          try {
            const blob = await pathToFile(p, (res.tempFiles as Array<{ path: string; size: number }> | undefined)?.find((t) => t.path === p)?.size)
            if (blob) files.push(blob)
          } catch {
            /* 单个失败跳过 */
          }
        }
        resolve(files)
      },
      fail: () => reject(new Error('取消选择')),
    })
  })
}

async function pathToFile(p: string, size?: number): Promise<File | null> {
  // #ifdef APP-PLUS
  return new Promise((resolve) => {
    plus.io.resolveLocalFileSystemURL(
      p,
      (entry) => {
        ;(entry as PlusFileInfo).getFile(
          async (f: PlusFile) => {
            const reader = new plus.io.FileReader()
            reader.onloadend = () => {
              const dataUrl = String(reader.result ?? '')
              const comma = dataUrl.indexOf(',')
              const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
              const bin = atob(b64)
              const bytes = new Uint8Array(bin.length)
              for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
              resolve(new File([bytes], f.name || p.split('/').pop() || 'file', { type: f.type || 'application/octet-stream' }))
            }
            reader.readAsDataURL(f)
          },
          () => resolve(null)
        )
      },
      () => resolve(null)
    )
    void size
  })
  // #endif
  // #ifndef APP-PLUS
  void p
  void size
  return null
  // #endif
}

export function saveTextAs(name: string, content: string): void {
  // #ifdef H5
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
  return
  // #endif
  // eslint-disable-next-line no-unreachable
  uni.setClipboardData({ data: content, success: () => uni.showToast({ title: '已复制（APP端结果可复制）', icon: 'none' }) })
}

export function saveBlobAs(name: string, blob: Blob): void {
  // #ifdef H5
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
  return
  // #endif
  // eslint-disable-next-line no-unreachable
  void name
  void blob
  uni.showToast({ title: '请在导出菜单保存文件', icon: 'none' })
}

interface PlusFile {
  name: string
  type: string
  size: number
}
interface PlusFileInfo {
  getFile(success: (f: PlusFile) => void, fail: () => void): void
}

declare const plus: {
  io: {
    resolveLocalFileSystemURL(path: string, ok: (entry: PlusFileInfo) => void, err: () => void): void
    FileReader: new () => { onloadend: (() => void) | null; result: unknown; readAsDataURL(f: PlusFile): void }
  }
}
