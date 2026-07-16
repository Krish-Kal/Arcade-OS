import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',

  server: {
    port: 5173
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,

    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        splash: resolve(__dirname, 'splash.html')
      }
    }
  }
})