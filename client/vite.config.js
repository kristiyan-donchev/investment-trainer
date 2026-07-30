import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  // GitHub Pages serves this as a project site at /investment-trainer/, not the
  // domain root, so production asset URLs need that prefix. The dev server still
  // runs at the root so `npm run dev` behaves normally.
  base: command === 'build' ? '/investment-trainer/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
}));
