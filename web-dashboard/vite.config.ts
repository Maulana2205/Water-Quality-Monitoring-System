import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    include: ['src/__tests__/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    setupFiles: ['./src/__tests__/setup.ts'],
  },
})
