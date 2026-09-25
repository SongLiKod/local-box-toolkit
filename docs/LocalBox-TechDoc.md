# LocalBox 本地工具箱 V1.0 技术开发文档
> 项目名称：LocalBox
> 仓库名称：local-box-toolkit
> 说明：本项目无后端服务，全部业务逻辑在前端本地运行，文件不上传服务器。Web/Electron/安卓三端共用同一套核心业务代码。

## 1. 文档概述
本文档为 LocalBox V1.0 技术开发文档，定义技术栈、依赖库、功能实现细节、存储方案，开发人员直接基于本文档开发。**无后端服务，纯前端本地运算**。

## 2. 整体技术栈选型
### 2.1 Web端
- 语言：TypeScript + JavaScript
- 框架：Vue3 + Vite
- UI组件库：Element Plus
- 样式方案：SCSS + CSS全局变量（主题切换）
- 核心依赖库：
  - `pdfjs-dist`：PDF解析、PDF渲染转图片
  - `mammoth`：docx纯文本/HTML抽取（Office互转、兜底渲染）
  - `docx-preview`：docx按原始页面版式渲染（转图片主渲染路径）
  - `xlsx`：Excel解析
  - `pptxgenjs`：PPT解析
  - `jszip`：批量文件打包ZIP
  - `uuid`：UUID本地生成
  - `jpeg-js / pngjs / sharp-wasm`：图片编解码、压缩
  - `ffmpeg.wasm`：音视频本地格式转换
- 构建工具：Vite 4.x
- 浏览器兼容：Chrome90+、Edge90+、Firefox88+

### 2.2 Electron电脑客户端（Windows / Mac）
- 语言：TypeScript
- 框架：Electron 28.x
- 页面：复用Web端Vue打包产物，一套代码复用
- 本地能力：Electron fs、path模块读取本地文件系统，配合Wasm做文档转换
- 打包工具：electron-builder

### 2.3 安卓APP
- 框架：Uni-app Vue3版
- 打包：原生Android APK，最低Android9.0
- 文件处理：uni-app原生文件API + WASM在WebView内本地运算
- 本地存储：uni.setStorage / IndexedDB

## 3. 全局主题实现方案
1. 使用CSS变量定义全部颜色，挂载到`:root`。
2. 切换主题时修改`:root`变量值，全局自动生效。
3. 跟随系统模式，使用`window.matchMedia('(prefers-color-scheme: dark)')`监听系统主题变化。
4. 用户选择的主题模式持久化保存在本地存储。

> 主题色变量定义（直接复制到代码）
```css
/* 浅色主题 */
:root.light {
  --color-bg-page: #F5F7FA;
  --color-bg-card: #FFFFFF;
  --color-text-primary: #1D2129;
  --color-text-secondary: #6E7681;
  --color-border: #E5E6EB;
  --color-primary: #1677FF;
  --color-primary-light: #E8F3FF;
  --color-success: #00B42A;
  --color-warning: #FF7D00;
  --color-error: #F53F3F;
  --color-shadow: rgba(0,0,0,0.08);
}

/* 深色主题 */
:root.dark {
  --color-bg-page: #17171A;
  --color-bg-card: #232324;
  --color-text-primary: #F2F3F5;
  --color-text-secondary: #86909C;
  --color-border: #2E2E30;
  --color-primary: #4096FF;
  --color-primary-light: #192945;
  --color-success: #00C48C;
  --color-warning: #FF9500;
  --color-error: #FF4D4F;
  --color-shadow: rgba(0,0,0,0.3);
}
```

## 4. 模块开发细则

> 
> 全部基于 Wasm + JS 库本地解析，不上传文件。
> doc/xls/ppt 旧二进制格式兼容性差，界面增加提示。

### 4.1 格式转换模块

#### 4.1.1 Office 文档互转

- docx：mammoth 解析
- xlsx：xlsx 库解析
- pptx：pptxgenjs 解析
- PDF：pdfjs-dist
- 支持单文件、批量；结果打包 ZIP 下载。

#### 4.1.2 Office/PDF 转图片

- PDF：pdfjs 渲染页面到 Canvas 导出图片。
- Word：docx-preview 解析 OOXML 版式（页面尺寸、样式表、字体、段落、表格、页眉页脚、分页符）渲染到 DOM，再逐页光栅化为 Canvas；解析失败时回退 mammoth + html2canvas。
- Excel/PPT：渲染文档页面至 Canvas，再导出图片。
- 参数控制：DPI、灰度 / 彩色、页码范围、分页 / 长图拼接、图片质量。
- 批量处理，打包 ZIP。

#### 4.1.3 图片格式转换

Canvas + sharp-wasm，支持格式互转、压缩、修改分辨率、清除 EXIF。

#### 4.1.4 音视频转换

ffmpeg.wasm 在浏览器内本地解码转换，不经过服务器。

### 4.2 开发工具模块

全部纯前端 JS 计算，无网络请求。

- UUID：Web Crypto API 本地生成
- Base64、URL 编码解码：原生 API
- MD5/SHA 系列哈希：crypto-js
- 时间戳转换、随机密码、二维码 / 条形码：前端开源库
- 时间戳扩展能力（多城市世界时钟、今日时间轴、会议时间对比）：`core/src/utils/tz.ts` + `core/src/devtools/worldtime.ts`，基于浏览器 `Intl.DateTimeFormat`（自动适配夏令时），纯本地计算，三端复用

### 4.3 证件照 & 图片处理模块

- 人脸检测、抠图：前端 wasm 图像分割模型本地运算。
- 背景替换、缩放、裁剪、文字水印全部基于 Canvas 绘制。

### 4.4 便民工具模块

纯 JS 计算，无重型第三方依赖。

## 5. 本地数据存储方案

表格

| 端 | 存储方案 | 存储内容 |
| --- | --- | --- |
| Web | IndexedDB + localStorage | 主题配置、收藏工具、历史记录、参数 |
| Electron | 本地 JSON 文件（AppData） | 主题配置、收藏工具、历史记录、参数 |
| 安卓 | uni-app storage + IndexedDB | 主题配置、收藏工具、历史记录、参数 |

> 
> 临时文件：处理过程生成临时资源，任务完成后立即销毁。

## 6. 三端适配开发规则

1. Web 端：宽屏布局，支持拖拽上传。
2. Electron：增加本地文件系统访问能力，后台任务处理大文件。
3. 安卓：竖屏布局，触控控件放大，适配手机相册、文件管理器读取。

## 7. 性能开发约束

1. WASM 大文件处理，异步任务，增加进度条，避免页面阻塞卡死。
2. 超过 50 页文档，弹出提示内存风险，支持任务后台运行。
3. 批量任务队列化，限制并发数量，防止内存溢出。

## 8. 安全开发约束

1. 所有文件操作在用户设备本地，禁止任何 http 上传文件代码。
2. 安卓端仅申请存储权限，不在 manifest 申请多余权限。
3. 临时文件、画布资源处理完毕手动释放内存。

## 9. V1.0 开发交付清单

1. CSS 变量主题系统（浅色 / 深色 / 跟随系统）
2. Web 端 Vue3+Vite 基础框架
3. Electron 客户端打包工程
4. Uni-app 安卓打包工程
5. 文档转换全套功能（Office 互转、Office 转图片、PDF 工具）
6. 图片、音视频转换 Wasm 能力
7. 开发工具集
8. 证件照与图片 Canvas 编辑
9. 便民工具集
10. 本地持久化存储（主题、收藏、历史记录）
11. 完整离线能力
12. 测试用例