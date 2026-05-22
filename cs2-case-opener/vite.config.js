import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  base: './',
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
  resolve: {
    alias: {
      '@data': path.resolve('./src/data'),
      '@engine': path.resolve('./src/engine'),
      '@store': path.resolve('./src/store'),
      '@ui': path.resolve('./src/ui'),
      '@utils': path.resolve('./src/utils'),
      '@auth': path.resolve('./src/auth'),
      '@api': path.resolve('./src/api'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
  },
});

