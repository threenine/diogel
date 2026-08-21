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

### Coverage policy

Coverage is enforced. `npm run test:coverage` fails if any threshold in `vitest.config.ts` is
breached, and CI runs it on every pull request.

The thresholds are a **ratchet**, not an achievement. Each one sits just below where coverage
actually stands, so a genuine regression fails and ordinary noise does not:

| | Floor | Actual (2026-08-21) |
|---|---|---|
| Statements | 59% | 59.77% |
| Branches | 52% | 52.05% |
| Functions | 51% | 51.39% |
| Lines | 60% | 60.02% |

**The target is 75%** across the board. The floors are raised toward it as coverage rises, and are
never lowered: if a change cannot meet the current floor, the answer is a test, not a smaller number.

**Every source file is measured, not only the ones a test imports.** `coverage.include` is set for
that reason. Without it, 35 of 157 source files — 5,935 lines — were absent from the denominator
rather than counted as uncovered, which both flattered the figure by roughly fifteen points and
inverted the incentive: removing the last test that imported a file made coverage go up. Earlier
figures in this repository, including the baseline recorded on #124, were measured that way and read
about fifteen points higher than the truth.

Message catalogues (`src/i18n`), Quasar boot files and declaration files are excluded as data rather
than logic.

The layers that decide authority — `src/services`, `src/composables`, `src/utils`,
`src-bex/handlers`, `src-bex/services` — are already past 75% and are held there by their own
per-directory thresholds. Without those, the global floor would let them slide while the component
layer pulled the average around. Expect a per-directory threshold to fail a pull request for a file
it did not touch: adding an uncovered file to a well-covered directory is exactly what it is for.

Branches are the furthest from target and matter most. In a signing extension the untested branch is
the one that fails open.

`src-bex/background.ts` is still not measured — the provider reports `Failed to parse ...
background.ts. Excluding it from coverage.` because nothing imports it, so it is read from disk
rather than through the Vite transform. It appears in no figure above, in either direction.

That matters less than it did. #173 moved what it decided into modules that are measured: the
approval flow, the raw message routing decision and the page reconciliation, all now covered. What
remains in the file is the `bridge.on` registrations and startup ordering — wiring, which the
end-to-end suite exercises against a real extension rather than a mock.

The Vue component layer has no threshold. #123 deliberately left component structure alone, and a
floor there would measure work nobody has agreed to do.

**What coverage does not tell you.** It measures execution, not assertion. A test that runs a line
and asserts nothing counts the same as one that checks the result — two tests written during this
work passed while asserting nothing meaningful. Treat the number as a floor against regression, never
as evidence that something is tested.

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
