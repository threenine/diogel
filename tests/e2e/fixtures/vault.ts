import type { Page } from '@playwright/test';

/**
 * Vault helpers.
 *
 * The vault is the gate in front of everything else — the panel, signing, and every state in the
 * approval contract — so almost every end-to-end question needs it created and unlocked first.
 * That is precisely what could not be driven before this harness existed (#141).
 */

export const VAULT_PASSWORD = 'e2e-test-password';

const label = (page: Page, text: string) => page.getByLabel(text, { exact: true });

/**
 * Waits for the app to finish deciding which surface to show.
 *
 * `App.vue` waits on the background bridge for up to 10 seconds before routing, so anything that
 * asserts immediately after `goto` is racing the boot rather than testing the product.
 */
export async function waitForAppReady(page: Page): Promise<void> {
  // Deliberately not `.q-page`: that exists on the sidebar route before the boot logic has
  // decided anything, so waiting on it returns while the app is still mid-decision. The panel
  // shell and the vault card are the two settled outcomes.
  await page
    .locator('.sidebar-root, .vault-card')
    .first()
    .waitFor({ state: 'visible', timeout: 30_000 });
}

/**
 * Goes to the vault surface directly rather than letting a redirect take us there.
 *
 * Whether `#/sidebar` redirects to `#/login` is itself under investigation (#113), so a fixture
 * that depended on it would be testing the thing it is supposed to be a stable base for.
 */
async function gotoVaultSurface(page: Page): Promise<void> {
  if (!page.url().includes('#/login')) {
    await page.goto(page.url().replace(/#.*$/, '#/login'));
  }
  await page.locator('.vault-card').waitFor({ state: 'visible', timeout: 45_000 });
}

/** Creates a vault from a fresh profile, leaving it unlocked. */
export async function createVault(page: Page, password = VAULT_PASSWORD): Promise<void> {
  await gotoVaultSurface(page);
  await label(page, 'Password').fill(password);
  await label(page, 'Confirm Password').fill(password);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.getByRole('button', { name: 'Create', exact: true }).waitFor({ state: 'detached' });
}

export async function unlockVault(page: Page, password = VAULT_PASSWORD): Promise<void> {
  await gotoVaultSurface(page);
  await label(page, 'Password').fill(password);
  await page.getByRole('button', { name: 'Unlock', exact: true }).click();
  await page.getByRole('button', { name: 'Unlock', exact: true }).waitFor({ state: 'detached' });
}

/**
 * Locks the vault the way the background does on auto-lock.
 *
 * Sent from a page, not from the service worker: `chrome.runtime.sendMessage` does not deliver to
 * the sender's own listener, so a worker asking itself to lock is silently a no-op.
 */
export async function lockVault(page: Page): Promise<void> {
  await page.evaluate(() => chrome.runtime.sendMessage({ type: 'vault.lock' }));
}
