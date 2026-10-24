import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Desktop (Electron) build uses relative paths; web build stays on GitHub Pages path
  base: process.env.FRETLAB_DESKTOP ? './' : '/fretlab/', // ← Change '/fretlab/' to match your GitHub repo name
})
