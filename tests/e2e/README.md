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

Not covered yet, and not for want of trying. Playwright cannot install extensions in Firefox — the
capability exists for Chromium only. Adding Firefox means a second driver, realistically
`geckodriver` with WebDriver's temporary-addon install, which works on release Firefox.

That is a separate piece of work rather than a config flag, so it is tracked on #141 rather than
half-done here. NFR-17 wants both browsers shipping from the same source with equivalent behaviour,
so it should not be dropped.

## Known gap

`vault-and-panel.spec.ts` has one `test.fixme`. It is not flakiness in the harness: with no vault the
app boot races and settles on either surface (#158). It is left visible in the suite rather than
deleted so the gap shows up when the suite runs.
