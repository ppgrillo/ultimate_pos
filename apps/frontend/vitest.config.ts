import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    // userEvent-driven specs (forms, POS) need a few seconds each; the 5s default
    // times out intermittently when the whole suite runs in parallel on a loaded box.
    testTimeout: 15000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@ultimate-pos/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
})
