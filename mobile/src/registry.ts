export interface ToolMeta {
  id: string
  name: string
  desc: string
  icon: string
  category: string
  route: string
}

export const CATEGORIES = [
  { id: 'convert', name: '格式转换', icon: '🔄' },
  { id: 'dev', name: '开发工具', icon: '🛠️' },
  { id: 'photo', name: '证件照与图片', icon: '📷' },
  { id: 'life', name: '便民工具', icon: '🧰' },
]

export const TOOLS: ToolMeta[] = [
  { id: 'office-convert', name: 'Office文档互转', desc: 'Word/Excel/PPT/TXT/PDF 互转', icon: '📄', category: 'convert', route: '/pages/convert/office' },
  { id: 'pdf-tools', name: 'PDF工具集', desc: '合并/拆分/压缩/去水印', icon: '📕', category: 'convert', route: '/pages/convert/pdf' },
  { id: 'doc2image', name: 'Office/PDF转图片', desc: 'DPI/分页/长图/批量', icon: '📑', category: 'convert', route: '/pages/convert/doc2image' },
  { id: 'image-convert', name: '图片格式转换', desc: '互转/压缩/改分辨率/清EXIF', icon: '🖼️', category: 'convert', route: '/pages/convert/image' },
  { id: 'media-convert', name: '音视频格式转换', desc: 'FFmpeg WASM 本地转换', icon: '🎬', category: 'convert', route: '/pages/convert/media' },
  { id: 'uuid', name: 'UUID生成器', desc: 'v1/v3/v4/v5 批量', icon: '🎲', category: 'dev', route: '/pages/dev/uuid' },
  { id: 'base64', name: 'Base64编解码', desc: 'UTF-8 安全', icon: '🔐', category: 'dev', route: '/pages/dev/base64' },
  { id: 'urlcode', name: 'URL编解码', desc: 'encode/decode', icon: '🔗', category: 'dev', route: '/pages/dev/url' },
  { id: 'hash', name: '哈希计算', desc: 'MD5/SHA1/SHA256', icon: '🧮', category: 'dev', route: '/pages/dev/hash' },
  { id: 'timestamp', name: '时间戳转换', desc: '时间戳与日期互转', icon: '⏱️', category: 'dev', route: '/pages/dev/timestamp' },
  { id: 'password', name: '随机密码', desc: 'Web Crypto 本地随机', icon: '🔑', category: 'dev', route: '/pages/dev/password' },
  { id: 'barcode', name: '二维码/条形码', desc: '本地生成', icon: '📲', category: 'dev', route: '/pages/dev/barcode' },
  { id: 'jsonfmt', name: 'JSON格式化', desc: '格式化/压缩/校验', icon: '🧩', category: 'dev', route: '/pages/dev/json' },
  { id: 'regex', name: '正则测试', desc: '本地正则匹配', icon: '🧪', category: 'dev', route: '/pages/dev/regex' },
  { id: 'jwt', name: 'JWT解析', desc: '本地解码 Token', icon: '🎟️', category: 'dev', route: '/pages/dev/jwt' },
  { id: 'radix', name: '进制转换', desc: '2~36 进制互转', icon: '🔢', category: 'dev', route: '/pages/dev/radix' },
  { id: 'ip', name: 'IP地址工具', desc: 'IPv4/IPv6 互转/子网计算', icon: '🌐', category: 'dev', route: '/pages/dev/ip' },
  { id: 'cron', name: 'Cron表达式', desc: '生成/解析与下次执行时间', icon: '🗓️', category: 'dev', route: '/pages/dev/cron' },
  { id: 'idphoto', name: '证件照制作', desc: '人脸/抠图/换底/300DPI', icon: '🪪', category: 'photo', route: '/pages/photo/id' },
  { id: 'image-edit', name: '图片编辑', desc: '裁剪/缩放/旋转/水印/去底色', icon: '✏️', category: 'photo', route: '/pages/photo/edit' },
  { id: 'units', name: '单位换算', desc: '长度/面积/重量/温度互转', icon: '📏', category: 'life', route: '/pages/life/units' },
  { id: 'time-convert', name: '时间换算', desc: '时区换算/日期差/加减天数', icon: '📆', category: 'life', route: '/pages/life/time' },
  { id: 'color', name: '颜色取色器', desc: 'HEX/RGB/HSL与图片取色', icon: '🎨', category: 'life', route: '/pages/life/color' },
  { id: 'rename', name: '批量文件重命名', desc: '规则批量改名与脚本导出', icon: '🏷️', category: 'life', route: '/pages/life/rename' },
  { id: 'text-tool', name: '文本处理', desc: '去空格/去空行/字数统计', icon: '🔤', category: 'life', route: '/pages/life/text' },
  { id: 'exif', name: '图片EXIF清除', desc: '剥离照片元数据保护隐私', icon: '🧹', category: 'life', route: '/pages/life/exif' },
  { id: 'diff', name: '文本对比', desc: '逐行对比增删', icon: '🆚', category: 'life', route: '/pages/life/diff' },
  { id: 'notes', name: '本地便签', desc: '本机保存备忘', icon: '📝', category: 'life', route: '/pages/life/notes' },
]

export function toolById(id: string): ToolMeta | undefined {
  return TOOLS.find((t) => t.id === id)
}
