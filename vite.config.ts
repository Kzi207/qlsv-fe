import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    server: {
      port: 5173,
      allowedHosts: ['azt.kzii.site', 'myctut.kzii.site'],
      proxy: {
        [env.VITE_API_URL || '/api']: {
          target: env.VITE_API_TARGET || 'https://api.kzii.site',
          changeOrigin: true,
        }
      }
    }
  }
  
})
