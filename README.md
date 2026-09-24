# LocalBox 本地工具箱

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

## 应用内升级（安卓）

设置 → 版本与更新 → 检查更新，启动时也会静默提醒（6 小时节流、同版本只提醒一次）；
下载与安装全程在应用内完成，不跳转浏览器或文件管理器。

- 升级源默认读 GitHub Releases（`SongLiKod/local-box-toolkit`：tag 版本号 + Release 说明 + `LocalBox-<版本>.apk` 正式包），
  可在 `mobile/src/utils/upgrade.ts` 通过 `CUSTOM_VERSION_URL` 切换为自定义 `version.json`
  （`{ "version", "notes", "url", "sha256"? }`，需支持 CORS 的 HTTPS 地址）。
- 首次升级需在系统设置一次性授权「安装未知应用」（Android 8+ 强制要求，返回后自动继续）；
  安装时系统会在应用上方弹出确认框（安全策略无法跳过），点「更新」即完成，不离开应用。
- 升级包必须与已安装版本同一签名：CI 需配置 `ANDROID_KEYSTORE_*` secrets，否则每次构建签名不同、无法覆盖安装。
- 版本号唯一来源是**根 `package.json` 的 `version`**：Web/Electron/安卓设置页、APK 的 `versionName`/`versionCode`、uni manifest、Electron 安装包版本均构建时自动读取或同步（`npm run version:sync` 可手动同步）；发版时把它改成目标版本、打 `v<同版本号>` tag，CI 会校验 tag 与 package.json 一致（Release 资产由 CI 自动上传）。

## 主题

浅色 / 深色 / 跟随系统三主题，CSS 变量驱动（见 `core/src/theme` 与 `web/src/styles/theme.scss`），
切换时全局色值一键替换，动画 200ms 缓动。

## 隐私

全部运算在本地设备执行（WASM + 浏览器原生 API），无任何文件上传代码；
处理完成的临时资源（ObjectURL、Canvas、Worker）立即释放。
