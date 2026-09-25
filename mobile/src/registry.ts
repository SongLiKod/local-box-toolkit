export interface ToolMeta {
  id: string
  name: string
  desc: string
  icon: string
  category: string
  route: string
  /** 搜索关键词（英文别名/拼音场景），与 Web 端 registry 保持一致 */
  keywords: string[]
}

export const CATEGORIES = [
  { id: 'convert', name: '格式转换', icon: '🔄' },
  { id: 'dev', name: '开发工具', icon: '🛠️' },
  { id: 'photo', name: '证件照与图片', icon: '📷' },
  { id: 'life', name: '便民工具', icon: '🧰' },
]

export const TOOLS: ToolMeta[] = [
  { id: 'office-convert', name: 'Office文档互转', desc: 'Word/Excel/PPT/TXT/PDF 互转', icon: '📄', category: 'convert', route: '/pages/convert/office', keywords: ['word', 'excel', 'ppt', 'pdf', 'txt', '转换'] },
  { id: 'pdf-tools', name: 'PDF工具集', desc: '合并/拆分/压缩/去水印', icon: '📕', category: 'convert', route: '/pages/convert/pdf', keywords: ['pdf', '合并', '拆分', '压缩', '水印'] },
  { id: 'doc2image', name: 'Office/PDF转图片', desc: 'DPI/分页/长图/批量', icon: '📑', category: 'convert', route: '/pages/convert/doc2image', keywords: ['转图片', 'dpi', '长图', '300'] },
  { id: 'image-convert', name: '图片格式转换', desc: '互转/压缩/改分辨率/清EXIF', icon: '🖼️', category: 'convert', route: '/pages/convert/image', keywords: ['图片', '格式', '压缩', '分辨率', 'exif'] },
  { id: 'media-convert', name: '音视频格式转换', desc: 'FFmpeg WASM 本地转换', icon: '🎬', category: 'convert', route: '/pages/convert/media', keywords: ['视频', '音频', 'mp4', 'mp3', 'ffmpeg'] },
  { id: 'uuid', name: 'UUID生成器', desc: 'v1/v3/v4/v5 批量', icon: '🎲', category: 'dev', route: '/pages/dev/uuid', keywords: ['uuid', 'guid', '唯一标识'] },
  { id: 'base64', name: 'Base64编解码', desc: 'UTF-8 安全', icon: '🔐', category: 'dev', route: '/pages/dev/base64', keywords: ['base64', '编码', '解码'] },
  { id: 'urlcode', name: 'URL编解码', desc: 'encode/decode', icon: '🔗', category: 'dev', route: '/pages/dev/url', keywords: ['url', '编码', '解码', '转义'] },
  { id: 'hash', name: '哈希计算', desc: 'MD5/SHA1/SHA256', icon: '🧮', category: 'dev', route: '/pages/dev/hash', keywords: ['md5', 'sha', '哈希', '摘要'] },
  { id: 'timestamp', name: '时间戳转换', desc: '时间戳互转、世界时钟、会议时间对比', icon: '⏱️', category: 'dev', route: '/pages/dev/timestamp', keywords: ['时间戳', 'unix', 'date', '世界时钟', '时区', '会议时间'] },
  { id: 'password', name: '随机密码', desc: 'Web Crypto 本地随机', icon: '🔑', category: 'dev', route: '/pages/dev/password', keywords: ['密码', '随机', 'password'] },
  { id: 'barcode', name: '二维码/条形码', desc: '本地生成', icon: '📲', category: 'dev', route: '/pages/dev/barcode', keywords: ['二维码', 'barcode', 'qr', '条码'] },
  { id: 'jsonfmt', name: 'JSON格式化', desc: '格式化/压缩/校验', icon: '🧩', category: 'dev', route: '/pages/dev/json', keywords: ['json', '格式化', '压缩', '校验'] },
  { id: 'regex', name: '正则测试', desc: '本地正则匹配', icon: '🧪', category: 'dev', route: '/pages/dev/regex', keywords: ['正则', 'regex', '匹配'] },
  { id: 'jwt', name: 'JWT解析', desc: '本地解码 Token', icon: '🎟️', category: 'dev', route: '/pages/dev/jwt', keywords: ['jwt', 'token', '解析'] },
  { id: 'radix', name: '进制转换', desc: '2~36 进制互转', icon: '🔢', category: 'dev', route: '/pages/dev/radix', keywords: ['进制', '二进制', '十六进制', 'hex'] },
  { id: 'ip', name: 'IP地址工具', desc: 'IPv4/IPv6 互转/子网计算', icon: '🌐', category: 'dev', route: '/pages/dev/ip', keywords: ['ip', 'ipv4', 'ipv6', '子网', 'cidr', '掩码'] },
  { id: 'cron', name: 'Cron表达式', desc: '生成/解析与下次执行时间', icon: '🗓️', category: 'dev', route: '/pages/dev/cron', keywords: ['cron', '表达式', '定时', '计划任务', 'quartz', 'crontab'] },
  { id: 'idphoto', name: '证件照制作', desc: '人脸/抠图/换底/300DPI', icon: '🪪', category: 'photo', route: '/pages/photo/id', keywords: ['证件照', '一寸', '二寸', '签证', '换底色'] },
  { id: 'image-edit', name: '图片编辑', desc: '裁剪/缩放/旋转/水印/去底色', icon: '✏️', category: 'photo', route: '/pages/photo/edit', keywords: ['裁剪', '旋转', '水印', '模糊'] },
  { id: 'calculator', name: '计算器', desc: '四则运算/函数常量/角度弧度', icon: '➗', category: 'life', route: '/pages/life/calc', keywords: ['计算器', 'calculator', '算术', '计算', 'math', '求值'] },
  { id: 'units', name: '单位换算', desc: '长度/面积/重量/温度互转', icon: '📏', category: 'life', route: '/pages/life/units', keywords: ['单位', '换算', '长度', '重量'] },
  { id: 'time-convert', name: '时间换算', desc: '时区换算/日期差/加减天数', icon: '📆', category: 'life', route: '/pages/life/time', keywords: ['时区', '日期', '倒计时'] },
  { id: 'color', name: '颜色取色器', desc: 'HEX/RGB/HSL与图片取色', icon: '🎨', category: 'life', route: '/pages/life/color', keywords: ['颜色', '取色', 'hex', 'rgb'] },
  { id: 'rename', name: '批量文件重命名', desc: '规则批量改名与脚本导出', icon: '🏷️', category: 'life', route: '/pages/life/rename', keywords: ['重命名', '批量', '文件名'] },
  { id: 'text-tool', name: '文本处理', desc: '去空格/去空行/字数统计', icon: '🔤', category: 'life', route: '/pages/life/text', keywords: ['文本', '空格', '换行', '字数'] },
  { id: 'exif', name: '图片EXIF清除', desc: '剥离照片元数据保护隐私', icon: '🧹', category: 'life', route: '/pages/life/exif', keywords: ['exif', '元数据', '隐私'] },
  { id: 'diff', name: '文本对比', desc: '逐行对比增删', icon: '🆚', category: 'life', route: '/pages/life/diff', keywords: ['对比', 'diff', '文本'] },
  { id: 'notes', name: '本地便签', desc: '本机保存备忘', icon: '📝', category: 'life', route: '/pages/life/notes', keywords: ['便签', '笔记', '备忘'] },

  { id: 'todo', name: '待办清单', desc: '截止日与每天/每周重复的任务', icon: '📌', category: 'life', route: '/pages/life/todo', keywords: ['待办', 'todo', '任务', '清单', '打卡'] },
  { id: 'vault', name: '本地保险箱', desc: '口令加密的私密存储', icon: '🔐', category: 'life', route: '/pages/life/vault', keywords: ['保险箱', '加密', '密码', '密钥', '私密'] },
  { id: 'qrscan', name: '二维码识别', desc: '图片识别网址与WIFI码', icon: '📷', category: 'dev', route: '/pages/dev/qrscan', keywords: ['二维码', '扫码', '识别', 'qr'] },
  { id: 'dupfinder', name: '重复文件查找', desc: '体积初筛 + 哈希精比', icon: '📂', category: 'life', route: '/pages/life/dup', keywords: ['重复', '查重', '相同文件', '清理'] },
]

export function toolById(id: string): ToolMeta | undefined {
  return TOOLS.find((t) => t.id === id)
}

/** 首页搜索：匹配名称、描述与关键词（离线本地，无网络请求） */
export function searchTools(kw: string): ToolMeta[] {
  const q = kw.trim().toLowerCase()
  if (!q) return TOOLS
  return TOOLS.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.desc.toLowerCase().includes(q) ||
      t.keywords.some((k) => k.toLowerCase().includes(q)),
  )
}
