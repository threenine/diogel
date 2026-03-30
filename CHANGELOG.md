# Changelog

## v0.0.17

[compare changes](https://github.com/threenine/diogel/compare/v0.0.16...v0.0.17)

### 🩹 Fixes

- Update publish workflows with proper action versions and validation ([81e4c35](https://github.com/threenine/diogel/commit/81e4c35))
- Prevent AccountDropdown from redirecting away from approval popup ([ec629cd](https://github.com/threenine/diogel/commit/ec629cd))
- Improve SignerApproval layout in popup ([7edd042](https://github.com/threenine/diogel/commit/7edd042))
- Remove broken type imports from content-script.ts ([8b8dec0](https://github.com/threenine/diogel/commit/8b8dec0))

### 🏡 Chore

- **release:** V0.0.16 ([130c000](https://github.com/threenine/diogel/commit/130c000))
- Improve code formatting, update primary color variable, and adjust Quasar dark mode configuration ([d49b74b](https://github.com/threenine/diogel/commit/d49b74b))
- Add typography styles and update color variables for consistent theming across components ([7d33064](https://github.com/threenine/diogel/commit/7d33064))
- Update button styles and introduce brand-specific classes for consistent design ([fae7eb5](https://github.com/threenine/diogel/commit/fae7eb5))
- Update button styles and introduce brand-specific classes for consistent design ([c3b7f33](https://github.com/threenine/diogel/commit/c3b7f33))
- Update card styles, improve ProfileView layout, and refine SCSS structure for consistent design ([ddf4148](https://github.com/threenine/diogel/commit/ddf4148))
- Remove unnecessary inline style from ExtensionWindowHeader component ([5101a86](https://github.com/threenine/diogel/commit/5101a86))
- Make header logo dynamic based on Quasar dark mode toggle ([1c43f93](https://github.com/threenine/diogel/commit/1c43f93))
- Add header assets for light and dark modes ([aa6d32d](https://github.com/threenine/diogel/commit/aa6d32d))
- Update AccountDropdown UI and add standardized select dropdown styles ([d967462](https://github.com/threenine/diogel/commit/d967462))
- Add smooth transitions, skeleton loaders, and accessibility-focused animations for interactive components ([06b8616](https://github.com/threenine/diogel/commit/06b8616))
- Refactor bridge definitions and improve type safety across content script and background handlers ([5abfc2c](https://github.com/threenine/diogel/commit/5abfc2c))
- Add centralized error handling with `ErrorCode` enums and metadata, refactor vault service responses for consistency ([8df09b7](https://github.com/threenine/diogel/commit/8df09b7))
- Add `BridgeAction` type import to improve type safety in content script ([5e451e8](https://github.com/threenine/diogel/commit/5e451e8))
- Add Web Crypto API mocks for unit tests, update Vitest config with setup file, and enhance vault tests with crypto operations ([768c8c5](https://github.com/threenine/diogel/commit/768c8c5))
- Bump package version to 0.0.16 in package-lock.json ([ebd2571](https://github.com/threenine/diogel/commit/ebd2571))
- Update import paths for bridge types to fix relative path resolution in background and content scripts ([6d90e0d](https://github.com/threenine/diogel/commit/6d90e0d))
- Add `background.ts` with types for background script and NIP-07 interface definitions ([1eeff24](https://github.com/threenine/diogel/commit/1eeff24))
- Refactor auto-lock mechanism into a dedicated service, update background interactions for improved modularity ([7c8489c](https://github.com/threenine/diogel/commit/7c8489c))
- Refactor vault operations into dedicated handlers and update `background.ts` to use typed interfaces for improved modularity ([49aab4a](https://github.com/threenine/diogel/commit/49aab4a))
- Refactor permission handling into a dedicated module and update `background.ts` to use standardized permission checks ([a74fe8e](https://github.com/threenine/diogel/commit/a74fe8e))
- Add Firefox-specific build command to package.json ([4ae95d0](https://github.com/threenine/diogel/commit/4ae95d0))
- Fix type casting for private key in `background.ts` to align with nostr-tools usage ([7bf157a](https://github.com/threenine/diogel/commit/7bf157a))
- Add NIP-07 `handleGetPublicKey` handler and integrate with bridge approvals in `background.ts` ([d0a6751](https://github.com/threenine/diogel/commit/d0a6751))
- Add `handleSignEvent` NIP-07 handler and refactor `nostr.signEvent` logic for modularity and error handling ([5eb4440](https://github.com/threenine/diogel/commit/5eb4440))
- Add i18n support for theme and auto-lock labels in settings and refactor to use localized strings ([eebaf31](https://github.com/threenine/diogel/commit/eebaf31))
- Update Node.js version in `.nvmrc` to v24.14.0 and add placeholder section in README ([e7ee973](https://github.com/threenine/diogel/commit/e7ee973))

### ❤️ Contributors

- Gary Woodfine <gary.woodfine@threenine.co.uk>
- Root <root@openclaw.cable.virginm.net>

## v0.0.16

[compare changes](https://github.com/threenine/diogel/compare/v0.0.15...v0.0.16)

### 🚀 Enhancements

- Define explicit TypeScript interfaces for bridge requests, responses, and errors related to `nostr` event handling ([0d4212a](https://github.com/threenine/diogel/commit/0d4212a))

### 💅 Refactors

- Use constants for message types and timing values across content and background scripts ([8dcb918](https://github.com/threenine/diogel/commit/8dcb918))
- Replace `any` types with explicit bridge request/response types and enhance error handling for `nostr` event methods ([7279250](https://github.com/threenine/diogel/commit/7279250))

### 📖 Documentation

- Add PRIVACY.md detailing privacy policy and terms of service ([3344414](https://github.com/threenine/diogel/commit/3344414))

### 🏡 Chore

- Add `typecheck` script to package.json using `vue-tsc` for type safety ([079b087](https://github.com/threenine/diogel/commit/079b087))

### ✅ Tests

- Include `tests/**/*.test.{ts,js}` in Vitest configuration ([0c85ffe](https://github.com/threenine/diogel/commit/0c85ffe))
- Add unit tests for vault operations and introduce constants for message types and timing values ([9181c04](https://github.com/threenine/diogel/commit/9181c04))

### ❤️ Contributors

- Gary Woodfine <lnb0l9dc@duck.com>

## v0.0.15

[compare changes](https://github.com/threenine/diogel/compare/v0.0.14...v0.0.15)

## v0.0.14

[compare changes](https://github.com/threenine/diogel/compare/v0.0.13...v0.0.14)

### 🚀 Enhancements

- Enhance redirect handling, logging, and message consistency ([8ad25bd](https://github.com/threenine/diogel/commit/8ad25bd))
- Add hostname column to logs and adjust dropdown width in AccountList ([01b9547](https://github.com/threenine/diogel/commit/01b9547))
- Add "Remember this choice" option in SignerApproval ([74f415b](https://github.com/threenine/diogel/commit/74f415b))
- Add "Remember this choice" option in SignerApproval ([613b533](https://github.com/threenine/diogel/commit/613b533))

### 🏡 Chore

- Replace "nostr-ext" with "diogel" in message handling; simplify error messages ([6f6721a](https://github.com/threenine/diogel/commit/6f6721a))

### ❤️ Contributors

- Gary Woodfine <annex-storage-slip@duck.com>

## v0.0.13

[compare changes](https://github.com/threenine/diogel/compare/v0.0.12...v0.0.13)

### 🚀 Enhancements

- Add Firefox Web Store publishing workflow and improve manifest/browser-specific support ([5b00ba9](https://github.com/threenine/diogel/commit/5b00ba9))

### 📖 Documentation

- Update README with badges and warning block formatting ([206753a](https://github.com/threenine/diogel/commit/206753a))

### 🏡 Chore

- Adjust UI dimensions, styling, and scrolling behavior ([8f785c3](https://github.com/threenine/diogel/commit/8f785c3))
- Update diogel-header image in assets ([36a9372](https://github.com/threenine/diogel/commit/36a9372))
- Upgrade dependencies, add `MainNavigation` component, and implement unlock popup handling on vault lock ([f6137b4](https://github.com/threenine/diogel/commit/f6137b4))

### ❤️ Contributors

- Gary Woodfine <lnb0l9dc@duck.com>

## v0.0.12

[compare changes](https://github.com/threenine/diogel/compare/v0.0.11...v0.0.12)

### 🚀 Enhancements

- Add favicon display for site origin and fix header image path ([3d1c9d1](https://github.com/threenine/diogel/commit/3d1c9d1))

### 🏡 Chore

- Refactor layouts and styles for consistent UI alignment and popup responsiveness ([79a28a1](https://github.com/threenine/diogel/commit/79a28a1))
- Add MIT license and adjust UI styling for ProfileView and page container ([c892a34](https://github.com/threenine/diogel/commit/c892a34))
- Update file structure, adjust styles, and add logout option ([93746d1](https://github.com/threenine/diogel/commit/93746d1))

### ❤️ Contributors

- Gary Woodfine <annex-storage-slip@duck.com>

## v0.0.11

[compare changes](https://github.com/threenine/diogel/compare/v0.0.10...v0.0.11)

### 💅 Refactors

- Relocate export keys warning for better visibility and UI consistency ([4eac96c](https://github.com/threenine/diogel/commit/4eac96c))

### ❤️ Contributors

- Gary Woodfine <annex-storage-slip@duck.com>

## v0.0.10

[compare changes](https://github.com/threenine/diogel/compare/v0.0.9...v0.0.10)

### 🚀 Enhancements

- Improve user notifications and interface consistency ([8503eb1](https://github.com/threenine/diogel/commit/8503eb1))

### 📖 Documentation

- Add installation guide for browser extension to README.md ([d080a9b](https://github.com/threenine/diogel/commit/d080a9b))

### 🏡 Chore

- **release:** V0.0.9 ([dfd96dd](https://github.com/threenine/diogel/commit/dfd96dd))

### ❤️ Contributors

- Gary Woodfine <annex-storage-slip@duck.com>

## v0.0.9

[compare changes](https://github.com/threenine/diogel/compare/v0.0.8...v0.0.9)

### 🏡 Chore

- Improve release workflow to handle existing releases and validate zip file before upload ([0905325](https://github.com/threenine/diogel/commit/0905325))

### ❤️ Contributors

- Gary Woodfine <annex-storage-slip@duck.com>

## v0.0.8

[compare changes](https://github.com/threenine/diogel/compare/v0.0.7...v0.0.8)

### 🏡 Chore

- Update release workflow to improve tag handling and enable autogenerated release notes ([b27917e](https://github.com/threenine/diogel/commit/b27917e))

### ❤️ Contributors

- Gary Woodfine <annex-storage-slip@duck.com>

## v0.0.7

[compare changes](https://github.com/threenine/diogel/compare/v0.0.6...v0.0.7)

### 🏡 Chore

- Update publish workflow to enable release creation and adjust zip packaging ([5a9fb51](https://github.com/threenine/diogel/commit/5a9fb51))
- Update contributor email in changelog ([6787603](https://github.com/threenine/diogel/commit/6787603))

### ❤️ Contributors

- Gary Woodfine <annex-storage-slip@duck.com>

## v0.0.6

[compare changes](https://github.com/threenine/diogel/compare/v0.0.5...v0.0.6)

### 🏡 Chore

- Update manifest to run scripts at document_end and bump version to 0.0.5 ([ddf8d3e](https://github.com/threenine/diogel/commit/ddf8d3e))

### ❤️ Contributors

- Gary Woodfine <annex-storage-slip@duck.com>

## v0.0.5

[compare changes](https://github.com/threenine/diogel/compare/v0.0.4...v0.0.5)

### 🏡 Chore

- Updating permissions to activeTab ([1618007](https://github.com/threenine/diogel/commit/1618007))

### ❤️ Contributors

- Gary Woodfine <annex-storage-slip@duck.com>

## v0.0.4

[compare changes](https://github.com/threenine/diogel/compare/v0.0.3...v0.0.4)

### 🏡 Chore

- Refine `manifest.json`: remove unused `host_permissions` field and minor formatting adjustments. ([42bca21](https://github.com/threenine/diogel/commit/42bca21))

### ❤️ Contributors

- Gary Woodfine <annex-storage-slip@duck.com>

## v0.0.3

[compare changes](https://github.com/threenine/diogel/compare/v0.0.2...v0.0.3)

## v0.0.2
