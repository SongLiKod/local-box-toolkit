import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@localbox/core': fileURLToPath(new URL('./core/src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['core/test/**/*.test.ts'],
  },
})
