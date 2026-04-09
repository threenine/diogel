import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadSeedRelays } from 'src/services/relay-catalog';
import { RELAY_SEEDS } from 'src/data/relay-seeds';
import type { RelayCatalogEntry } from 'src/types/relay';

// Mock the database
const mockRelayCatalog = new Map<string, RelayCatalogEntry>();

vi.mock('src/services/database', () => {
  return {
    db: {
      relayCatalog: {
        get: vi.fn(async (url: string) => mockRelayCatalog.get(url)),
        add: vi.fn(async (entry: RelayCatalogEntry) => {
          mockRelayCatalog.set(entry.url, entry);
          return entry.url;
        }),
        update: vi.fn(async (url: string, changes: Partial<RelayCatalogEntry>) => {
          const existing = mockRelayCatalog.get(url);
          if (existing) {
            mockRelayCatalog.set(url, { ...existing, ...changes });
          }
          return 1;
        }),
      },
      transaction: vi.fn(async (mode, tables, callback) => {
        return callback();
      }),
    },
  };
});

// Mock RELAY_SEEDS to have a controlled set for testing, including an invalid one
vi.mock('src/data/relay-seeds', () => ({
  RELAY_SEEDS: [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'invalid-url',
  ],
}));

describe('Relay Catalog Service - loadSeedRelays', () => {
  beforeEach(() => {
    mockRelayCatalog.clear();
    vi.clearAllMocks();
  });

  it('should insert missing seeds into an empty catalog', async () => {
    const result = await loadSeedRelays();

    expect(result.added).toBe(2); // damus and nos.lol
    expect(result.skipped).toBe(1); // invalid-url
    expect(mockRelayCatalog.size).toBe(2);

    const damus = mockRelayCatalog.get('wss://relay.damus.io');
    expect(damus).toBeDefined();
    expect(damus?.isSeed).toBe(true);
    expect(damus?.source).toBe('seed');
  });

  it('should not create duplicates when run twice', async () => {
    await loadSeedRelays();
    const secondResult = await loadSeedRelays();

    expect(secondResult.added).toBe(0);
    expect(secondResult.updated).toBe(0);
    expect(mockRelayCatalog.size).toBe(2);
  });

  it('should preserve richer existing metadata and update isSeed status', async () => {
    // Pre-insert an entry with metadata but isSeed: false
    const existingEntry: RelayCatalogEntry = {
      url: 'wss://relay.damus.io',
      hostname: 'relay.damus.io',
      isUserAdded: true,
      isSeed: false,
      status: 'online',
      metadata: { name: 'Damus Relay', description: 'Very rich description' },
      createdAt: Date.now() - 10000,
      updatedAt: Date.now() - 10000,
      source: 'manual',
    };
    mockRelayCatalog.set(existingEntry.url, existingEntry);

    const result = await loadSeedRelays();

    expect(result.added).toBe(1); // nos.lol added
    expect(result.updated).toBe(1); // damus updated to isSeed: true

    const updatedDamus = mockRelayCatalog.get('wss://relay.damus.io');
    expect(updatedDamus?.isSeed).toBe(true);
    expect(updatedDamus?.isUserAdded).toBe(true); // preserved
    expect(updatedDamus?.metadata?.name).toBe('Damus Relay'); // preserved
    expect(updatedDamus?.source).toBe('manual'); // preserved (since update didn't change it)
  });

  it('should ignore invalid seed entries safely', async () => {
    const result = await loadSeedRelays();
    expect(result.skipped).toBe(1);
    expect(mockRelayCatalog.has('invalid-url')).toBe(false);
  });
});
