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
  /**
   * Marked `fixme` because it fails by design, not by flakiness on our side: with no vault, the
   * boot races and settles on either the full-tab create-vault card or the panel itself (#158).
   * Removing the `fixme` reproduces the race. It is left here rather than deleted so the gap in
   * coverage is visible in the suite rather than only in an issue.
   */
  test.fixme('sends a first-run user to vault creation rather than an empty panel', async ({
    openPage,
  }) => {
    const page = await openPage('/sidebar');

    await expect(page.getByText('Create Vault')).toBeVisible();
    expect(page.url()).toContain('#/login');
  });

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
