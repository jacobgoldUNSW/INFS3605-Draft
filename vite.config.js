import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The React app is served under /infs3605/; the Express API (server/index.js) lives at /api.
export default defineConfig({
  plugins: [react()],
  base: '/infs3605/',
  server: {
    port: 5173,
    strictPort: false,
    watch: { usePolling: true },
    proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: true } },
  },
  preview: {
    proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: true } },
  },
})
