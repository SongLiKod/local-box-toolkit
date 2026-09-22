import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
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
