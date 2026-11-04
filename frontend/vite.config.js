import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, /api y /uploads se envían a la API (puerto 3000).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
    },
  },
});
