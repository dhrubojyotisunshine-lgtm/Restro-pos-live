import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.xlsx'], // Add this line
  base: '/frontend/', // Set base path
  server: {
    port: 5175,
    proxy: {
      '/login': {
        target: 'http://localhost:5176',
        changeOrigin: true,
        ws: true,
      },
      '/superadmin': {
        target: 'http://localhost:5177',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
