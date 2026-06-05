import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    passWithNoTests: true,
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@ultimate-pos/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
})
