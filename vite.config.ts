import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@google/genai': path.resolve(__dirname, 'node_modules/@google/genai/dist/web/index.mjs'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
