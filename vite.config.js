import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/hasabati-dashboard/',
  build: {
    outDir: 'dist',
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://hasabati-erp-production.up.railway.app',
        changeOrigin: true,
        secure: true,
      }
    }
  }
})