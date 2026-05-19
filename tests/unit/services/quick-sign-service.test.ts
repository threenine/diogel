import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get, getActive } from 'src/services/dexie-storage';
import { isVaultUnlocked } from 'src/services/vault-service';
import {
  buildQuickSignPreviewEvent,
  getQuickSignAvailability,
  listQuickSignAccounts,
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
      eventJson: '{',
      publish: true,
      selectedRelayUrls: [],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(3);
  });

  it('accepts supported kind and valid event JSON', () => {
    const result = validateQuickSignInput({
      accountAlias: 'alpha',
      eventJson: JSON.stringify({
        kind: 30023,
        content: 'hello nostr',
        tags: [['title', 'example']],
      }),
      publish: false,
      selectedRelayUrls: [],
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('builds preview event with sanitized pubkey and generated signature fields', () => {
    const prepared = buildQuickSignPreviewEvent('pubkey-test', {
      accountAlias: 'alpha',
      eventJson: JSON.stringify({
        kind: 1,
        content: 'hello nostr',
        tags: [['e', '123']],
        id: 'forged-id',
        sig: 'forged-sig',
        pubkey: 'forged-pubkey',
      }),
      publish: false,
      selectedRelayUrls: [],
    });

    expect(prepared.validation.valid).toBe(true);
    expect(prepared.event).toMatchObject({
      kind: 1,
      content: 'hello nostr',
      pubkey: 'pubkey-test',
      tags: [['e', '123']],
    });
    expect('id' in prepared.event).toBe(false);
    expect('sig' in prepared.event).toBe(false);
    expect(typeof prepared.event.created_at).toBe('number');
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
      eventJson: JSON.stringify({
        kind: 1,
        content: 'hello nostr',
        tags: [],
      }),
      publish: true,
      selectedRelayUrls: [],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Select at least one relay to publish.');
  });
});
