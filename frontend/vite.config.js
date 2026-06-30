import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
    base: './',
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            devOptions: { enabled: true },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }, cacheableResponse: { statuses: [0, 200] } }
                    }
                ]
            }
        })
    ],
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
    server: { port: 5173, proxy: { '/api': { target: process.env.VITE_DEV_BACKEND_URL || 'http://localhost:3001', changeOrigin: true } } },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            output: {
                manualChunks: function (id) {
                    if (id.includes('jspdf'))
                        return 'vendor-jspdf';
                    if (id.includes('html2canvas'))
                        return 'vendor-html2canvas';
                    if (id.includes('/react/') || id.includes('/react-dom/'))
                        return 'vendor-react';
                    if (id.includes('react-router'))
                        return 'vendor-router';
                    if (id.includes('@tanstack/react-query'))
                        return 'vendor-query';
                    if (id.includes('react-hook-form') || id.includes('@hookform/resolvers') || id.includes('zod'))
                        return 'vendor-forms';
                    if (id.includes('zustand'))
                        return 'vendor-state';
                    return undefined;
                },
                chunkFileNames: 'assets/chunks/[name]-[hash].js',
            },
        },
    },
});
