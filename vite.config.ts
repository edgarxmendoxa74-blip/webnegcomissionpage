import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    chunkSizeWarningLimit: 2000,
    // Optimize for PWA
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          'react-vendor': ['react', 'react-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'ui-vendor': ['lucide-react', 'framer-motion'],
        },
      },
    },
    // Generate source maps for debugging in production
    sourcemap: false,
    // Minify for smaller bundle size
    minify: 'esbuild',
    // Target modern browsers for better PWA support
    target: 'es2020',
  },
  // PWA-specific optimizations
  server: {
    headers: {
      // Enable service worker registration in development
      'Service-Worker-Allowed': '/',
    },
  },
  // Ensure manifest and service worker are copied correctly
  publicDir: 'public',
})
