# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Diogel is a Quasar/Vue 3 browser extension (BEX target) implementing a NIP-07-compatible
`window.nostr` provider. It injects a provider into web pages, routes signing/encryption
requests through a background service worker, enforces per-origin permission rules, and signs
using a Nostr identity stored in an encrypted local vault. The UI (account/vault/relay/settings
management) is built with Vue 3 + Pinia + Quasar components.

## Commands

- Install: `npm install` (npm lockfile is canonical; `postinstall` runs `quasar prepare`)
- Dev (BEX, Chrome): `npm run dev` → `quasar dev -m bex -T chrome`
- Build SPA: `npm run build`
- Build BEX: `npm run build:chrome` / `npm run build:firefox`
- Lint: `npm run lint` (add `-- --fix` to autofix)
- Format: `npm run format` (Prettier 3, honors `.gitignore`)
- Typecheck: `npm run typecheck` (`vue-tsc --noEmit`, strict mode)
- Tests (watch): `npm run test`
- Tests (single run): `npm run test:run`
- Single test file: `npx vitest run tests/unit/services/auto-lock.test.ts`
- Single test by name: `npx vitest run -t "test name pattern"`
- Generate BEX icons: `npm run icons:bex` (use `nvm use` first to match Node version)

Use a Node version from `engines.node` in `package.json` (`^20 || ^22 || ^24 || ^25 || ^26 || ^28`).

## Architecture

### Message flow (web page → background → vault)

1. `src-bex/content-script.ts` injects `src-bex/nostr-provider.js` into the page (provides
   `window.nostr`) and relays `window.postMessage` traffic via
   `src-bex/window-message-handler.ts` (origin/security checks in
   `window-message-security.ts`).
2. The content script's bridge forwards requests to `src-bex/background.ts`, the BEX service
   worker / extension background.
3. `background.ts` registers handlers for every Bridge event (declared via the
   `BexEventMap` augmentation), enforces approval/permission flow (`requestApproval`,
   `handlers/permission-handler.ts`), resets the auto-lock timer, logs activity via
   `src/services/log-service.ts`, then calls `dispatchMessage` (`src-bex/dispatcher.ts`).
4. `dispatcher.ts` is the single switch-statement router from `BridgeAction` →
   handler in `src-bex/handlers/*` (vault, nip04, nip07, nip44, blossom, relay-browser,
   permissions, active-key). It is shared by both the Quasar BEX bridge and the raw
   `chrome.runtime.onMessage` listener.
5. Vault state itself (encryption, lock/unlock, account storage) lives in
   `src-bex/vault.ts`, with persistence through `src/services/storage-service.ts` /
   `dexie-storage.ts` / `database.ts` (Dexie/IndexedDB).

When adding a new `window.nostr` capability: add the type to `BridgeRequestMap`/
`BexEventMap` in `src/types/bridge.ts` and `background.ts`, add a case in
`dispatcher.ts`, implement the handler in `src-bex/handlers/`, and wire the
provider-side call in `nostr-provider.js`.

### Approval / permission model

- Per-origin, per-event-kind permissions are checked via `checkPermission` /
  `grantPermission` in `src-bex/handlers/permission-handler.ts`.
- If permission isn't already granted, `requestApproval` (in `background.ts`) opens a
  popup window (`pages/SignerApproval.vue` via the `/approve` or `/login` route) and
  awaits the user's response (`nostr.approval.respond` bridge event), with "once" /
  "8h" / "always" durations and a request timeout (`REQUEST_TIMEOUT_MS` in
  `src-bex/constants.ts`).
- If the vault is locked, the user is routed through `/login` first.

### Vault, accounts, and auto-lock

- `src-bex/vault.ts` + `src-bex/handlers/vault-handler.ts` own vault create/unlock/lock,
  import/export (encrypted), and account data.
- `src-bex/services/auto-lock.ts` manages the inactivity timer (`startAutoLockTimer`,
  `resetAutoLockTimer`, `restoreLastActivity`, `checkAutoLock`); `activity.mark` /
  most bridge calls reset it.
- Frontend composables `src/composables/useVault.ts`, `useVaultManagement.ts`,
  `useVaultAutoLock.ts`, `useAccounts.ts` wrap vault bridge calls for Vue components/pages.
- Pinia stores: `src/stores/account-store.ts`, `vault-store.ts`, `settings-store.ts`.

### Relay catalog / browser

- `src/services/relay-catalog.ts` (`RelayCatalogService`) is the **canonical** source of
  relay sort order (smart sort by online status, metadata richness, seed status), seeded
  via `loadSeedRelays()` at background startup.
- `src/services/relay-discovery.ts`, `relay-metadata.ts`, `relay-browser-orchestrator.ts`,
  and `src-bex/handlers/relay-browser-handler.ts` support the relay browser feature
  (`pages/RelayManagementPage.vue`, `RelayBrowserModal` component).
- UI components must preserve the background service's ordering and only apply
  non-destructive filtering via `src/utils/relay-filters.ts` — do not add secondary
  sorting in the UI.

### UI structure

- Routes: `src/router/routes.ts`. Layouts in `src/layouts/` map to extension surfaces:
  `ExtensionLayout` (popup at `/popup`), `LoginLayout` (`/login`), `DashboardLayout`
  (`/dashboard`, `/settings`, `/profile`, `/relays`, key management), `PopupLayout`,
  `BlankLayout`.
- Pages in `src/pages/` correspond to these routes (e.g. `VaultLogin.vue`,
  `SignerApproval.vue`, `KeyManagementPage.vue`, `DashboardPage.vue`).
- Boot files (`src/boot/i18n`, `src/boot/axios`) are auto-registered by Quasar; don't
  import them directly elsewhere. Centralize HTTP via `src/boot/axios`.
- i18n messages live under `src/i18n/en-US`; the unplugin only picks up files under
  `src/i18n/`.

## TypeScript conventions

- Strict mode is on. **Never use `any`** (`@typescript-eslint/no-explicit-any` is an
  error) — use exact types, type guards, discriminated unions, generics, or `unknown`
  + narrowing. For awkward third-party types, add adapters/ambient declarations under
  `src/types/`.
- Use `<script setup lang="ts">` for all SFCs.
- ESLint scope is `./src*/**/*.{ts,js,cjs,mjs,vue}` (covers both `src/` and `src-bex/`);
  Prettier is the sole formatter (no conflicting stylistic ESLint rules).

## Testing

- Vitest + jsdom, config in `vitest.config.ts`, setup in `tests/setup.ts`.
- Test locations: `tests/unit/**` (mirrors `src`/`src-bex` module structure: `services/`,
  `components/`, `pages/`, `stores/`, `composables/`, `utils/`) and co-located
  `*.spec.ts` under `src/`/`src-bex/`.
- Mock crypto via `tests/unit/mocks/crypto.ts`; mock network (axios) at the module
  boundary; keep tests deterministic.
- Path aliases available in tests (see `vitest.config.ts`): `src`, `components`,
  `app`, `src-bex`.
