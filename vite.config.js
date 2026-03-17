import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/hasabati-dashboard/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
      }
    }
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