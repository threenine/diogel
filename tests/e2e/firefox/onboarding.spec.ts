import { VAULT_PASSWORD, expect, test, until } from '../fixtures/firefox';

/**
 * First-run onboarding in Firefox (#198).
 *
 * NFR-17 asks for equivalent core behaviour across both browsers, and this is the first thing any
 * user meets. It is also a vault transition inside the panel, which is the shape of the #147 and
 * #181 regressions — and the Firefox suite only began catching those once it exercised them from
 * inside the panel rather than from the full-tab login page.
 */
test.describe('onboarding in Firefox', () => {
  test('creates a vault in the panel and lands on the keys prompt', async ({
    driver,
    openExtensionPage,
  }) => {
    await openExtensionPage('/sidebar');
    await driver.wait(until.elementLocated({ css: '.sidebar-setup' }), 30_000, 'no setup view');

    // The form is the setup screen, not somewhere it leads.
    const fields = await driver.findElements({ css: '.sidebar-setup input[type="password"]' });
    expect(fields).toHaveLength(2);
    await fields[0]?.sendKeys(VAULT_PASSWORD);
    await fields[1]?.sendKeys(VAULT_PASSWORD);

    await (await driver.findElement({ css: '.sidebar-setup__actions .q-btn' })).click();

    // S16: the vault exists and holds no keys. Reached without leaving the panel.
    await driver.wait(
      until.elementLocated({ css: '.sidebar-home__empty' }),
      30_000,
      'the panel never reached the keys prompt',
    );

    const strayed = await driver.findElements({ css: '.vault-card, .dashboard-navigation' });
    expect(strayed).toHaveLength(0);
  });

  test('shows no footer until the vault is unlocked', async ({ driver, openExtensionPage }) => {
    await openExtensionPage('/sidebar');
    await driver.wait(until.elementLocated({ css: '.sidebar-setup' }), 30_000, 'no setup view');

    // Asserted alongside the state that is on screen: an absent footer proves nothing on its own,
    // since a blank page would satisfy it just as well.
    const fields = await driver.findElements({ css: '.sidebar-setup input[type="password"]' });
    expect(fields).toHaveLength(2);
    expect(await driver.findElements({ css: '.sidebar-footer' })).toHaveLength(0);

    await fields[0]?.sendKeys(VAULT_PASSWORD);
    await fields[1]?.sendKeys(VAULT_PASSWORD);
    await (await driver.findElement({ css: '.sidebar-setup__actions .q-btn' })).click();

    await driver.wait(
      until.elementLocated({ css: '.sidebar-footer' }),
      30_000,
      'the footer never appeared once the vault was unlocked',
    );
  });
});
