export interface ToolMeta {
  id: string
  name: string
  desc: string
  category: string
  route: string
}

export const CATEGORIES = [
  { id: 'convert', name: '格式转换' },
  { id: 'dev', name: '开发工具' },
  { id: 'photo', name: '证件照与图片' },
  { id: 'life', name: '便民工具' },
]

export const TOOLS: ToolMeta[] = [
  { id: 'office-convert', name: 'Office文档互转', desc: 'Word/Excel/PPT/TXT/PDF 互转', category: 'convert', route: '/pages/convert/office' },
  { id: 'pdf-tools', name: 'PDF工具集', desc: '合并/拆分/压缩/去水印', category: 'convert', route: '/pages/convert/pdf' },
  { id: 'doc2image', name: 'Office/PDF转图片', desc: 'DPI/分页/长图/批量', category: 'convert', route: '/pages/convert/doc2image' },
  { id: 'image-convert', name: '图片格式转换', desc: '互转/压缩/改分辨率/清EXIF', category: 'convert', route: '/pages/convert/image' },
  { id: 'media-convert', name: '音视频格式转换', desc: 'FFmpeg WASM 本地转换', category: 'convert', route: '/pages/convert/media' },
  { id: 'uuid', name: 'UUID生成器', desc: 'v1/v3/v4/v5 批量', category: 'dev', route: '/pages/dev/uuid' },
  { id: 'base64', name: 'Base64编解码', desc: 'UTF-8 安全', category: 'dev', route: '/pages/dev/base64' },
  { id: 'urlcode', name: 'URL编解码', desc: 'encode/decode', category: 'dev', route: '/pages/dev/url' },
  { id: 'hash', name: '哈希计算', desc: 'MD5/SHA1/SHA256', category: 'dev', route: '/pages/dev/hash' },
  { id: 'timestamp', name: '时间戳转换', desc: '时间戳与日期互转', category: 'dev', route: '/pages/dev/timestamp' },
  { id: 'password', name: '随机密码', desc: 'Web Crypto 本地随机', category: 'dev', route: '/pages/dev/password' },
  { id: 'barcode', name: '二维码/条形码', desc: '本地生成', category: 'dev', route: '/pages/dev/barcode' },
  { id: 'jsonfmt', name: 'JSON格式化', desc: '格式化/压缩/校验', category: 'dev', route: '/pages/dev/json' },
  { id: 'regex', name: '正则测试', desc: '本地正则匹配', category: 'dev', route: '/pages/dev/regex' },
  { id: 'jwt', name: 'JWT解析', desc: '本地解码 Token', category: 'dev', route: '/pages/dev/jwt' },
  { id: 'radix', name: '进制转换', desc: '2~36 进制互转', category: 'dev', route: '/pages/dev/radix' },
  { id: 'ip', name: 'IP地址工具', desc: 'IPv4/IPv6 互转/子网计算', category: 'dev', route: '/pages/dev/ip' },
  { id: 'idphoto', name: '证件照制作', desc: '人脸/抠图/换底/300DPI', category: 'photo', route: '/pages/photo/id' },
  { id: 'diff', name: '文本对比', desc: '逐行对比增删', category: 'life', route: '/pages/life/diff' },
  { id: 'notes', name: '本地便签', desc: '本机保存备忘', category: 'life', route: '/pages/life/notes' },
]

export function toolById(id: string): ToolMeta | undefined {
  return TOOLS.find((t) => t.id === id)
}
