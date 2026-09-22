# LocalBox 本地工具箱 V1.0

纯本地运算的多端工具集合：格式转换、开发工具、证件照、便民工具。
文件不上传任何服务器，无广告，基础功能无次数/大小限制。

## 工程结构

```
core/      三端共用的核心业务逻辑（TypeScript，无框架依赖）
web/       Web 端（Vue3 + Vite + Element Plus + SCSS）
electron/  Windows / Mac 桌面客户端（复用 web 构建产物）
mobile/    安卓 APP（uni-app Vue3）
docs/      产品需求文档 PRD 与技术开发文档
```

## 快速开始

```bash
# 核心逻辑单元测试
npm install
npm test

# Web 端开发 / 构建
npm --prefix web install
npm --prefix web run dev
npm --prefix web run build

# Electron 客户端（先构建 web）
npm --prefix electron install
npm --prefix electron run build:renderer   # 构建 web 产物
npm --prefix electron run dev              # 开发调试
npm --prefix electron run dist             # electron-builder 打包 Win/Mac

# 安卓端（uni-app CLI）
npm --prefix mobile install
npm --prefix mobile run dev:app            # HBuilderX / 命令行打包 APK
```

## 三端说明

- Web：Chrome90+ / Edge90+ / Firefox88+，最小宽度 1200px，IndexedDB + localStorage 本地持久化，PWA 离线可用。
- Electron：完全离线，本地 JSON 配置存于 AppData（userData），支持系统文件读写、批量重命名落盘。
- 安卓：最低 Android 9.0（API 28），仅申请存储权限，uni.setStorage + IndexedDB 本地持久化。

## 主题

浅色 / 深色 / 跟随系统三主题，CSS 变量驱动（见 `core/src/theme` 与 `web/src/styles/theme.scss`），
切换时全局色值一键替换，动画 200ms 缓动。

## 隐私

全部运算在本地设备执行（WASM + 浏览器原生 API），无任何文件上传代码；
处理完成的临时资源（ObjectURL、Canvas、Worker）立即释放。
