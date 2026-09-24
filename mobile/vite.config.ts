import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

/**
 * 强制 chunk 文件名以字母开头。
 *
 * core/ 及其 node_modules 在 vite root(mobile/src) 之外，Rollup 用「相对 root 的模块路径」
 * 命名 chunk，产出 `..-..-node_modules-xxx.js` 这种以 `..` 开头的文件名；Vite 拼接动态 import
 * 路径时见到 `..` 开头就不补 `./`，浏览器把 import("..-..-x.js") 当 bare specifier 拒绝
 * （Failed to resolve module specifier '...'）。
 *
 * 不能写在 build.rollupOptions.output.chunkFileNames —— uni 构建会整体替换该配置，
 * 只有 outputOptions 钩子在配置合并之后、chunk 定名之前执行，必定生效。
 */
function safeChunkNames(): Plugin {
  return {
    name: 'lb-safe-chunk-names',
    outputOptions(opts) {
      opts.chunkFileNames = 'assets/lb-[name]-[hash].js'
    },
  }
}

export default defineConfig({
  // 相对路径基址：打包进 Android WebView（伪域名 https）时静态资源可用
  base: './',
  // uni 默认 publicDir 为 __static__，改为标准 public/（ffmpeg 运行时文件放这里）
  publicDir: 'public',
  plugins: [uni(), safeChunkNames()],
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
