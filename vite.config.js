import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // base: './' usa rutas relativas para prevenir errores de MIME type
  // (octet-stream) en Netlify cuando el SW o los assets se sirven desde
  // subdirectorios incorrectos.
  base: './',
  server: {
    port: 5173,
    open: true,
  },
  build: {
    // Chunk mínimo antes de advertencia de Rollup
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Separar vendors pesados para mejor caché
        manualChunks: {
          react: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          leaflet: ['leaflet'],
        },
      },
    },
  },
})