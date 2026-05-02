import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // .env dosyasındaki değişkenleri yükle
  // process.cwd() mevcut çalışma dizinini belirtir
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
      dedupe: ['jspdf'],
      conditions: ['import', 'module', 'browser', 'default'],
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts: ['.ngrok.app', '.ngrok-free.app', 'localhost', '127.0.0.1', 'selfkasa.site', '.selfkasa.site'],
      proxy: {
        '/api': {
          // .env dosyasındaki VITE_API_URL değerini kullan, yoksa localhost'a düş
          target: env.VITE_API_URL || 'http://localhost:5001',
          changeOrigin: true,
          secure: false,
          // Eğer hedef HTTPS ise ve SSL sertifikası self-signed ise secure: false kalmalı.
          // changeOrigin: true olduğu için host header'ı otomatik ayarlanır,
          // manuel configure bloğuna gerek kalmaz.
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
      minify: 'esbuild',
      sourcemap: false,
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name].[hash].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: 'assets/[name].[hash].[ext]',
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'mui-vendor': ['@mui/material', '@mui/icons-material'],
            'utils': ['axios', 'jwt-decode'],
          },
        },
      },
    },
  }
})