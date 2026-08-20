import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'], // Add setup file
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}', 'src/**/*.spec.{ts,js}', 'src-bex/**/*.spec.{ts,js}'],
    // The end-to-end specs are Playwright's, not vitest's. They load a real browser and would fail
    // here with a confusing "test.describe is not a function" if vitest picked them up (#141).
    exclude: ['node_modules/**', 'dist/**', 'tests/e2e/**'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/'],
    },
  },
  resolve: {
    alias: {
      'src': fileURLToPath(new URL('./src', import.meta.url)),
      'src/*': fileURLToPath(new URL('./src/*', import.meta.url)),
      'components': fileURLToPath(new URL('./src/components', import.meta.url)),
      'components/*': fileURLToPath(new URL('./src/components/*', import.meta.url)),
      // Quasar supplies these at build time. Tests need them to reach the router, which is the
      // only place the panel and the management surfaces are described together.
      'layouts': fileURLToPath(new URL('./src/layouts', import.meta.url)),
      'layouts/*': fileURLToPath(new URL('./src/layouts/*', import.meta.url)),
      'pages': fileURLToPath(new URL('./src/pages', import.meta.url)),
      'pages/*': fileURLToPath(new URL('./src/pages/*', import.meta.url)),
      'app': fileURLToPath(new URL('./', import.meta.url)),
      'app/*': fileURLToPath(new URL('./*', import.meta.url)),
      'src-bex': fileURLToPath(new URL('./src-bex', import.meta.url)),
      'src-bex/*': fileURLToPath(new URL('./src-bex/*', import.meta.url)),
    },
  },
});
