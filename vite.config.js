import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Respeta PORT (lo usa el preview para no chocar con tu `npm run dev` en 3000).
    port: Number(process.env.PORT) || 3000,
    open: !process.env.PORT,
  },
  // Configuración de Vitest (npm test). Entorno node: probamos lógica pura.
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
  },
})
