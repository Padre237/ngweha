import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuration Vite — SPA React, pas de SSR (CDC §1.1)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // En dev, les appels /api/* sont proxifies vers le serveur Express local
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Decoupage manuel : le bundle initial de la Guest Page doit rester < 200KB gzip (CDC §9.1)
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
        },
      },
    },
  },
});
