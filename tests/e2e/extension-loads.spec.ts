import { expect, test } from './fixtures/extension';

/**
 * The smoke test the rest of the suite depends on.
 *
 * If the extension does not load or the worker does not start, every other spec fails in a way that
 * looks like a product bug. This one names the real cause.
 */
test.describe('the built extension', () => {
  test('loads and starts its background worker', async ({ background, extensionId }) => {
    expect(extensionId).toMatch(/^[a-p]{32}$/);
    expect(background.url()).toContain('background');
  });

  test('asks for no permission beyond storage and sidePanel (NFR-18)', async ({ background }) => {
    const permissions = await background.evaluate(
      () => chrome.runtime.getManifest().permissions ?? [],
    );

    // Adding a permission here is a product decision, not an implementation detail: it changes the
    // install-time warning a key-protection product shows its users.
    expect([...permissions].sort()).toEqual(['sidePanel', 'storage']);
  });

  test('holds no host permissions, which is why tab.url is never readable (#154)', async ({
    background,
  }) => {
    const hostPermissions = await background.evaluate(
      () => chrome.runtime.getManifest().host_permissions ?? [],
    );

    expect(hostPermissions).toEqual([]);
  });
});
