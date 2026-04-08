import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/hasabati-dashboard/',

  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      // xlsx محملة من CDN في index.html → لا تدرجها في الباندل
      external: ['xlsx'],
      output: {
        // xlsx CDN تُعرَّف كـ global اسمها XLSX
        globals: {
          xlsx: 'XLSX',
        },
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
        // Vite 8 (rolldown) → manualChunks يجب أن يكون function
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/recharts')) {
            return 'vendor-recharts'
          }
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase'
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-lucide'
          }
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
