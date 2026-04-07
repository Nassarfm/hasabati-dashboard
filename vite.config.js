import { defineConfig, splitVendorChunkPlugin } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    splitVendorChunkPlugin(), // تقسيم ذكي تلقائي للـ vendors
  ],
  base: '/hasabati-dashboard/',

  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
        manualChunks: {
          'vendor-react':    ['react', 'react-dom'],
          'vendor-recharts': ['recharts'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-lucide':   ['lucide-react'],
        },
      },
    },
  },

  server: {
    proxy: {
      '/api': {
        target: 'https://hasabati-erp-production.up.railway.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
