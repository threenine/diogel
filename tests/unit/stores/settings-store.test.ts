import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import useSettingsStore from 'src/stores/settings-store';
import { FALLBACK_RELAYS, storageService } from 'src/services/storage-service';
import { RELAY_SEEDS } from 'src/data/relay-seeds';

// Mock storage service
vi.mock('src/services/storage-service', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return {
    ...original,
    storageService: {
      getMultiple: vi.fn(),
      set: vi.fn(),
      onChanged: vi.fn(),
    },
  };
});

describe('SettingsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  const DEFAULT_FALLBACK_RELAYS = RELAY_SEEDS;

  it('should initialize with seeded default fallback relays', () => {
    const store = useSettingsStore();
    expect(store.fallbackRelays).toEqual(DEFAULT_FALLBACK_RELAYS);
  });

  it('should read stored fallback relays during getSettings', async () => {
    const storedRelays = ['wss://my-relay.com'];
    /* eslint-disable @typescript-eslint/unbound-method */
    vi.mocked(storageService.getMultiple).mockResolvedValue({
      [FALLBACK_RELAYS]: storedRelays,
    });

    const store = useSettingsStore();
    await store.getSettings();

    expect(store.fallbackRelays).toEqual(storedRelays);
    expect(storageService.getMultiple).toHaveBeenCalledWith(expect.arrayContaining([FALLBACK_RELAYS]));
    /* eslint-enable @typescript-eslint/unbound-method */
  });

  it('should survive repeated reads without mutation', async () => {
    const storedRelays = ['wss://my-relay.com'];
    /* eslint-disable @typescript-eslint/unbound-method */
    vi.mocked(storageService.getMultiple).mockResolvedValue({
      [FALLBACK_RELAYS]: storedRelays,
    });

    const store = useSettingsStore();
    await store.getSettings();
    expect(store.fallbackRelays).toEqual(storedRelays);

    // Second read
    await store.getSettings();
    expect(store.fallbackRelays).toEqual(storedRelays);
    /* eslint-enable @typescript-eslint/unbound-method */
  });

  it('should handle empty or invalid stored values safely', async () => {
    /* eslint-disable @typescript-eslint/unbound-method */
    vi.mocked(storageService.getMultiple).mockResolvedValue({
      [FALLBACK_RELAYS]: [], // Empty list
    });

    const store = useSettingsStore();
    await store.getSettings();

    // Should keep default if stored is empty (as per implementation logic)
    expect(store.fallbackRelays).toEqual(DEFAULT_FALLBACK_RELAYS);

    vi.mocked(storageService.getMultiple).mockResolvedValue({
      [FALLBACK_RELAYS]: null, // Invalid value
    });

    await store.getSettings();
    expect(store.fallbackRelays).toEqual(DEFAULT_FALLBACK_RELAYS);
    /* eslint-enable @typescript-eslint/unbound-method */
  });

  it('should update storage when setting fallback relays', async () => {
    const store = useSettingsStore();
    const newRelays = ['wss://new-relay.com'];

    await store.setFallbackRelays(newRelays);

    expect(store.fallbackRelays).toEqual(newRelays);
    /* eslint-disable @typescript-eslint/unbound-method */
    expect(storageService.set).toHaveBeenCalledWith(FALLBACK_RELAYS, newRelays);
    /* eslint-enable @typescript-eslint/unbound-method */
  });

  it('should handle empty input for setFallbackRelays by reverting to defaults', async () => {
    const store = useSettingsStore();
    await store.setFallbackRelays([]);

    expect(store.fallbackRelays).toEqual(DEFAULT_FALLBACK_RELAYS);
    /* eslint-disable @typescript-eslint/unbound-method */
    expect(storageService.set).toHaveBeenCalledWith(FALLBACK_RELAYS, DEFAULT_FALLBACK_RELAYS);
    /* eslint-enable @typescript-eslint/unbound-method */
  });
});
