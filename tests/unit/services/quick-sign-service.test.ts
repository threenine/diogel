import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get, getActive } from 'src/services/dexie-storage';
import { db } from 'src/services/database';
import { isVaultUnlocked } from 'src/services/vault-service';
import { buildQuickSignPreviewEvent, getQuickSignAvailability, validateQuickSignInput } from 'src/services/quick-sign-service';

vi.mock('src/services/dexie-storage', () => ({
  get: vi.fn(),
  getActive: vi.fn(),
}));

const { relayCountMock } = vi.hoisted(() => ({
  relayCountMock: vi.fn(),
}));

vi.mock('src/services/database', () => ({
  db: {
    relayCatalog: {
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          count: relayCountMock,
        }),
      }),
    },
  },
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
    relayCountMock.mockResolvedValue(1);
  });

  it('returns locked state when vault is locked', async () => {
    vi.mocked(isVaultUnlocked).mockResolvedValue(false);

    await expect(getQuickSignAvailability(false)).resolves.toEqual({ state: 'locked' });
  });

  it('returns no-account state when no active account exists', async () => {
    vi.mocked(getActive).mockResolvedValue(undefined);

    await expect(getQuickSignAvailability(false)).resolves.toEqual({ state: 'no-account' });
  });

  it('returns no-relay state when publish requested and no online relay exists', async () => {
    relayCountMock.mockResolvedValue(0);

    await expect(getQuickSignAvailability(true)).resolves.toEqual({ state: 'no-relay' });
  });

  it('returns ready state for valid account and relay context', async () => {
    await expect(getQuickSignAvailability(false)).resolves.toEqual({ state: 'ready' });
  });

  it('validates empty content and invalid kind', () => {
    const result = validateQuickSignInput({
      kind: 2 as 1,
      content: '   ',
      publish: false,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });

  it('builds preview event for confirmation with validation metadata', () => {
    const prepared = buildQuickSignPreviewEvent('pubkey-test', {
      kind: 1,
      content: 'hello nostr',
      publish: false,
    });

    expect(prepared.validation.valid).toBe(true);
    expect(prepared.event).toMatchObject({
      kind: 1,
      content: 'hello nostr',
      pubkey: 'pubkey-test',
      tags: [],
    });
    expect(typeof prepared.event.created_at).toBe('number');
  });
});
