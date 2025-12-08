import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      // This allows us to import from shared easily if needed
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  build: {
    target: 'esnext', // Phaser requires modern JS
  }
});