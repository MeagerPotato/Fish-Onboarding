import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Static SPA — no API, no backend. Everything the guide needs ships in the bundle.
export default defineConfig({
  plugins: [react()],
  build: { target: 'es2022', sourcemap: true },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
