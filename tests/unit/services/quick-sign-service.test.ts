import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get, getActive } from 'src/services/dexie-storage';
import { isVaultUnlocked } from 'src/services/vault-service';
import {
  buildQuickSignPreviewEvent,
  getQuickSignAvailability,
  listQuickSignAccountRelayUrls,
  listQuickSignAccounts,
  QUICK_SIGN_SUPPORTED_KINDS,
  validateQuickSignContent,
  validateQuickSignInput,
} from 'src/services/quick-sign-service';

vi.mock('src/services/dexie-storage', () => ({
  get: vi.fn(),
  getActive: vi.fn(),
}));

vi.mock('src/services/vault-service', () => ({
  isVaultUnlocked: vi.fn(),
  sendBexMessage: vi.fn(),
}));

const { poolGetMock, poolCloseMock } = vi.hoisted(() => ({
  poolGetMock: vi.fn(),
  poolCloseMock: vi.fn(),
}));

const { settingsStoreMock } = vi.hoisted(() => ({
  settingsStoreMock: {
    fallbackRelays: ['wss://seed-relay.example'],
    getSettings: vi.fn(async () => undefined),
  },
}));

vi.mock('src/stores/settings-store', () => ({
  default: () => settingsStoreMock,
}));

vi.mock('nostr-tools', async () => {
  const actual = await vi.importActual<typeof import('nostr-tools')>('nostr-tools');
  return {
    ...actual,
    SimplePool: vi.fn().mockImplementation(function MockSimplePool(this: unknown) {
      return {
        get: poolGetMock,
        close: poolCloseMock,
      };
    }),
  };
});

describe('quick-sign-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isVaultUnlocked).mockResolvedValue(true);
    vi.mocked(getActive).mockResolvedValue('alpha');
    vi.mocked(get).mockResolvedValue({
      alpha: {
        id: 'npub1alpha',
        alias: 'alpha',
        account: { privkey: 'redacted' },
        createdAt: '2026-01-01',
      },
    });
    settingsStoreMock.fallbackRelays = ['wss://seed-relay.example'];
  });

  it('returns locked state when vault is locked', async () => {
    vi.mocked(isVaultUnlocked).mockResolvedValue(false);

    await expect(getQuickSignAvailability(false)).resolves.toEqual({ state: 'locked' });
  });

  it('returns no-account state when no active account exists', async () => {
    vi.mocked(getActive).mockResolvedValue(undefined);

    await expect(getQuickSignAvailability(false)).resolves.toEqual({ state: 'no-account' });
  });

  it('returns no-relay state when publish requested and no relay selection exists', async () => {
    await expect(getQuickSignAvailability(true, [])).resolves.toEqual({ state: 'no-relay' });
  });

  it('returns ready state for valid account and one relay context', async () => {
    await expect(getQuickSignAvailability(true, ['wss://relay.example'])).resolves.toEqual({ state: 'ready' });
  });

  it('returns ready state for valid account and multiple relay context', async () => {
    await expect(getQuickSignAvailability(true, ['wss://relay-a.example', 'wss://relay-b.example'])).resolves.toEqual({ state: 'ready' });
  });

  it('validates missing account, malformed JSON and empty relay selection', () => {
    const result = validateQuickSignInput({
      accountAlias: ' ',
      kind: 1,
      content: 'hello nostr',
      tags: [],
    }, {
      relayUrls: [],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Signing account is required.');
    expect(result.errors).toContain('Select at least one relay to publish.');
  });

  it('declares supported kinds as 1 and 30023 only', () => {
    expect(QUICK_SIGN_SUPPORTED_KINDS).toEqual([1, 30023]);
  });

  it('accepts valid kind 1 input', () => {
    const result = validateQuickSignInput({
      accountAlias: 'alpha',
      kind: 1,
      content: 'hello nostr',
      tags: [{ type: 't', value: 'tag-value' }],
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts valid kind 30023 input', () => {
    const result = validateQuickSignInput({
      accountAlias: 'alpha',
      kind: 30023,
      content: 'Long form content body',
      tags: [{ type: 'a', value: '30023:pubkey:slug' }],
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects unsupported kind', () => {
    const result = validateQuickSignInput({
      accountAlias: 'alpha',
      kind: 7 as unknown as 1,
      content: 'hello nostr',
      tags: [],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Event kind is not supported by quick-sign.');
  });

  it('rejects kind 1 content with markdown syntax', () => {
    const result = validateQuickSignInput({
      accountAlias: 'alpha',
      kind: 1,
      content: '# Heading',
      tags: [],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Kind 1 content cannot contain Markdown formatting.');
  });

  it('accepts kind 1 normal multiline plain text', () => {
    const result = validateQuickSignContent(1, 'first line\nsecond line\n1 < 2');

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects kind 1 obvious markdown patterns', () => {
    const heading = validateQuickSignContent(1, '# Heading');
    const link = validateQuickSignContent(1, '[text](https://example.com)');
    const code = validateQuickSignContent(1, '`inline`');
    const list = validateQuickSignContent(1, '- item');

    expect(heading.valid).toBe(false);
    expect(link.valid).toBe(false);
    expect(code.valid).toBe(false);
    expect(list.valid).toBe(false);
    expect(heading.errors).toContain('Kind 1 content cannot contain Markdown formatting.');
  });

  it('accepts markdown for kind 30023', () => {
    const result = validateQuickSignContent(30023, '# Heading\n- item\n[text](https://example.com)');

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects raw html for kind 30023 content helper', () => {
    const result = validateQuickSignContent(30023, '<article>Body</article>');

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Event content cannot contain raw HTML tags.');
  });

  it('rejects content with raw html', () => {
    const result = validateQuickSignInput({
      accountAlias: 'alpha',
      kind: 30023,
      content: '<b>hello</b>',
      tags: [],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Event content cannot contain raw HTML tags.');
  });

  it('rejects unsupported tag type and empty tag value', () => {
    const result = validateQuickSignInput({
      accountAlias: 'alpha',
      kind: 30023,
      content: 'hello nostr',
      tags: [
        { type: 't', value: 'ok' },
        { type: 'x' as 't', value: '' },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Tag #2 has unsupported type.');
    expect(result.errors).toContain('Tag #2 value is required.');
  });

  it('builds preview event with sanitized pubkey and generated signature fields', () => {
    vi.setSystemTime(new Date('2026-05-20T00:00:00.000Z'));

    const prepared = buildQuickSignPreviewEvent('pubkey-test', {
      accountAlias: 'alpha',
      kind: 1,
      content: 'hello nostr',
      tags: [{ type: 'e', value: '123' }],
    });

    expect(prepared.validation.valid).toBe(true);
    expect(prepared.event).toMatchObject({
      kind: 1,
      content: 'hello nostr',
      pubkey: 'pubkey-test',
      tags: [['e', '123']],
      created_at: Math.floor(new Date('2026-05-20T00:00:00.000Z').getTime() / 1000),
    });
    expect('id' in prepared.event).toBe(false);
    expect('sig' in prepared.event).toBe(false);
    vi.useRealTimers();
  });

  it('lists quick sign accounts', async () => {
    await expect(listQuickSignAccounts()).resolves.toEqual([
      {
        label: 'alpha (npub1alpha)',
        value: 'alpha',
        npub: 'npub1alpha',
      },
    ]);
  });

  it('flags publish mode as invalid when relay selection is empty', () => {
    const result = validateQuickSignInput({
      accountAlias: 'alpha',
      kind: 1,
      content: 'hello nostr',
      tags: [],
    }, {
      relayUrls: [],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Select at least one relay to publish.');
  });

  it('flags publish mode as invalid when relay url is malformed', () => {
    const result = validateQuickSignInput({
      accountAlias: 'alpha',
      kind: 1,
      content: 'hello nostr',
      tags: [],
    }, {
      relayUrls: ['https://relay.example'],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Relay URLs must be valid ws:// or wss:// URLs.');
  });

  it('lists selected account relay meta list relays and prefers write-capable markers', async () => {
    poolGetMock.mockResolvedValueOnce({
      kind: 10002,
      tags: [
        ['r', 'wss://write.example', 'write'],
        ['r', 'wss://read.example', 'read'],
      ],
    });

    await expect(listQuickSignAccountRelayUrls('alpha')).resolves.toEqual(['wss://write.example']);
  });

  it('deduplicates selected account relay meta list relays', async () => {
    poolGetMock.mockResolvedValueOnce({
      kind: 10002,
      tags: [
        ['r', 'wss://relay.example/'],
        ['r', 'wss://relay.example'],
      ],
    });

    await expect(listQuickSignAccountRelayUrls('alpha')).resolves.toEqual(['wss://relay.example']);
  });

  it('filters malformed relay urls from selected account relay meta list', async () => {
    poolGetMock.mockResolvedValueOnce({
      kind: 10002,
      tags: [
        ['r', 'bad-url'],
        ['r', 'wss://valid.example'],
      ],
    });

    await expect(listQuickSignAccountRelayUrls('alpha')).resolves.toEqual(['wss://valid.example']);
  });

  it('returns empty relay list when selected account has no relay meta list event', async () => {
    poolGetMock.mockResolvedValueOnce(null);

    await expect(listQuickSignAccountRelayUrls('alpha')).resolves.toEqual([]);
  });

  it('returns empty relay list for unknown account alias', async () => {
    await expect(listQuickSignAccountRelayUrls('unknown')).resolves.toEqual([]);
    expect(poolGetMock).not.toHaveBeenCalled();
  });

  it('returns empty relay list when no fallback relays are available for metadata lookup', async () => {
    settingsStoreMock.fallbackRelays = [];

    await expect(listQuickSignAccountRelayUrls('alpha')).resolves.toEqual([]);
    expect(poolGetMock).not.toHaveBeenCalled();
  });
});
