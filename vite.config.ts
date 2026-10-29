import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// Dev: gọi /api/... được proxy sang tts-api (cùng cách nginx làm ở production).
const apiTarget = process.env.API_PROXY_TARGET || 'http://localhost:8010'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '0.0.0.0',
    port: 8020,
    strictPort: true,
    proxy: { '/api': { target: apiTarget, changeOrigin: true } },
  },
  preview: {
    host: '0.0.0.0',
    port: 8020,
    strictPort: true,
  },
})
