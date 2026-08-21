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
      exclude: [
        'node_modules/',
        'tests/',
        // Declaration files. `error-codes.d.ts` and `bridge.ts` carry lookup tables that are data,
        // not logic; counting them makes the number less honest rather than more (#143).
        '**/*.d.ts',
      ],
      /**
       * A ratchet, not an achievement (#143).
       *
       * Each global figure sits just below where coverage actually stands, so a real regression
       * fails and ordinary noise does not. They are raised as coverage rises and never lowered: if a
       * change cannot meet the current floor, the answer is a test, not a smaller number.
       *
       * Branches are the lowest and matter most here. In a signing extension the untested branch is
       * the one that fails open, and closing that gap is test-writing work rather than a threshold
       * decision — see the follow-up on #143.
       *
       * Measured on 2026-08-21 at 787 tests: statements 74.29, branches 60.90, functions 70.50,
       * lines 74.79.
       */
      thresholds: {
        statements: 74,
        branches: 60,
        functions: 70,
        lines: 74,

        /**
         * The layers that decide authority are already past the 75% target, so they are held there
         * by directory. Without this the global floor would let them slide while the component
         * layer pulls the average around.
         */
        'src/services/**': { statements: 75, branches: 70, functions: 75, lines: 75 },
        'src/composables/**': { statements: 75, branches: 70, functions: 75, lines: 75 },
        'src/utils/**': { statements: 75, branches: 70, functions: 75, lines: 75 },
        'src-bex/handlers/**': { statements: 75, branches: 60, functions: 75, lines: 75 },
        'src-bex/services/**': { statements: 75, branches: 70, functions: 75, lines: 75 },
      },
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
