# End-to-end tests

Loads the built extension into a real browser and drives it. Covers what the unit suite cannot:
whether the extension actually loads, what the panel renders in each vault state, and what the
background does in a live worker.

## Running

```bash
npm run test:e2e        # builds the Chromium extension, then runs the suite
npm run test:e2e:only   # runs against whatever is already in dist/bex-chrome
```

First time only:

```bash
npx playwright install chromium
```

## How the extension is loaded

Playwright's `launchPersistentContext` with `--load-extension`, and **`channel: 'chromium'`**. That
channel matters: Playwright's default headless binary is `chrome-headless-shell`, which cannot load
extensions at all. The symptom is not an error — the context starts normally and simply never
produces a service worker.

Each test gets a fresh profile. The vault lives in extension storage, so a reused profile would
carry a vault between tests and make setup assertions pass for the wrong reason.

## The panel is opened as an extension page

Not through the real side panel. Neither `chrome.sidePanel.open()` nor Firefox's equivalent may be
called outside a user gesture, and no automation API drives the browser chrome that provides one.

The panel is the same page either way — same route, same layout, same components — and this is how
the panel is run during development (#142). It is also why panel presence is detected by port name
alone rather than by the absence of a tab (#113).

**What this cannot cover:** that the manifest wires `side_panel` / `sidebar_action`, and that the
toolbar reveals the panel. The manifest half is asserted here from the built output; the toolbar half
is manual.

## Timing

The app boots slowly by design. `App.vue` waits on the background bridge for up to 10 seconds, and on
settings for 1.5 seconds, before deciding which surface to show.

Two consequences, both learned the hard way:

- Never assert straight after `goto`. Use the `openPage` fixture, which waits for a **settled**
  surface — the panel shell or the vault card. Waiting on `.q-page` is not enough: it exists while
  the app is still mid-decision.
- Never navigate again before the app has settled. Doing so leaves it in a half-decided state and was
  the single biggest source of flakiness while this suite was written.

## Firefox

```bash
npm run test:e2e:firefox   # builds the Firefox extension, then runs the Firefox project
npm run test:e2e:all       # both browsers
```

Playwright runs the suite but does not drive the browser here — it cannot install extensions in
Firefox at all, that capability is Chromium-only. Firefox goes through WebDriver instead, which does
support installing a temporary add-on on release builds. The runner is providing structure and
reporting; the driver is selenium.

Three Firefox obstacles are worked around in `fixtures/firefox.ts`, each of which fails in a way that
does not name its own cause:

1. **The `moz-extension://` origin is a fresh UUID per profile**, so the panel's URL is unknowable up
   front. The `extensions.webextensions.uuids` preference pins it, keyed by the add-on id.
2. **WebDriver refuses to navigate content to `moz-extension://`** — "Navigation is not allowed in
   this context". The tab is opened from the browser's own chrome context instead.
3. **Chrome-context scripting needs `--allow-system-access`** from Firefox 137, and Firefox rejects
   that flag when it arrives through WebDriver capabilities. It has to be on geckodriver's command
   line, so the fixture starts geckodriver itself rather than letting selenium start one.

Firefox coverage is deliberately thinner than Chromium's. Chromium is where `side_panel` and the MV3
service worker live, so it carries the deeper suite; Firefox asserts parity on the facts NFR-17 says
must be equivalent — the panel shell, and the vault lifecycle including unlocking **from inside the
panel**, which is the path #147 and #181 both regressed.

## Fail-closed paths

`fail-closed.spec.ts` covers expiry, a decision on stale state, and interruption by a worker
restart. Two techniques there are worth knowing before changing it:

- **Expiry is reached by ageing the stored record, not by waiting.** The floor on
  `REQUEST_EXPIRY_MINUTES` is one minute, and a suite that waits a minute per case stops being run.
  Only `expiresAt` is moved; `state` is left alone so the real `applyExpiry` is still what changes
  it. The test asserts it aged exactly one record, so it cannot pass having aged nothing.
- **The service worker is stopped over CDP.** Playwright has no API for it; the route is
  `ServiceWorker.enable` then `ServiceWorker.stopAllWorkers`, and any runtime message revives the
  worker afterwards. The test writes a canary into `chrome.storage.session` first, because "the
  queue is empty after the restart" only means reconciliation ran if session storage survived —
  otherwise the record would be gone because the browser dropped it, and the test would prove
  nothing. Session storage does survive; the canary keeps that honest.

What these assert is not that the queue record reaches a particular state — the unit suite covers
that — but that **the page never receives a signature** it should not have.

## Known gaps

- The real side panel is never opened, in either browser — see above. The manifest keys are asserted
  instead (`side_panel` on Chromium, `sidebar_action` on Firefox); that the toolbar reveals the panel
  is manual.
- The approval path itself is Chromium-only. Firefox covers the panel shell and the vault
  lifecycle; driving a page request through the provider there needs content-script injection the
  WebDriver fixture does not yet do.
