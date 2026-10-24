import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// Windows desktop app (replica of the iOS app) — built into dist-desktop/ and loaded by Electron
export default defineConfig({
  root: fileURLToPath(new URL('./desktop', import.meta.url)),
  base: './',
  plugins: [react()],
  build: {
    outDir: fileURLToPath(new URL('./dist-desktop', import.meta.url)),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
  },
})
