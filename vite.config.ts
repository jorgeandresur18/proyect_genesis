import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Rutas relativas: el juego funciona en Vercel, GitHub Pages o itch.io sin cambiar nada.
  base: './',
  plugins: [react()],
});
