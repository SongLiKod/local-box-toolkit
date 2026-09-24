import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  // 相对路径基址：打包进 Android WebView（伪域名 https）时静态资源可用
  base: './',
  // uni 默认 publicDir 为 __static__，改为标准 public/（ffmpeg 运行时文件放这里）
  publicDir: 'public',
  plugins: [uni()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@localbox/core': fileURLToPath(new URL('../core/src', import.meta.url)),
    },
  },
  server: {
    fs: { allow: ['..'] },
  },
})
