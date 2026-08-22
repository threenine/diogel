import { expect, test } from './fixtures/extension';
import { VAULT_PASSWORD, createVault } from './fixtures/vault';

/**
 * First-run onboarding in the panel (#198).
 *
 * Creation used to open a full browser tab, which the specification required until 2026-08-22.
 * A tab appearing mid-onboarding was the clunkiest moment in the product, and §8 was amended to
 * host creation in the panel as S18.
 *
 * These run end to end because both halves are things a unit test cannot see: whether a real
 * extension page stays on the panel through a vault transition — the exact shape of the #147 and
 * #181 regressions — and whether the footer is rendered at all in each vault state.
 */

const FOOTER = '.sidebar-footer';

test.describe('creating a vault from the panel', () => {
  test('creates it in the panel, without opening a tab', async ({ openPage, context }) => {
    const panel = await openPage('/sidebar');
    await expect(panel.locator('.sidebar-setup')).toBeVisible();

    const tabsBefore = context.pages().length;
    await panel.getByRole('button', { name: 'Create vault', exact: true }).click();

    // S18 renders in the panel itself. A new tab here is the behaviour the amendment removed.
    await expect(panel.locator('.sidebar-create')).toBeVisible();
    expect(context.pages()).toHaveLength(tabsBefore);

    await panel.getByLabel('Password', { exact: true }).fill(VAULT_PASSWORD);
    await panel.getByLabel('Confirm password', { exact: true }).fill(VAULT_PASSWORD);
    await panel.getByRole('button', { name: 'Create vault', exact: true }).click();

    // Lands on S16 — vault exists, no keys yet — and stays on the panel throughout.
    await expect(panel.locator('.sidebar-home__empty')).toBeVisible({ timeout: 20_000 });
    expect(panel.url()).toContain('#/sidebar');
    await expect(panel.locator('.dashboard-layout, .vault-card')).toHaveCount(0);
  });

  test('can go back from the form to the setup prompt', async ({ openPage }) => {
    const panel = await openPage('/sidebar');

    await panel.getByRole('button', { name: 'Create vault', exact: true }).click();
    await expect(panel.locator('.sidebar-create')).toBeVisible();

    await panel.getByRole('button', { name: 'Back', exact: true }).click();

    await expect(panel.locator('.sidebar-setup')).toBeVisible();
    await expect(panel.locator('.sidebar-create')).toHaveCount(0);
  });

  test('refuses a password that is too short or does not match', async ({ openPage }) => {
    const panel = await openPage('/sidebar');
    await panel.getByRole('button', { name: 'Create vault', exact: true }).click();

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
  test('hidden on the setup view', async ({ openPage }) => {
    const panel = await openPage('/sidebar');

    await expect(panel.locator('.sidebar-setup')).toBeVisible();
    await expect(panel.locator(FOOTER)).toHaveCount(0);
  });

  test('hidden on the creation form', async ({ openPage }) => {
    const panel = await openPage('/sidebar');
    await panel.getByRole('button', { name: 'Create vault', exact: true }).click();

    await expect(panel.locator('.sidebar-create')).toBeVisible();
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
