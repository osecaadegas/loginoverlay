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
      },
      output: {
        manualChunks(id) {
          // Split node_modules into vendor chunks
          if (id.includes('node_modules')) {
            // @react-three uses React hooks — must NOT be in a separate manual chunk
            // from React. Return undefined so it bundles with the lazy avatar import.
            if (id.includes('@react-three')) return undefined
            // three.js core goes to its own lazy chunk (only loaded with 3D avatar)
            if (id.includes('/three/')) return 'vendor-three'
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react'
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase'
            }
            // All other node_modules go to vendor
            return 'vendor'
          }
        }
      }
    },
    chunkSizeWarningLimit: 700
  }
})
