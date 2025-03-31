// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/bbcrown/', 
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  publicDir: 'public',
});