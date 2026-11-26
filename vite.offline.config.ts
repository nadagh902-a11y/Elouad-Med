import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
    },
  },
  build: {
    outDir: 'dist-offline',
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 10000000,
    lib: {
      entry: path.resolve(import.meta.dirname, 'src/offlineEntry.tsx'),
      name: 'ChiffrageOfflineApp',
      formats: ['iife'],
      fileName: () => 'offline-app.js',
    },
  },
});
