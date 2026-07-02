import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.xlsx'], // Add this line
  base: '/superadmin/', // Set base path
  server: {
    port: 5177,
  },
});
