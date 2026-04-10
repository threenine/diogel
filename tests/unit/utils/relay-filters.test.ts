import { describe, it, expect } from 'vitest';
import type { RelayCatalogEntry } from 'src/types/relay';
import { filterAndSortRelays } from 'src/utils/relay-filters';

const mockRelays: RelayCatalogEntry[] = [
  {
    url: 'wss://zebra.relay.com',
    hostname: 'zebra.relay.com',
    status: 'online',
    isUserAdded: false,
    isSeed: false,
    createdAt: 0,
    updatedAt: 0,
    metadata: { name: 'Zebra Relay' },
  },
  {
    url: 'wss://apple.relay.com',
    hostname: 'apple.relay.com',
    status: 'online',
    isUserAdded: false,
    isSeed: false,
    createdAt: 0,
    updatedAt: 0,
    metadata: { name: 'Apple Relay', supported_nips: [50] },
  },
  {
    url: 'wss://search.example.com',
    hostname: 'search.example.com',
    status: 'online',
    isUserAdded: false,
    isSeed: false,
    createdAt: 0,
    updatedAt: 0,
    metadata: { name: 'Searchable Relay', supported_nips: [1, 50] },
  },
  {
    url: 'wss://nostr.v0l.me',
    hostname: 'nostr.v0l.me',
    status: 'online',
    isUserAdded: false,
    isSeed: false,
    createdAt: 0,
    updatedAt: 0,
    metadata: { name: 'Volme' },
  },
];

describe('relay-filters util', () => {
  it('should filter by text match in name', () => {
    const result = filterAndSortRelays(mockRelays, 'Zebra', false);
    expect(result).toHaveLength(1);
    expect(result[0]!.url).toBe('wss://zebra.relay.com');
  });

  it('should filter by text match in hostname', () => {
    const result = filterAndSortRelays(mockRelays, 'v0l.me', false);
    expect(result).toHaveLength(1);
    expect(result[0]!.url).toBe('wss://nostr.v0l.me');
  });

  it('should filter by text match in URL', () => {
    const result = filterAndSortRelays(mockRelays, 'wss://zebra', false);
    expect(result).toHaveLength(1);
    expect(result[0]!.url).toBe('wss://zebra.relay.com');
  });

  it('should filter for search-capable (NIP-50) only', () => {
    const result = filterAndSortRelays(mockRelays, '', true);
    expect(result).toHaveLength(2);
    expect(result.some((r) => r.url === 'wss://apple.relay.com')).toBe(true);
    expect(result.some((r) => r.url === 'wss://search.example.com')).toBe(true);
  });

  it('should apply both text filter and NIP-50 toggle', () => {
    const result = filterAndSortRelays(mockRelays, 'apple', true);
    expect(result).toHaveLength(1);
    expect(result[0]!.url).toBe('wss://apple.relay.com');
  });

  it('should return empty list when no matches found', () => {
    const result = filterAndSortRelays(mockRelays, 'no-match-at-all', false);
    expect(result).toHaveLength(0);
  });

  it('should sort relays alphabetically by name', () => {
    const result = filterAndSortRelays(mockRelays, '', false);
    // Apple, Searchable, Volme, Zebra
    expect(result).toHaveLength(4);
    expect(result[0]!.metadata?.name).toBe('Apple Relay');
    expect(result[1]!.metadata?.name).toBe('Searchable Relay');
    expect(result[2]!.metadata?.name).toBe('Volme');
    expect(result[3]!.metadata?.name).toBe('Zebra Relay');
  });

  it('should be deterministic after filtering', () => {
    const result1 = filterAndSortRelays(mockRelays, 'relay', false);
    const result2 = filterAndSortRelays(mockRelays, 'relay', false);
    expect(result1).toEqual(result2);
  });
});
