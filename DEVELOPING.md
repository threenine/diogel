# Developing Porwr

How to get a change in front of your eyes, and what the tooling does not do for you.

## Node

Use the pinned version:

```bash
nvm use          # v24.14.0, from .nvmrc
```

`@quasar/app-vite` 2.6.1 accepts Node `^22 || ^24 || ^26 || ^28 || ^30`.

`package.json` currently declares `^20 || ^22 || ^24 || ^25 || ^26 || ^28`, which is wrong in both
directions: **Node 20 and Node 25 satisfy the project's own engine check but are rejected by the
build toolchain.** If you install on either, `npm install` succeeds and every build fails. Use the
`.nvmrc` version and the question does not arise.

## Building

```bash
npm run build:chrome     # dist/bex-chrome
npm run build:firefox    # dist/bex-firefox
```

Load the folder unpacked:

- **Chromium** — `chrome://extensions` → Developer mode → Load unpacked → `dist/bex-chrome`
- **Firefox** — `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → pick any file
  inside `dist/bex-firefox`

## `quasar dev -m bex` does not currently give you a working panel

Measured on `@quasar/app-vite` 2.6.1, Chromium target, with the dev server running:

- the dev build lands in `dist/bex-chrome--dev`
- its `www/index.html` is **0 bytes**, and `assets/` contains only `content.css` — the UI bundle is
  never written into the extension folder
- the manifest still points the panel at `www/index.html#/sidebar`, so loading the dev extension and
  opening the panel gives Chromium's `chrome-error://chromewebdata/` page, not the panel
- the UI itself is served by Vite on its own port and is reachable in a normal tab, but a panel must
  be an extension page, so that does not help the surface being developed

The background, content script and provider **are** emitted and rebuilt on change, so dev mode is
still useful for work that does not involve the panel UI.

**Use a production build for panel work.** It is slower per iteration but it is the surface that
actually renders.

## The loop that works

```bash
npm run build:chrome
# reload the extension from chrome://extensions, then reopen the panel
```

What each change costs:

| Changed | Needed |
|---|---|
| Panel UI (`src/`) | rebuild, reload the extension, reopen the panel |
| Background (`src-bex/`) | rebuild, reload the extension — the worker restarts, and every pending request becomes `interrupted` by design (ADR D7) |
| Manifest (`src-bex/manifest.json`) | rebuild and **remove and re-add** the unpacked extension; Chromium does not always pick up manifest changes on reload |

Reloading the extension tears down the panel's connection to the background. That is the same path
as a service-worker restart, which the panel already handles by reconnecting and re-reading, so it is
worth knowing rather than worth avoiding.

## Running the panel in a tab

The panel is an ordinary extension page, so you can open it directly:

```
chrome-extension://<extension-id>/www/index.html#/sidebar
```

It is the same route, layout and components as the real panel. Panel presence is detected by port
name alone rather than by the absence of a tab, precisely so this works — see
`src-bex/services/panel-presence.ts`.

What it does **not** exercise: the browser-owned surface. That the manifest wires `side_panel` and
`sidebar_action`, and that the toolbar reveals the panel, are only observable in the real thing.

## Tests

```bash
npm run test:run         # unit, ~800 tests
npm run test:e2e         # Chromium, builds the extension first
npm run test:e2e:firefox # Firefox, via WebDriver
npm run lint
npm run typecheck
```

See `tests/e2e/README.md` for how the browsers are driven and what the end-to-end suite cannot cover.

## A known dead branch

Building the background emits:

```
▲ [WARNING] "import.meta" is not available with the "iife" output format and will be empty
    src/stores/settings-store.ts:191:4
```

`src/stores/settings-store.ts` guards a Pinia HMR block behind `import.meta.hot`. The background is
bundled as IIFE, where `import.meta` is empty, so that block is unreachable in the background build
and the warning is emitted on every build of both targets. It is harmless and it is noise; removing
it or scoping it to the UI build would be a small cleanup.
