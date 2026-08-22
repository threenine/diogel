import { expect, test } from './fixtures/extension';
import { VAULT_PASSWORD, createVault } from './fixtures/vault';

/**
 * First-run onboarding in the panel (#198).
 *
 * Creation used to open a full browser tab, which the specification required until 2026-08-22.
 * A tab appearing mid-onboarding was the clunkiest moment in the product, so §8 was amended to
 * host creation in the panel — first as a second screen behind a button, then folded into S17
 * itself, because a click is not much better than a tab in a flow reported as clunky.
 *
 * These run end to end because both halves are things a unit test cannot see: whether a real
 * extension page stays on the panel through a vault transition — the exact shape of the #147 and
 * #181 regressions — and whether the footer is rendered at all in each vault state.
 */

const FOOTER = '.sidebar-footer';

test.describe('creating a vault from the panel', () => {
  test('creates it in the panel, without opening a tab', async ({ openPage, context }) => {
    const panel = await openPage('/sidebar');

    // The form is the setup screen, not somewhere the setup screen leads.
    await expect(panel.locator('.sidebar-setup')).toBeVisible();
    await expect(panel.getByLabel('Password', { exact: true })).toBeVisible();

    const tabsBefore = context.pages().length;
    await panel.getByLabel('Password', { exact: true }).fill(VAULT_PASSWORD);
    await panel.getByLabel('Confirm password', { exact: true }).fill(VAULT_PASSWORD);
    await panel.getByRole('button', { name: 'Create vault', exact: true }).click();

    // Lands on S16 — vault exists, no keys yet — and stays on the panel throughout.
    await expect(panel.locator('.sidebar-home__empty')).toBeVisible({ timeout: 20_000 });
    expect(panel.url()).toContain('#/sidebar');
    await expect(panel.locator('.dashboard-layout, .vault-card')).toHaveCount(0);

    // No new tab opened at any point.
    expect(context.pages()).toHaveLength(tabsBefore);
  });

  test('offers no way out of setup but forward', async ({ openPage }) => {
    const panel = await openPage('/sidebar');

    // The screen this replaced had a Back button to a prompt that no longer exists, and the
    // footer is hidden here, so the form is the only thing to act on.
    await expect(panel.locator('.sidebar-setup')).toBeVisible();
    await expect(panel.locator('.sidebar-setup button')).toHaveCount(1);
  });

  test('refuses a password that is too short or does not match', async ({ openPage }) => {
    const panel = await openPage('/sidebar');

    const submit = panel.getByRole('button', { name: 'Create vault', exact: true });

    await panel.getByLabel('Password', { exact: true }).fill('short');
    await panel.getByLabel('Confirm password', { exact: true }).fill('short');
    await expect(submit).toBeDisabled();

    await panel.getByLabel('Password', { exact: true }).fill(VAULT_PASSWORD);
    await panel.getByLabel('Confirm password', { exact: true }).fill('something-else');
    await expect(submit).toBeDisabled();

    await panel.getByLabel('Confirm password', { exact: true }).fill(VAULT_PASSWORD);
    await expect(submit).toBeEnabled();
  });
});

/**
 * Footer visibility (specification §3, amended 2026-08-22).
 *
 * Shown only when the vault is unlocked. Every destination behind it needs an unlocked vault to be
 * useful, and on the setup and creation views it implies the user may go elsewhere when the one
 * thing to do is in front of them.
 *
 * Each case asserts the footer's absence *and* something that proves the panel rendered the state
 * it claims to be in. `toHaveCount(0)` is just as happy when the page is blank or the selector is
 * wrong, so on its own it would pass for the wrong reason.
 */
test.describe('the footer appears only when the vault is unlocked', () => {
  test('hidden on the setup view, where the vault is created', async ({ openPage }) => {
    const panel = await openPage('/sidebar');

    await expect(panel.locator('.sidebar-setup')).toBeVisible();
    await expect(panel.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(panel.locator(FOOTER)).toHaveCount(0);
  });

  test('hidden on the unlock view', async ({ openPage }) => {
    const setup = await openPage('/login');
    await createVault(setup);
    await setup.evaluate(() => chrome.runtime.sendMessage({ type: 'vault.lock' }));

    const panel = await openPage('/sidebar');

    await expect(panel.locator('.sidebar-unlock')).toBeVisible({ timeout: 20_000 });
    await expect(panel.locator(FOOTER)).toHaveCount(0);
  });

  test('shown once the vault is unlocked', async ({ openPage }) => {
    const setup = await openPage('/login');
    await createVault(setup);

    const panel = await openPage('/sidebar');

    await expect(panel.locator('.sidebar-root')).toBeVisible();
    await expect(panel.locator(FOOTER)).toBeVisible();

    // The three the specification names, and no more.
    await expect(panel.locator(`${FOOTER} .sidebar-footer__link`)).toHaveCount(3);
  });
});
