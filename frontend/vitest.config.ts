import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: true,
    clearMocks: true,
    // Playwright suites live in e2e/tests and must not be collected by Vitest.
    exclude: ['e2e/**', 'tests/e2e/**', 'node_modules/**', 'dist/**', 'electron/**'],
    maxWorkers: 1,
  },
});
