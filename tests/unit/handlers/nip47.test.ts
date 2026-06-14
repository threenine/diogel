import { describe, expect, it, vi, beforeEach } from 'vitest';

/* eslint-disable @typescript-eslint/unbound-method */

import { handleNip47PayInvoice } from 'app/src-bex/handlers/nip47';
import { getVaultData, updateVaultData } from 'app/src-bex/vault';
import { nip47Client } from 'app/src-bex/services/nip47-client';
import type { VaultData } from 'src/types/bridge';
import type { Nip47Connection } from 'src/types/nip47';

vi.mock('app/src-bex/vault', () => ({
  getVaultData: vi.fn(),
  updateVaultData: vi.fn(),
}));

vi.mock('app/src-bex/services/nip47-client', () => ({
  nip47Client: {
    payInvoice: vi.fn(),
  },
}));

function buildConnection(overrides: Partial<Nip47Connection> = {}): Nip47Connection {
  return {
    id: 'wallet-a',
    label: 'Wallet A',
    walletServicePubkey: 'wallet-a-wallet-pubkey',
    clientSecret: 'wallet-a-secret',
    clientPubkey: 'wallet-a-client-pubkey',
    relays: ['wss://relay.example.com/'],
    capabilities: ['pay_invoice', 'get_balance'],
    createdAt: '2026-06-14T00:00:00.000Z',
    updatedAt: '2026-06-14T00:00:00.000Z',
    isActive: true,
    ...overrides,
  };
}

const INVOICE = 'lnbc1u1pjqxyz';

describe('handleNip47PayInvoice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.crypto.randomUUID = vi.fn(() => 'history-entry-id') as () => `${string}-${string}-${string}-${string}-${string}`;
    vi.mocked(updateVaultData).mockResolvedValue({ success: true });
  });

  function mockVault(connection: Nip47Connection): VaultData {
    const vaultData: VaultData = { accounts: [], nip47Connections: [connection] };
    vi.mocked(getVaultData).mockResolvedValue({ success: true, vaultData });
    return vaultData;
  }

  it('pays the invoice and records a successful payment history entry', async () => {
    mockVault(buildConnection());
    vi.mocked(nip47Client.payInvoice).mockResolvedValue({
      preimage: 'preimage',
      paymentHash: 'hash',
      feesPaidMsat: 5,
      raw: {},
    });

    const result = await handleNip47PayInvoice({ connectionId: 'wallet-a', invoice: INVOICE });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.preimage).toBe('preimage');
    }

    expect(updateVaultData).toHaveBeenCalledTimes(1);
    const savedVaultData = vi.mocked(updateVaultData).mock.calls[0]?.[0] as VaultData;
    expect(savedVaultData.nip47PaymentHistory?.[0]).toMatchObject({
      connectionId: 'wallet-a',
      status: 'succeeded',
      paymentHash: 'hash',
      feesPaidMsat: 5,
    });
  });

  it('records a failed payment history entry when the wallet rejects the payment', async () => {
    mockVault(buildConnection());
    vi.mocked(nip47Client.payInvoice).mockRejectedValue(new Error('PAYMENT_FAILED: insufficient balance'));

    await expect(handleNip47PayInvoice({ connectionId: 'wallet-a', invoice: INVOICE })).rejects.toThrow(
      'PAYMENT_FAILED: insufficient balance',
    );

    expect(updateVaultData).toHaveBeenCalledTimes(1);
    const savedVaultData = vi.mocked(updateVaultData).mock.calls[0]?.[0] as VaultData;
    expect(savedVaultData.nip47PaymentHistory?.[0]).toMatchObject({
      connectionId: 'wallet-a',
      status: 'failed',
      error: 'PAYMENT_FAILED: insufficient balance',
    });
  });

  it('rejects payment when the connection does not advertise pay_invoice support', async () => {
    mockVault(buildConnection({ capabilities: ['get_balance'] }));

    await expect(handleNip47PayInvoice({ connectionId: 'wallet-a', invoice: INVOICE })).rejects.toThrow(
      'does not advertise pay_invoice support',
    );

    expect(nip47Client.payInvoice).not.toHaveBeenCalled();
    expect(updateVaultData).not.toHaveBeenCalled();
  });

  it('allows payment when capabilities are unknown (empty)', async () => {
    mockVault(buildConnection({ capabilities: [] }));
    vi.mocked(nip47Client.payInvoice).mockResolvedValue({ preimage: 'preimage', raw: {} });

    const result = await handleNip47PayInvoice({ connectionId: 'wallet-a', invoice: INVOICE });

    expect(result.success).toBe(true);
    expect(nip47Client.payInvoice).toHaveBeenCalled();
  });

  it('throws when the connection cannot be found', async () => {
    mockVault(buildConnection());

    await expect(handleNip47PayInvoice({ connectionId: 'missing-wallet', invoice: INVOICE })).rejects.toThrow(
      'NIP-47 connection not found',
    );
  });
});
