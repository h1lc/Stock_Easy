import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
    coverage: {
      reporter: ['text', 'lcov'],
      // La couverture porte sur le code applicatif. Sont exclus la
      // configuration de build, le point d'entree (qui ne fait que monter
      // React dans le DOM) et les utilitaires de test eux-memes.
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/main.jsx', 'src/tests/**'],
      thresholds: { statements: 60, branches: 60, functions: 60, lines: 60 },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
