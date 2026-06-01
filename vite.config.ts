import { networkInterfaces } from 'node:os'
import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
const printNetworkUrls = (): Plugin => ({
  name: 'print-network-urls',
  configureServer(server) {
    server.httpServer?.once('listening', () => {
      const address = server.httpServer?.address()
      const port = typeof address === 'object' && address ? address.port : server.config.server.port
      const ips = Object.values(networkInterfaces())
        .flatMap((items) => items ?? [])
        .filter((item) => item.family === 'IPv4' && !item.internal)
        .map((item) => item.address)

      if (!port || ips.length === 0) return

      console.log('\nNetwork URLs:')
      ips.forEach((ip) => {
        console.log(`  http://${ip}:${port}/`)
      })
    })
  },
})

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_TARGET?.trim()
  const allowedHosts = Array.from(new Set([
    'myctut.kzii.site',
    ...(env.VITE_DEV_ALLOWED_HOSTS
      ?.split(',')
      .map((host) => host.trim())
      .filter(Boolean) ?? []),
  ]))

  return {
    plugins: [react(), printNetworkUrls()],
    build: {
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;

            if (/[\\/]node_modules[\\/](react|react-dom|react-router-dom|zustand)[\\/]/.test(id)) {
              return 'vendor-react';
            }
            if (/[\\/]node_modules[\\/](recharts|d3-[^\\/]+)[\\/]/.test(id)) {
              return 'vendor-charts';
            }
            if (/[\\/]node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/.test(id)) {
              return 'vendor-motion';
            }
            if (/[\\/]node_modules[\\/]html5-qrcode[\\/]/.test(id)) {
              return 'vendor-qr-scanner';
            }
            if (/[\\/]node_modules[\\/](qrcode|qrcode.react)[\\/]/.test(id)) {
              return 'vendor-qr-generator';
            }
            if (/[\\/]node_modules[\\/](lucide-react|react-hot-toast)[\\/]/.test(id)) {
              return 'vendor-ui';
            }
            if (/[\\/]node_modules[\\/]axios[\\/]/.test(id)) {
              return 'vendor-http';
            }

            return 'vendor';
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts,
      proxy: apiTarget
        ? {
            '/api': {
              target: apiTarget,
              changeOrigin: true,
              secure: apiTarget.startsWith('https'),
              cookieDomainRewrite: { '*': '' },
            },
          }
        : undefined,
    }
  }
})
