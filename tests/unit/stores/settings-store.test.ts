import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import useSettingsStore from 'src/stores/settings-store';
import { FALLBACK_RELAYS, storageService } from 'src/services/storage-service';

// Mock storage service
vi.mock('src/services/storage-service', async (importOriginal) => {
  const original = await importOriginal<typeof import('src/services/storage-service')>();
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

  const DEFAULT_FALLBACK_RELAYS = [
    'wss://relay.primal.net',
    'wss://relay.damus.net',
    'wss://relay.threenine.services',
  ];

  it('should initialize with seeded default fallback relays', () => {
    const store = useSettingsStore();
    expect(store.fallbackRelays).toEqual(DEFAULT_FALLBACK_RELAYS);
  });

  it('should read stored fallback relays during getSettings', async () => {
    const storedRelays = ['wss://my-relay.com'];
    vi.mocked(storageService.getMultiple).mockResolvedValue({
      [FALLBACK_RELAYS]: storedRelays,
    });

    const store = useSettingsStore();
    await store.getSettings();

    expect(store.fallbackRelays).toEqual(storedRelays);
    expect(storageService.getMultiple).toHaveBeenCalledWith(expect.arrayContaining([FALLBACK_RELAYS]));
  });

  it('should survive repeated reads without mutation', async () => {
    const storedRelays = ['wss://my-relay.com'];
    vi.mocked(storageService.getMultiple).mockResolvedValue({
      [FALLBACK_RELAYS]: storedRelays,
    });

    const store = useSettingsStore();
    await store.getSettings();
    expect(store.fallbackRelays).toEqual(storedRelays);

    // Second read
    await store.getSettings();
    expect(store.fallbackRelays).toEqual(storedRelays);
  });

  it('should handle empty or invalid stored values safely', async () => {
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
  });

  it('should update storage when setting fallback relays', async () => {
    const store = useSettingsStore();
    const newRelays = ['wss://new-relay.com'];

    await store.setFallbackRelays(newRelays);

    expect(store.fallbackRelays).toEqual(newRelays);
    expect(storageService.set).toHaveBeenCalledWith(FALLBACK_RELAYS, newRelays);
  });

  it('should handle empty input for setFallbackRelays by reverting to defaults', async () => {
    const store = useSettingsStore();
    await store.setFallbackRelays([]);

    expect(store.fallbackRelays).toEqual(DEFAULT_FALLBACK_RELAYS);
    expect(storageService.set).toHaveBeenCalledWith(FALLBACK_RELAYS, DEFAULT_FALLBACK_RELAYS);
  });
});
