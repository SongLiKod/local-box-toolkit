export interface ToolMeta {
  id: string
  name: string
  desc: string
  category: string
  route: string
  keywords: string[]
}

export const CATEGORIES = [
  { id: 'convert', name: '格式转换' },
  { id: 'dev', name: '开发工具' },
  { id: 'photo', name: '证件照与图片' },
  { id: 'life', name: '便民工具' },
] as const

export const TOOLS: ToolMeta[] = [
  {
    id: 'office-convert',
    name: 'Office文档互转',
    desc: 'Word/Excel/PPT/TXT 与 PDF、TXT 互转，支持批量打包',
    category: 'convert',
    route: '/convert/office',
    keywords: ['word', 'excel', 'ppt', 'pdf', 'txt', '转换'],
  },
  {
    id: 'pdf-tools',
    name: 'PDF工具集',
    desc: 'PDF合并、拆分、压缩、去水印，全部本地处理',
    category: 'convert',
    route: '/convert/pdf',
    keywords: ['pdf', '合并', '拆分', '压缩', '水印'],
  },
  {
    id: 'doc2image',
    name: 'Office/PDF转图片',
    desc: 'docx/xlsx/pptx/pdf 转 JPG/PNG/WEBP/TIFF，DPI、分页、长图',
    category: 'convert',
    route: '/convert/image',
    keywords: ['转图片', 'dpi', '长图', '300'],
  },
  {
    id: 'image-convert',
    name: '图片格式转换',
    desc: 'JPG/PNG/WEBP/GIF/BMP/SVG 互转、压缩、改分辨率、清EXIF',
    category: 'convert',
    route: '/convert/pic',
    keywords: ['图片', '格式', '压缩', '分辨率', 'exif'],
  },
  {
    id: 'media-convert',
    name: '音视频格式转换',
    desc: 'FFmpeg WASM 本地转换 MP4/AVI/MOV/FLV/MKV、MP3/WAV/FLAC',
    category: 'convert',
    route: '/convert/media',
    keywords: ['视频', '音频', 'mp4', 'mp3', 'ffmpeg'],
  },
  {
    id: 'uuid',
    name: 'UUID生成器',
    desc: 'v1/v3/v4/v5，批量1~10000条，自定义命名空间，历史记录',
    category: 'dev',
    route: '/dev/uuid',
    keywords: ['uuid', 'guid', '唯一标识'],
  },
  {
    id: 'base64',
    name: 'Base64编解码',
    desc: '文本 Base64 编码与解码，UTF-8 安全',
    category: 'dev',
    route: '/dev/base64',
    keywords: ['base64', '编码', '解码'],
  },
  {
    id: 'urlcode',
    name: 'URL编解码',
    desc: 'encodeURIComponent / decodeURIComponent',
    category: 'dev',
    route: '/dev/url',
    keywords: ['url', '编码', '解码', '转义'],
  },
  {
    id: 'hash',
    name: '哈希计算',
    desc: 'MD5/SHA1/SHA256，文本与文件本地哈希',
    category: 'dev',
    route: '/dev/hash',
    keywords: ['md5', 'sha', '哈希', '摘要'],
  },
  {
    id: 'timestamp',
    name: '时间戳转换',
    desc: 'Unix 时间戳与日期时间互转',
    category: 'dev',
    route: '/dev/timestamp',
    keywords: ['时间戳', 'unix', 'date'],
  },
  {
    id: 'password',
    name: '随机密码生成',
    desc: 'Web Crypto 随机源，自定义字符集与强度',
    category: 'dev',
    route: '/dev/password',
    keywords: ['密码', '随机', 'password'],
  },
  {
    id: 'barcode',
    name: '二维码/条形码',
    desc: '本地生成二维码与条形码，无网络请求',
    category: 'dev',
    route: '/dev/barcode',
    keywords: ['二维码', 'barcode', 'qr', '条码'],
  },
  {
    id: 'jsonfmt',
    name: 'JSON格式化',
    desc: '本地格式化、压缩、校验 JSON',
    category: 'dev',
    route: '/dev/json',
    keywords: ['json', '格式化', '压缩', '校验'],
  },
  {
    id: 'regex',
    name: '正则测试',
    desc: '本地正则匹配，查看位置与分组',
    category: 'dev',
    route: '/dev/regex',
    keywords: ['正则', 'regex', '匹配'],
  },
  {
    id: 'jwt',
    name: 'JWT解析',
    desc: '本地解码 JWT Header/Payload，不校验签名',
    category: 'dev',
    route: '/dev/jwt',
    keywords: ['jwt', 'token', '解析'],
  },
  {
    id: 'radix',
    name: '进制转换',
    desc: '2~36 进制互转，输出二/八/十/十六进制',
    category: 'dev',
    route: '/dev/radix',
    keywords: ['进制', '二进制', '十六进制', 'hex'],
  },
  {
    id: 'idphoto',
    name: '证件照制作',
    desc: '人脸检测、智能抠图、白蓝红背景替换、300DPI高清导出',
    category: 'photo',
    route: '/photo/id',
    keywords: ['证件照', '一寸', '二寸', '签证', '换底色'],
  },
  {
    id: 'image-edit',
    name: '图片编辑',
    desc: '裁剪、缩放、旋转、模糊、文字、水印、去底色',
    category: 'photo',
    route: '/photo/edit',
    keywords: ['裁剪', '旋转', '水印', '模糊'],
  },
  {
    id: 'units',
    name: '单位换算',
    desc: '长度/面积/体积/重量/速度/时间/存储/压强/功率/温度',
    category: 'life',
    route: '/life/units',
    keywords: ['单位', '换算', '长度', '重量'],
  },
  {
    id: 'time-convert',
    name: '时间换算',
    desc: '时区换算、日期差值、日期加减天数',
    category: 'life',
    route: '/life/time',
    keywords: ['时区', '日期', '倒计时'],
  },
  {
    id: 'color',
    name: '颜色取色器',
    desc: 'HEX/RGB/HSL 互转、图片取色、色阶生成',
    category: 'life',
    route: '/life/color',
    keywords: ['颜色', '取色', 'hex', 'rgb'],
  },
  {
    id: 'rename',
    name: '批量文件重命名',
    desc: '前缀/后缀/替换/序号规则，本地预览与脚本导出',
    category: 'life',
    route: '/life/rename',
    keywords: ['重命名', '批量', '文件名'],
  },
  {
    id: 'text-tool',
    name: '文本处理',
    desc: '去空格、去换行、去空行、字数统计',
    category: 'life',
    route: '/life/text',
    keywords: ['文本', '空格', '换行', '字数'],
  },
  {
    id: 'exif',
    name: '图片EXIF清除',
    desc: '本地剥离照片元数据，保护隐私',
    category: 'life',
    route: '/life/exif',
    keywords: ['exif', '元数据', '隐私'],
  },
  {
    id: 'diff',
    name: '文本对比',
    desc: '逐行对比两段文本，标出增删',
    category: 'life',
    route: '/life/diff',
    keywords: ['对比', 'diff', '文本'],
  },
  {
    id: 'notes',
    name: '本地便签',
    desc: '便签保存在本机，可随备份导出',
    category: 'life',
    route: '/life/notes',
    keywords: ['便签', '笔记', '备忘'],
  },
]

export function toolById(id: string): ToolMeta | undefined {
  return TOOLS.find((t) => t.id === id)
}

export function searchTools(kw: string): ToolMeta[] {
  const q = kw.trim().toLowerCase()
  if (!q) return TOOLS
  return TOOLS.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.desc.toLowerCase().includes(q) ||
      t.keywords.some((k) => k.toLowerCase().includes(q))
  )
}
