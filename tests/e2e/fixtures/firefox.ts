import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { test as base } from '@playwright/test';
import { Builder, until } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';

/**
 * Firefox end-to-end fixture (#141).
 *
 * Playwright drives the suite but not the browser here: it cannot install extensions in Firefox at
 * all — that capability is Chromium-only. Firefox is driven through WebDriver instead, which does
 * support installing a temporary add-on on release builds.
 *
 * Three Firefox-specific obstacles are worked around below, each of which fails in a way that does
 * not name its own cause:
 *
 * 1. The internal `moz-extension://` origin is a fresh UUID per profile, so the panel's URL is
 *    unknowable up front. Pinning it through the `extensions.webextensions.uuids` preference makes
 *    it deterministic, keyed by the add-on id in the manifest.
 * 2. WebDriver refuses to navigate content to a `moz-extension://` URL — "Navigation is not allowed
 *    in this context". Opening the tab from the browser's own chrome context is the way round it.
 * 3. Chrome-context scripting is privileged, and from Firefox 137 it needs
 *    `--allow-system-access`, which Firefox rejects if passed through WebDriver capabilities. It has
 *    to be a geckodriver command-line flag, so this fixture runs geckodriver itself rather than
 *    letting selenium start one.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(HERE, '../../../dist/bex-firefox');

/** Any fixed UUID works; it only has to match the preference below. */
const EXTENSION_UUID = '3a4b5c6d-7e8f-4a0b-9c1d-2e3f4a5b6c7d';

/** `browser_specific_settings.gecko.id` in the built manifest. */
const ADDON_ID = '@diogel';

const GECKODRIVER = resolve(HERE, '../../../node_modules/.bin/geckodriver');

const freePort = (): Promise<number> =>
  new Promise((res, rej) => {
    const server = createServer();
    server.once('error', rej);
    server.listen(0, () => {
      const { port } = server.address() as { port: number };
      server.close(() => res(port));
    });
  });

const waitForDriver = async (port: number): Promise<void> => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/status`);
      if (response.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`geckodriver did not start on port ${port}`);
};

export interface FirefoxFixtures {
  /** Firefox's own driver subclass: `installAddon` and `setContext` live there, not on WebDriver. */
  driver: firefox.Driver;
  /** Opens an extension route and waits for the app to settle on a real surface. */
  openExtensionPage: (hash: string) => Promise<void>;
  /** Creates a vault from the login surface, leaving it unlocked. */
  createVault: (password?: string) => Promise<void>;
  /** Unlocks an existing vault from the login surface. */
  unlockVault: (password?: string) => Promise<void>;
  /** Locks the vault the way the background does on auto-lock. */
  lockVault: () => Promise<void>;
}

export const VAULT_PASSWORD = 'e2e-test-password';

export const test = base.extend<FirefoxFixtures>({
  driver: async ({}, use) => {
    if (!existsSync(join(DIST, 'manifest.json'))) {
      throw new Error(
        `No built extension at ${DIST}. Run \`npm run build:firefox\` first, or use \`npm run test:e2e:firefox\` which builds for you.`,
      );
    }

    const port = await freePort();
    const server: ChildProcess = spawn(
      GECKODRIVER,
      [`--port=${String(port)}`, '--allow-system-access'],
      { stdio: 'ignore' },
    );
    await waitForDriver(port);

    const options = new firefox.Options();
    options.addArguments('-headless');
    options.setPreference(
      'extensions.webextensions.uuids',
      JSON.stringify({ [ADDON_ID]: EXTENSION_UUID }),
    );

    const driver = (await new Builder()
      .usingServer(`http://127.0.0.1:${String(port)}`)
      .forBrowser('firefox')
      .setFirefoxOptions(options)
      .build()) as firefox.Driver;

    // Temporary, so release Firefox accepts an unsigned build. It goes away with the profile.
    await driver.installAddon(DIST, true);

    await use(driver);

    await driver.quit();
    server.kill();
  },

  openExtensionPage: async ({ driver }, use) => {
    await use(async (hash: string) => {
      const target = `moz-extension://${EXTENSION_UUID}/www/index.html#${hash}`;

      await driver.setContext(firefox.Context.CHROME);
      await driver.executeScript(
        'const url = arguments[0];' +
          'const win = Services.wm.getMostRecentWindow("navigator:browser");' +
          'win.gBrowser.selectedTab = win.gBrowser.addTab(url, {' +
          '  triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal()' +
          '});',
        target,
      );
      await driver.setContext(firefox.Context.CONTENT);

      const handles = await driver.getAllWindowHandles();
      await driver.switchTo().window(handles[handles.length - 1] as string);

      // The app waits on the background bridge for up to 10s before choosing a surface, so this
      // waits for a settled one rather than asserting into a half-booted page.
      await driver.wait(
        until.elementLocated({ css: '.sidebar-root, .vault-card' }),
        45_000,
        'the app never settled on a surface',
      );
    });
  },

  /*
   * Vault lifecycle in Firefox.
   *
   * Not a translation of the Chromium helpers. Playwright's `getByLabel` has no WebDriver
   * equivalent, so the fields are found by position within the vault card: the create form renders
   * two password inputs and the unlock form renders one, which is also what tells the two apart.
   */
  createVault: async ({ driver, openExtensionPage }, use) => {
    await use(async (password = VAULT_PASSWORD) => {
      await openExtensionPage('/login');

      const fields = await driver.wait(
        until.elementsLocated({ css: '.vault-card input[type="password"]' }),
        30_000,
        'the vault form never rendered',
      );

      if (fields.length !== 2) {
        throw new Error(
          `Expected the create form's two password fields, found ${String(fields.length)}. ` +
            'A vault already exists in this profile, or the form changed.',
        );
      }

      await fields[0]?.sendKeys(password);
      await fields[1]?.sendKeys(password);

      const submit = await driver.findElement({ css: '.vault-card .q-card__actions button' });
      await submit.click();

      // The form is replaced once the vault exists; waiting on that is what makes this synchronous.
      await driver.wait(until.stalenessOf(submit), 30_000, 'the vault was never created');
    });
  },

  unlockVault: async ({ driver, openExtensionPage }, use) => {
    await use(async (password = VAULT_PASSWORD) => {
      await openExtensionPage('/login');

      const fields = await driver.wait(
        until.elementsLocated({ css: '.vault-card input[type="password"]' }),
        30_000,
        'the unlock form never rendered',
      );

      if (fields.length !== 1) {
        throw new Error(
          `Expected the unlock form's single password field, found ${String(fields.length)}. ` +
            'The vault may not exist, in which case this is the create form.',
        );
      }

      await fields[0]?.sendKeys(password);

      const submit = await driver.findElement({ css: '.vault-card .q-card__actions button' });
      await submit.click();
      await driver.wait(until.stalenessOf(submit), 30_000, 'the vault was never unlocked');
    });
  },

  lockVault: async ({ driver }, use) => {
    await use(async () => {
      // Sent from a page rather than the background: a worker asking itself to lock is a no-op,
      // because runtime messages are not delivered to the sender's own listener.
      const locked = await driver.executeAsyncScript<boolean>(
        'const done = arguments[arguments.length - 1];' +
          'browser.runtime.sendMessage({ type: "vault.lock" })' +
          '  .then(() => done(true), (e) => done("lock failed: " + String(e)));',
      );

      // Swallowing this would surface later as "the panel never offered to unlock", which describes
      // the symptom of an unlocked vault rather than the message that never arrived.
      if (locked !== true) throw new Error(String(locked));
    });
  },
});

export const expect = test.expect;
export { until };
