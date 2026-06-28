import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server chạy cổng 5173, proxy /api sang backend FastAPI (cổng 8000).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
