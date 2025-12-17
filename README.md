# Diogel 

A Nostr Account and Signer browser extension

## Install the dependencies

```bash

npm install
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)

```bash
quasar dev -m bex -T chrome
```

### Lint the files

```bash
yarn lint
# or
npm run lint
```

### Format the files

```bash
yarn format
# or
npm run format
```

### Build the app for production

```bash
quasar build
```

### Dark Mode

This app supports a Dark Mode switch powered by Quasar’s Dark plugin.

- Toggle: Use the sun/moon icon button in the top-right of the header to switch between light and dark themes.
- Persistence: Your choice is saved to localStorage and restored on next visit.
- Default: On first visit, the app follows your OS preference (prefers-color-scheme).

Implementation notes:

- Initialization happens in a boot file `src/boot/dark.ts` that calls `initDark()` from `src/composables/useDark.ts`.
- The toggle button in `src/layouts/MainLayout.vue` uses `useDark()` to flip the theme.

### Run the unit tests (Vitest)

This project uses Vitest with a JSDOM environment to test Vue 3 SFCs. Tests are colocated under `src/**` with filenames
like `*.spec.ts`.

Prerequisites:

- Use a supported Node.js version per `package.json > engines.node` (one of: ^20, ^22, ^24, ^26, ^28).

Install dependencies (once):

```bash
npm install
```

Run all tests in watch mode (developer-friendly):

```bash
npm test
```

Run tests once (CI-friendly):

```bash
npm run test:run
```

Run a specific test file or by pattern:

```bash
# single file
npx vitest run src/components/Index.spec.ts

# by name pattern
npx vitest -t "Create Account"
```

Notes:

- Quasar components are stubbed in tests (e.g., `q-select`) so you don’t need Quasar at test time.
- The Vitest config lives in `vitest.config.ts` and defines the `@` alias to `./src` and `environment: 'jsdom'`.
- If you encounter type or ESLint errors during dev/build, the repo also runs `vue-tsc` and ESLint via
  `vite-plugin-checker` when using `quasar dev/build`.

Troubleshooting:

- If tests fail to start after dependency changes, try a clean install:
  ```bash
  rm -rf node_modules && npm install
  ```
- Ensure you are on a supported Node.js version (see engines above).

### Customize the configuration

See [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js).
