import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' lets the built dist/ folder be hosted from any domain or sub-path
export default defineConfig({
  plugins: [react()],
  base: '/infs3605/',
  server: { port: 5173, strictPort: false, watch: { usePolling: true } },
})
