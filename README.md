# LocalBox 本地工具箱 V1.0

纯本地运算的多端工具集合：格式转换、开发工具、证件照、便民工具。
文件不上传任何服务器，无广告，基础功能无次数/大小限制。

## 工程结构

```
core/      三端共用的核心业务逻辑（TypeScript，无框架依赖）
web/       Web 端（Vue3 + Vite + Element Plus + SCSS）
electron/  Windows / Mac 桌面客户端（复用 web 构建产物）
mobile/    安卓 APP 的 uni-app Vue3 源码（构建 H5 产物）
android/   安卓原生 WebView 壳（Gradle 工程，无 DCloud 依赖，H5 产物打包进 assets）
docs/      产品需求文档 PRD 与技术开发文档
scripts/   构建辅助脚本（H5 产物拷贝、Android 签名）
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

# 安卓端：先构建 H5 产物，再用原生 WebView 壳打 APK
npm --prefix mobile install
npm --prefix mobile run build:h5          # 输出 mobile/dist/build/h5（含 ffmpeg 静态资源）
node scripts/copy-android-dist.js         # 拷贝到 android/app/src/main/assets/dist
cd android && gradle assembleDebug        # 或 assembleRelease（需 Android SDK + JDK 17）
```

## 三端说明

- Web：Chrome90+ / Edge90+ / Firefox88+，最小宽度 1200px，IndexedDB + localStorage 本地持久化，PWA 离线可用。
- Electron：完全离线，本地 JSON 配置存于 AppData（userData），支持系统文件读写、批量重命名落盘。
- 安卓：最低 Android 9.0（API 28），uni-app H5 产物由仓库内原生 WebView 壳加载（`android/`），
  仅需基础存储权限以外无额外权限；文件经 `AndroidBridge` 保存到系统 Download/LocalBox 目录，本地持久化用 localStorage + IndexedDB。

## 主题

浅色 / 深色 / 跟随系统三主题，CSS 变量驱动（见 `core/src/theme` 与 `web/src/styles/theme.scss`），
切换时全局色值一键替换，动画 200ms 缓动。

## 隐私

全部运算在本地设备执行（WASM + 浏览器原生 API），无任何文件上传代码；
处理完成的临时资源（ObjectURL、Canvas、Worker）立即释放。
