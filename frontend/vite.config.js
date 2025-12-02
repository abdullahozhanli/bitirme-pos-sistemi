import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
    dedupe: ['jspdf'],
    conditions: ['import', 'module', 'browser', 'default'],
  },
  server: {
    host: '0.0.0.0', // Tüm network interface'lerinden erişilebilir
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Network üzerinden erişildiğinde backend IP'sini dinamik olarak ayarla
            const hostname = req.headers.host?.split(':')[0];
            if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
              proxyReq.setHeader('host', `${hostname}:5001`);
            }
          });
        },
      },
    },
  },
  optimizeDeps: {
    include: ['exceljs', 'jspdf', 'jspdf-autotable'],
    exclude: [],
    esbuildOptions: {
      resolveExtensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.mjs'],
    },
  },
  ssr: {
    noExternal: ['exceljs', 'jspdf', 'jspdf-autotable'],
  },
  build: {
    commonjsOptions: {
      include: [/exceljs/, /jspdf/, /node_modules/],
    },
  },
})
