import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Rutas relativas: el juego funciona en Vercel, GitHub Pages o itch.io sin cambiar nada.
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // En archivos aparte, para que se descarguen en paralelo y el navegador los guarde por separado: si solo
        // cambia el código, la historia (lo más pesado) no se vuelve a bajar, y al revés.
        manualChunks(id) {
          if (id.includes('node_modules')) return 'librerias';
          if (id.includes('/src/data/chapters/') || id.includes('/src/data/en/chapters/')) return 'historia';
        },
      },
    },
    // La historia es texto y pesa (cada capítulo ronda los 900 kB): el aviso de tamaño es para el código.
    chunkSizeWarningLimit: 1600,
  },
});
