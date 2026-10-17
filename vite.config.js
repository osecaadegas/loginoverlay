import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    watch: {
      // Electron packaging writes locked/generated files here; they are not web source.
      ignored: ['**/public/screenspliter/out/**', '**/public/screenspliter/.vite/**']
    }
  },
  build: {
    chunkSizeWarningLimit: 1000
  }
})
