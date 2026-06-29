import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server chạy cổng 5173, proxy /api sang backend FastAPI (cổng 8000).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Cho phép truy cập qua Cloudflare Tunnel (*.trycloudflare.com).
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
