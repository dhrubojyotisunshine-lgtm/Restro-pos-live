import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isProd = env.ENV_TYPE === 'PRODUCTION'

  return {
    plugins: [react()],
    assetsInclude: ['**/*.xlsx'],
    base: '/superadmin/',
    server: {
      port: 5177,
    },
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(isProd ? env.VITE_PROD_API_BASE_URL : env.VITE_DEV_API_BASE_URL),
      'import.meta.env.VITE_IMG_URL': JSON.stringify(isProd ? env.VITE_PROD_IMG_URL : env.VITE_DEV_IMG_URL),
      'import.meta.env.VITE_APP_URL': JSON.stringify(isProd ? env.VITE_PROD_APP_URL : env.VITE_DEV_APP_URL),
      'import.meta.env.VITE_LOGIN_URL': JSON.stringify(isProd ? env.VITE_PROD_LOGIN_URL : env.VITE_DEV_LOGIN_URL),
    },
  }
})
