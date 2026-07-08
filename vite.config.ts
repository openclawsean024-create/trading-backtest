import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages base path: https://<user>.github.io/<repo>/
const GITHUB_PAGES_BASE = '/trading-backtest/'

export default defineConfig({
  plugins: [react()],
  base: GITHUB_PAGES_BASE,
})