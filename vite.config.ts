import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base relativa: funciona igual en local, en GitHub Pages o en cualquier hosting estático
export default defineConfig({
  base: './',
  plugins: [react()],
  // El generador de PDF es grande pero solo se descarga al pulsar «Generar PDF»
  build: { chunkSizeWarningLimit: 1400 },
})
