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
          if (id.includes('node_modules')) {
            // Three.js core library (no React dependency) — lazy loaded with 3D avatar
            if (id.includes('node_modules/three/')) return 'vendor-three'
            // Three.js sub-deps that don't use React hooks
            if (
              id.includes('camera-controls') ||
              id.includes('meshline') ||
              id.includes('maath') ||
              id.includes('three-mesh-bvh') ||
              id.includes('stats-gl') ||
              id.includes('@monogrid')
            ) return 'vendor-three'
            // React + anything that calls React hooks (including @react-three, @react-spring, etc.)
            if (
              id.includes('react') || id.includes('react-dom') || id.includes('react-router') ||
              id.includes('@react-three') || id.includes('@react-spring') ||
              id.includes('suspend-react') || id.includes('@use-gesture')
            ) return 'vendor-react'
            if (id.includes('@supabase')) return 'vendor-supabase'
            return 'vendor'
          }
        }
      }
    },
    chunkSizeWarningLimit: 700
  }
})
