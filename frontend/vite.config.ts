import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_BACKEND_URL || 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react-router')) return 'vendor-router';
          if (id.includes('@tanstack/react-query')) return 'vendor-query';
          if (id.includes('react-hook-form') || id.includes('@hookform/resolvers') || id.includes('zod')) return 'vendor-forms';
          if (id.includes('zustand')) return 'vendor-state';
          if (id.includes('/react/') || id.includes('/react-dom/')) return 'vendor-react';
          return 'vendor';
        },
        chunkFileNames: 'assets/chunks/[name]-[hash].js'
      }
    }
  }
});
