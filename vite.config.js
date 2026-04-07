import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/hasabati-dashboard/',

  build: {
    outDir: 'dist',
    // تحذير عند تجاوز 600KB بدلاً من 500KB الافتراضية
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
        // ── تقسيم الـ vendors إلى chunks منفصلة ──────────
        manualChunks: {
          // React core — نادراً يتغير → يُخزَّن في cache طويل
          'vendor-react': ['react', 'react-dom'],
          // Recharts — ضخمة، تُحمَّل فقط عند صفحات التقارير
          'vendor-recharts': ['recharts'],
          // Supabase — لا علاقة له بالـ UI
          'vendor-supabase': ['@supabase/supabase-js'],
          // Lucide icons
          'vendor-lucide': ['lucide-react'],
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
