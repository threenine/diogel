# Diogel Developer Onboarding

Date: 2026-04-09
Prepared by: Gary Woodfine

## Purpose

This document is a practical orientation guide for developers working on Diogel. It explains what the product is, how the codebase is structured, the main runtime flows, and where to make changes safely.

## What Diogel Is

Diogel is a browser extension for Nostr identity management and signing.

Its core responsibilities are:

- manage multiple Nostr identities
- store secret material in an encrypted local vault
- expose a NIP-07 style `window.nostr` provider to websites
- approve or reject signing and cryptographic requests
- keep private keys inside the extension boundary
- support Chrome and Firefox builds

## Tech Stack

From the current repository configuration:

- Quasar Framework
- Vue 3
- TypeScript
- Pinia for state management
- Vue Router
- Dexie for IndexedDB
- nostr-tools
- noble crypto libraries
- Vitest for tests

Build scripts indicate Chrome and Firefox browser extension targets.

## Repository Structure

### Root-level items

Important files at the top level include:

- `package.json` - scripts, dependencies, targets
- `quasar.config.ts` - Quasar and extension build configuration
- `README.md` - high-level product description
- `DEPLOYMENT.md` - release and publishing details
- `PRIVACY.md` - privacy-related notes
- `vitest.config.ts` - test configuration

### `src/`

This directory contains the user-facing application UI built with Vue and Quasar.

Main responsibilities:

- popup UI
- login and vault unlock flows
- account and profile management
- settings
- approval popup UI
- logs and status views

### `src-bex/`

This directory contains the browser-extension runtime logic.

Main responsibilities:

- background script behavior
- content script behavior
- `window.nostr` injection
- vault lifecycle in the extension runtime
- permission management
- signing handlers
- auto-lock timer
- file upload support

### `tests/`

Contains unit tests for vault logic, handlers, storage, logging, and supporting services.

## Architecture Overview

The codebase is split into two major layers:

### 1. UI layer
Files under `src/`

This is the interface layer. It provides the screens and state management that let the user:

- create and unlock the vault
- create and edit accounts
- choose active identity
- configure settings
- review approvals and logs
- import and export vault data

### 2. Extension runtime layer
Files under `src-bex/`

This is the trust and protocol layer. It is responsible for:

- receiving requests from websites
- forwarding and routing extension messages
- enforcing approval and permission checks
- accessing the unlocked vault
- signing or decrypting on behalf of the user

## Main Runtime Flow

A typical signing request follows this path:

1. A website calls `window.nostr.signEvent(event)`.
2. `src-bex/nostr-provider.js` posts a window message.
3. `src-bex/content-script.ts` receives the message.
4. The content script forwards the request to the extension background.
5. `src-bex/background.ts` checks vault state and permissions.
6. If approval is needed, the extension opens the approval popup.
7. The user approves or rejects the request.
8. `src-bex/handlers/nip07.ts` signs the event with the active account.
9. The signed result is returned back through the content script to the webpage.

That is the core request chain for the extension.

## Key Files and Responsibilities

## Extension runtime

### `src-bex/background.ts`
The main extension coordinator.

Responsibilities:

- initialize the background bridge
- restore vault state
- register bridge event handlers
- dispatch vault and Nostr actions
- manage approval popups
- manage unlock-on-demand flow
- log exceptions and approvals

This is the most important file for understanding extension behavior.

### `src-bex/content-script.ts`
Injected into web pages.

Responsibilities:

- inject `nostr-provider.js` into the page context
- listen for window messages from the page
- forward supported messages to the background context
- return results or errors to the page

### `src-bex/nostr-provider.js`
Defines the page-visible `window.nostr` API.

Methods currently exposed include:

- `getPublicKey`
- `signEvent`
- `getRelays`
- `nip04.encrypt`
- `nip04.decrypt`

This is the public protocol surface websites interact with.

### `src-bex/dispatcher.ts`
Routes action names to the correct handler functions.

This is the central internal switchboard between message types and implementation code.

### `src-bex/vault.ts`
Handles vault state within the extension runtime.

Responsibilities:

- create vault
- unlock vault
- lock vault
- restore vault session state
- update vault data
- export and import vault data

This is one of the most security-sensitive files in the codebase.

### `src-bex/handlers/nip07.ts`
Implements NIP-07 style public key retrieval and event signing.

Responsibilities:

- validate unlocked vault state
- find active account
- check permissions
- sign events using the selected account

### `src-bex/handlers/nip04.ts`
Handles NIP-04 encryption and decryption using the active account secret key.

### `src-bex/handlers/permission-handler.ts`
Stores and checks permission grants.

Responsibilities:

- load permissions from storage
- check origin and event-kind grants
- grant or revoke permissions

### `src-bex/services/auto-lock.ts`
Handles inactivity timing and auto-lock behavior.

### `src-bex/handlers/blossom-handler.ts`
Handles Blossom upload signing and upload requests.

This is a separate integration surface that combines signing and remote upload behavior.

## Frontend UI and state

### `src/stores/vault-store.ts`
Tracks:

- whether a vault exists
- whether the vault is unlocked
- loading state
- last lock reason

### `src/stores/account-store.ts`
Tracks:

- loaded accounts
- active account
- storage change listeners

### `src/services/vault-service.ts`
Frontend service for communicating with background vault operations.

It prefers the Quasar bridge and falls back to `chrome.runtime.sendMessage` when needed.

### `src/services/dexie-storage.ts`
A vault-backed account storage helper.

Accounts are read from and written back into the decrypted vault data instead of being managed as a separate plaintext account table.

### `src/services/crypto.ts`
Contains the encryption and decryption primitives for vault data.

### `src/services/database.ts`
Defines the IndexedDB schema using Dexie.

Tables include:

- `vaults`
- `exceptions`
- `approvals`

### `src/router/routes.ts`
Defines the main screens and routes.

Current routes include:

- `/popup`
- `/login`
- `/settings`
- `/profile`
- `/logs`
- `/edit-account/:alias?`
- `/create-account`
- `/approve`

## Data Model Overview

## Vault
The vault is stored as an encrypted payload in IndexedDB.

The primary record currently uses:

- id: `master`

Vault content appears to include:

- mnemonic
- optional passphrase
- creation timestamp
- accounts array

## Accounts
Accounts are stored inside the vault and include:

- alias
- public identifier
- private key material
- creation metadata
- additional profile-related information where relevant

## Local Storage
Used for items such as:

- active account alias
- settings
- Blossom server
- permission grants
- auto-lock configuration

## Session Storage
Used for runtime unlock state including:

- vault unlocked flag
- exported vault key material
- vault salt

This is an important implementation detail and should be understood by anyone working on the vault lifecycle.

## Where to Make Changes

### To change vault behavior
Start with:

- `src-bex/vault.ts`
- `src/services/crypto.ts`
- `src/services/vault-service.ts`
- `src/stores/vault-store.ts`

### To change signing behavior
Start with:

- `src-bex/nostr-provider.js`
- `src-bex/content-script.ts`
- `src-bex/background.ts`
- `src-bex/handlers/nip07.ts`

### To change permission behavior
Start with:

- `src-bex/handlers/permission-handler.ts`
- `src/pages/SignerApproval.vue`

### To change auto-lock behavior
Start with:

- `src-bex/services/auto-lock.ts`
- settings-related store and UI files

### To change account management or profile UX
Start with:

- `src/stores/account-store.ts`
- `src/services/dexie-storage.ts`
- `src/pages/CreateAccount.vue`
- `src/pages/EditAccount.vue`
- `src/pages/ProfilePage.vue`

## Tests

Current test coverage includes:

- `tests/unit/vault.test.ts`
- `tests/unit/handlers/nip07.test.ts`
- `tests/unit/handlers/nip04.test.ts`
- `tests/unit/handlers/blossom-handler.test.ts`
- `tests/unit/services/storage-service.test.ts`
- `tests/unit/services/log-service.test.ts`

This is a decent base, but the codebase would benefit from more integration-level coverage around:

- approval flow behavior
- permission duration behavior
- auto-lock after worker restart
- content-script to background to provider round-trip behavior
- concurrent approvals

## Recommended Next Developer Tasks

1. Add an `ARCHITECTURE.md` file in the repository root.
2. Add a `SECURITY.md` file documenting trust boundaries and design tradeoffs.
3. Tighten bridge typing and reduce `any` usage in sensitive paths.
4. Align approval duration UX with actual stored duration behavior.
5. Verify and harden auto-lock persistence across extension lifecycle changes.
6. Clarify or complete `getRelays` support.

## Final Notes

Diogel is not a toy codebase. It already has a sensible structure, a clear product direction, and a real separation between UI logic and extension runtime logic.

The main things a new developer must understand quickly are:

- the trust boundary between webpage, content script, and background
- the vault lifecycle and unlock model
- how the active account is selected and used
- how permissions are granted and enforced
- where security-sensitive behavior actually lives

Once those pieces are understood, the rest of the repo becomes much easier to navigate.
