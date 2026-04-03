import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        extension: resolve(__dirname, 'extension.html'),
        'extension-overlay': resolve(__dirname, 'extension-overlay.html')
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
