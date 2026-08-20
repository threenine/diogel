import { expect, test } from './fixtures/extension';
import { createVault, lockVault } from './fixtures/vault';

/**
 * Answers the question that could not be asked before this harness existed: what does the panel
 * actually render, in a real browser, in each vault state?
 *
 * #113 hit this directly — the panel appeared to redirect to the full-tab login page, and there was
 * no way to tell an intended onboarding redirect from a surface-boundary bug.
 */
test.describe('the panel across vault states', () => {
  test('shows the panel once a vault exists and is unlocked', async ({ openPage }) => {
    const page = await openPage('/login');
    await createVault(page);

    await page.goto(page.url().replace(/#.*$/, '#/sidebar'));

    await expect(page.locator('.sidebar-root')).toBeVisible();
    await expect(page.locator('.sidebar-header')).toBeVisible();
    expect(page.url()).toContain('#/sidebar');
  });

  test('renders its own unlock view when the vault is locked, never the full-tab login page', async ({
    openPage,
  }) => {
    const page = await openPage('/login');
    await createVault(page);
    await lockVault(page);

    await page.goto(page.url().replace(/#.*$/, '#/sidebar'));

    // S2: the panel owns the locked state. A redirect to /login here would be the surface-boundary
    // violation #113 suspected.
    await expect(page.locator('.sidebar-unlock')).toBeVisible();
    expect(page.url()).toContain('#/sidebar');
  });
});

/**
 * The no-vault state (#158).
 *
 * The approval contract names S16 as "no account configured" — a vault that exists and is unlocked
 * but holds no keys. It says nothing about there being no vault at all, which is why this went
 * unnoticed: the panel fell through to its unlock view and offered to unlock nothing.
 */
test.describe('the panel with no vault', () => {
  test('settles on the panel deterministically rather than racing a redirect', async ({
    openPage,
  }) => {
    const page = await openPage('/sidebar');

    expect(page.url()).toContain('#/sidebar');
    await expect(page.locator('.sidebar-root')).toBeVisible();
  });

  test('never offers to unlock a vault that does not exist', async ({ openPage }) => {
    const page = await openPage('/sidebar');

    await expect(page.locator('.sidebar-unlock')).toHaveCount(0);
    await expect(page.getByText('Unlock Vault')).toHaveCount(0);
  });

  test('prompts to set Porwr up instead', async ({ openPage }) => {
    const page = await openPage('/sidebar');

    await expect(page.locator('.sidebar-setup')).toBeVisible();
  });
});
