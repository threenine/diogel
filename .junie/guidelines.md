Act as Senior Developer, who is skilled using Quasar, Vue 3, TypeScript, and Browser Extension (BEX) development.

### Project development guidelines (nostr-ext)

These notes capture project-specific details to help advanced contributors work efficiently with this
Quasar + Vue 3 + TypeScript codebase and its Browser Extension (BEX) targets.

#### Build and configuration

- Toolchain
  - Quasar CLI (Vite) drives builds and dev server. `quasar prepare` runs on postinstall and must complete
    successfully.
  - TypeScript is strict (`quasar.config.ts > build.typescript.strict: true`). Type-level errors surface in-editor and
    during dev via `vite-plugin-checker`.
  - Node engines supported (package.json `engines.node`): ^20, ^22, ^24, ^26, ^28. Use one of these to avoid
    dev/build/runtime surprises.

- Install
  - npm: `npm install` (preferred to keep lockfile in sync)
  - yarn (classic) also supported per README, but lockfile is npm-based.

- Common commands
  - Dev SPA: `npm run dev` → `quasar dev` (hash router mode; see `quasar.config.ts`)
  - Build SPA: `npm run build` → `quasar build`
  - Lint: `npm run lint` (flat ESLint config, see `eslint.config.js`)
  - Format: `npm run format` (Prettier 3; honors `.gitignore`)

- Quasar configuration highlights (`quasar.config.ts`)
  - Boot files: `src/boot/i18n` and `src/boot/axios` are auto-initialized.
  - CSS entry: `src/css/app.scss`; theming via `src/css/quasar.variables.scss`.
  - Extras: `roboto-font`, `material-icons` preconfigured.
  - Router mode: `hash` (change via `build.vueRouterMode`).
  - i18n bundling: `@intlify/unplugin-vue-i18n` includes resources from `src/i18n/**` (keep TS/JSON/YAML under that
    path).
  - Static analysis during dev/build: `vite-plugin-checker` runs `vue-tsc` and ESLint with the same flat config used
    by `npm run lint`.
  - Dev server opens a browser automatically (`devServer.open: true`).

- Browser Extension (BEX)
  - The presence of `src-bex/` (e.g., `src-bex/background.ts`) indicates BEX targets are intended.
  - Typical flows (if/when enabled):
    - Dev BEX: `quasar dev -m bex`
    - Build BEX: `quasar build -m bex`
  - Keep BEX code TypeScript-safe; the repo already includes TS support across `src*` via ESLint and
    `vite-plugin-checker`.

#### Testing

Currently `package.json` defines `"test": "echo \"No test specified\" && exit 0"` and there is no dedicated test
framework wired up. You can still write and run lightweight tests immediately using Node’s built-in test runner (
`node:test`), which requires no extra dependencies and works with the engine range declared in this project.

- One-off test execution (demonstrated and verified):
  1. Create a temporary file at the project root, for example `tmp-sample.test.mjs` with:

     ```js
     import test from 'node:test';
     import assert from 'node:assert/strict';

     test('math sanity', () => {
       assert.equal(1 + 1, 2);
     });
     ```

  2. Run it: `node --test tmp-sample.test.mjs`
     - Verified output (example):
       - tests 1, pass 1, fail 0
  3. Delete the temporary file after use to keep the repo clean.

- Suggested npm script (optional): add to `package.json` if you want a convenience runner without adding a new
  framework:
  - `"test": "node --test \"src/**/*.test.{js,mjs,cjs,ts}\""`
  - With this in place, place small focused tests alongside code (e.g., `src/utils/foo.test.ts`) and run with
    `npm test`.

- Adopting Vitest (optional, when the test surface grows):
  - Pros: Jest-like API, watch mode, rich reporters, tight Vite integration, better TS ergonomics for large suites.
  - Minimal steps (not yet applied to this repo):
    - `npm i -D vitest @vitest/ui @vitest/coverage-v8 jsdom` (if you need DOM APIs)
    - Create `vitest.config.ts` aligned with `quasar.config.ts` aliases and Vue plugin.
    - Add scripts: `"test": "vitest", "test:run": "vitest run"`
    - Add a sample `*.spec.ts` under `src/` and run `npm test`.

Guidelines for adding tests (irrespective of runner):

- Co-locate tests next to implementation where it increases clarity; otherwise use `tests/` with the same module
  boundaries.
- Keep tests deterministic; mock network (`axios`) at the module boundary.
- For Vue SFCs, prefer component-level tests only after extracting logic into composables/stores where feasible; this
  keeps UI tests lean.

#### Development notes and code style

- Linting/formatting
  - ESLint 9 (flat config) + `eslint-plugin-vue` 10 + TypeScript config via `@vue/eslint-config-typescript`.
  - Scope: `./src*/**/*.{ts,js,mjs,cjs,vue}` (includes both `src` and `src-bex`). Fix issues with
    `npm run lint -- --fix`.
  - Prettier 3 is the sole formatter. Run `npm run format`. Keep Prettier and ESLint responsibilities separate (no
    stylistic ESLint rules conflicting with Prettier).

- TypeScript
  - Strict mode is enabled; prefer precise types over `any`. For Vue SFCs use `<script setup lang="ts">`
    consistently (already adopted in this repo).
  - For third-party libs lacking types, create local ambient declarations under `src/types/` and include them via
    `tsconfig.json` if needed.

- Vue/Quasar
  - Use `<script setup>` SFCs and the Quasar auto-import strategy unless a specific case needs explicit imports.
  - Keep Quasar theming in `src/css/quasar.variables.scss`; avoid scattering color tokens outside variables.
  - Boot files: keep side-effectful global setup isolated in `src/boot/*`; do not import boot files directly in
    components.

- Networking
  - Centralize Axios configuration in `src/boot/axios`. Abstract HTTP calls behind modules/composables to keep
    components thin and testable.

- i18n
  - Place locale messages under `src/i18n`. The unplugin picks them up at build time; avoid dynamic paths outside that
    directory.

- Browser Extension (BEX) specifics
  - Background/service worker code resides in `src-bex/*.ts` (e.g., `background.ts`).
  - When working on BEX, verify TypeScript types in that folder as well; ESLint and the checker already include
    `src-bex`.
  - Use `quasar dev -m bex` for rapid iteration; verify permissions and manifest via Quasar’s BEX scaffolding docs.

- Editor integration
  - Enable ESLint and TypeScript plugins. With `vite-plugin-checker`, type diagnostics will also appear in terminal
    builds.

#### Troubleshooting

- If `quasar dev` fails after dependency updates, re-run `npm ci` (or delete `node_modules` and `npm install`) to let
  `quasar prepare` regenerate artifacts.
- If i18n strings don’t resolve, confirm files are under `src/i18n` and that the boot file `i18n` is executed (it is
  registered in `quasar.config.ts`).
- BEX dev issues often relate to stale extension reloads; use the browser’s extension reloader or Quasar’s built-in
  reload flows in BEX mode.
