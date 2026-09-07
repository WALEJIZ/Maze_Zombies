import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 3000,
    open: false,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});
