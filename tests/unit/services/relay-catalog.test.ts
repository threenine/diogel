import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadSeedRelays, relayCatalogService } from 'src/services/relay-catalog';
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
        toArray: vi.fn(async () => Array.from(mockRelayCatalog.values())),
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

describe('Relay Catalog Service - getEntries', () => {
  beforeEach(() => {
    mockRelayCatalog.clear();
    vi.clearAllMocks();
  });

  it('should return an empty list when the catalog is empty', async () => {
    const entries = await relayCatalogService.getEntries();
    expect(entries).toEqual([]);
  });

  it('should return sorted results when catalog is populated', async () => {
    const now = Date.now();
    const entries: RelayCatalogEntry[] = [
      {
        url: 'wss://offline.com',
        hostname: 'offline.com',
        isUserAdded: false,
        isSeed: true,
        status: 'offline',
        createdAt: now,
        updatedAt: now,
      },
      {
        url: 'wss://seed-with-meta.com',
        hostname: 'seed-with-meta.com',
        isUserAdded: false,
        isSeed: true,
        status: 'online',
        metadata: { name: 'Seed' },
        createdAt: now,
        updatedAt: now,
      },
      {
        url: 'wss://discovered-with-meta.com',
        hostname: 'discovered-with-meta.com',
        isUserAdded: false,
        isSeed: false,
        status: 'online',
        metadata: { name: 'Discovered' },
        createdAt: now,
        updatedAt: now,
      },
      {
        url: 'wss://no-meta.com',
        hostname: 'no-meta.com',
        isUserAdded: false,
        isSeed: false,
        status: 'unknown',
        createdAt: now,
        updatedAt: now,
      },
    ];

    for (const entry of entries) {
      mockRelayCatalog.set(entry.url, entry);
    }

    const sorted = await relayCatalogService.getEntries();

    expect(sorted.length).toBe(4);
    expect(sorted[0]?.url).toBe('wss://seed-with-meta.com');
    expect(sorted[1]?.url).toBe('wss://discovered-with-meta.com');
    expect(sorted[2]?.url).toBe('wss://no-meta.com');
    expect(sorted[3]?.url).toBe('wss://offline.com');
  });

  it('should exclude invalid entries', async () => {
    const now = Date.now();
    mockRelayCatalog.set('invalid-scheme://relay.com', {
      url: 'invalid-scheme://relay.com',
      hostname: 'relay.com',
      isUserAdded: true,
      isSeed: false,
      status: 'online',
      createdAt: now,
      updatedAt: now,
    });
    mockRelayCatalog.set('wss://valid.com', {
      url: 'wss://valid.com',
      hostname: 'valid.com',
      isUserAdded: true,
      isSeed: false,
      status: 'online',
      createdAt: now,
      updatedAt: now,
    });

    const results = await relayCatalogService.getEntries();
    expect(results.length).toBe(1);
    expect(results[0]?.url).toBe('wss://valid.com');
  });

  it('should not mutate underlying stored records', async () => {
    const now = Date.now();
    const entry: RelayCatalogEntry = {
      url: 'wss://immutable.com',
      hostname: 'immutable.com',
      isUserAdded: false,
      isSeed: true,
      status: 'online',
      createdAt: now,
      updatedAt: now,
    };
    mockRelayCatalog.set(entry.url, entry);

    const results = await relayCatalogService.getEntries();
    expect(results.length).toBe(1);

    // Attempt to mutate the returned object (if we can)
    (results[0] as any).status = 'offline';

    // Verify stored record is unchanged
    expect(mockRelayCatalog.get('wss://immutable.com')?.status).toBe('online');
  });

  it('should sort deterministically by URL when scores are equal', async () => {
    const now = Date.now();
    mockRelayCatalog.set('wss://b.com', {
      url: 'wss://b.com',
      hostname: 'b.com',
      isUserAdded: true,
      isSeed: false,
      status: 'online',
      createdAt: now,
      updatedAt: now,
    });
    mockRelayCatalog.set('wss://a.com', {
      url: 'wss://a.com',
      hostname: 'a.com',
      isUserAdded: true,
      isSeed: false,
      status: 'online',
      createdAt: now,
      updatedAt: now,
    });

    const results = await relayCatalogService.getEntries();
    expect(results[0]?.url).toBe('wss://a.com');
    expect(results[1]?.url).toBe('wss://b.com');
  });
});
