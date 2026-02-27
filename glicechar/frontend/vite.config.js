import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * vite.config.js
 * --------------
 * Configurazione Vite per il frontend React.
 *
 * Il proxy reindirizza le chiamate /api del frontend
 * al backend Express durante lo sviluppo, evitando
 * problemi CORS in development.
 *
 * In produzione, il backend serve direttamente la cartella
 * dist/ e non serve il proxy.
 */
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy: /api/* → http://localhost:3001/api/*
    // Questo simula la stessa origine durante il dev
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Cartella di output del build di produzione
    outDir: 'dist',
    // Genera source maps per il debug (rimuovere in produzione se si vuole)
    sourcemap: false,
  },
})
