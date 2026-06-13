import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Event as NostrEvent } from 'nostr-tools';

const querySyncMock = vi.hoisted(() => vi.fn());

vi.mock('nostr-tools', async (importActual) => {
  const actual = await importActual<typeof import('nostr-tools')>();

  return {
    ...actual,
    SimplePool: vi.fn(function SimplePool() {
      return {
        querySync: querySyncMock,
        get: vi.fn(),
        publish: vi.fn(),
      };
    }),
  };
});

vi.mock('src/stores/settings-store', () => ({
  default: () => ({
    getFallbackRelays: vi.fn(() => Promise.resolve(['wss://relay.test'])),
  }),
}));

import { searchContacts } from 'src/services/contact-list-service';

const pubkeyOne = '0'.repeat(63) + '1';
const pubkeyTwo = '0'.repeat(63) + '2';

function createMetadataEvent(pubkey: string, content: Record<string, unknown>, createdAt = 100): NostrEvent {
  return {
    id: '1'.repeat(64),
    sig: '2'.repeat(128),
    kind: 0,
    tags: [],
    content: JSON.stringify(content),
    pubkey,
    created_at: createdAt,
  };
}

describe('searchContacts', () => {
  beforeEach(() => {
    querySyncMock.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('returns an empty list for blank search input', async () => {
    await expect(searchContacts('   ')).resolves.toEqual([]);
    expect(querySyncMock).not.toHaveBeenCalled();
  });

  it('resolves a NIP-05 identifier to a selectable contact result', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({ names: { alice: pubkeyOne } }),
    } as Response);
    querySyncMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const results = await searchContacts('alice@example.com');

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      pubkey: pubkeyOne,
      relayUrl: '',
      matchType: 'nip05',
      profile: {
        nip05: 'alice@example.com',
      },
    });
  });

  it('returns profile metadata from relay profile search', async () => {
    querySyncMock.mockResolvedValueOnce([
      createMetadataEvent(pubkeyTwo, {
        name: 'bob',
        display_name: 'Bob Example',
        nip05: 'bob@example.com',
        picture: 'https://example.com/bob.png',
      }),
    ]);

    const results = await searchContacts('bob');

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      pubkey: pubkeyTwo,
      relayUrl: '',
      matchType: 'profile-search',
      profile: {
        name: 'bob',
        displayName: 'Bob Example',
        nip05: 'bob@example.com',
        picture: 'https://example.com/bob.png',
      },
    });
  });
});
