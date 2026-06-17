import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import.meta.env.VITE_SUPABASE_URL

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
})
