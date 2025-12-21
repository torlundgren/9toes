import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    coverage: {
      reporter: ['text', 'html'],
      lines: 80,
      functions: 80,
      branches: 70,
      statements: 80,
    },
  },
})
