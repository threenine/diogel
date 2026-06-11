import { getPublicKey } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';
import type { HandlerResult } from '../types/background';
import type {
  ImportNip47ConnectionRequest,
  Nip47BalanceResponse,
  Nip47Connection,
  Nip47ConnectionSummary,
  Nip47InfoResponse,
  Nip47PayInvoiceRequest,
  Nip47PayInvoiceResponse,
} from 'src/types/nip47';
import type { VaultData } from 'src/types/bridge';
import { parseNwcUri, buildNip47ConnectionId } from 'src/services/nip47-uri';
import { getVaultData, updateVaultData } from '../vault';
import {
  findNip47Connection,
  listNip47Connections,
  removeNip47Connection,
  summarizeNip47Connection,
  upsertNip47Connection,
} from '../services/nip47-connection-store';
import { nip47Client } from '../services/nip47-client';

async function requireUnlockedVaultData(): Promise<VaultData> {
  const result = await getVaultData();
  if (!result.success || !result.vaultData) {
    throw new Error(result.error || 'Vault is locked. Unlock Diogel before managing wallet connections.');
  }
  return result.vaultData as VaultData;
}

async function saveVaultData(vaultData: VaultData): Promise<void> {
  const result = await updateVaultData(vaultData);
  if (!result.success) {
    throw new Error(result.error || 'Failed to update vault data');
  }
}

export async function handleNip47ConnectionsList(): Promise<HandlerResult<Nip47ConnectionSummary[]>> {
  const vaultData = await requireUnlockedVaultData();
  return {
    success: true,
    data: listNip47Connections(vaultData).map(summarizeNip47Connection),
  };
}

export async function handleNip47ConnectionImport(
  payload: ImportNip47ConnectionRequest,
): Promise<HandlerResult<Nip47ConnectionSummary>> {
  const vaultData = await requireUnlockedVaultData();
  const parsed = parseNwcUri(payload.uri);
  const clientPubkey = getPublicKey(hexToBytes(parsed.clientSecret));
  const id = buildNip47ConnectionId(parsed.walletServicePubkey, clientPubkey);
  const now = new Date().toISOString();
  const existing = findNip47Connection(vaultData, id);
  const connection: Nip47Connection = {
    id,
    label: payload.label?.trim() || existing?.label || parsed.lud16 || 'Nostr Wallet Connect',
    walletServicePubkey: parsed.walletServicePubkey,
    clientSecret: parsed.clientSecret,
    clientPubkey,
    relays: parsed.relays,
    ...(parsed.lud16 ? { lud16: parsed.lud16 } : existing?.lud16 ? { lud16: existing.lud16 } : {}),
    capabilities: existing?.capabilities ?? [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    isActive: existing?.isActive ?? true,
  };

  await saveVaultData(upsertNip47Connection(vaultData, connection));
  return { success: true, data: summarizeNip47Connection(connection) };
}

export async function handleNip47ConnectionRemove(
  payload: { connectionId: string },
): Promise<HandlerResult<boolean>> {
  const vaultData = await requireUnlockedVaultData();
  await saveVaultData(removeNip47Connection(vaultData, payload.connectionId));
  return { success: true, data: true };
}

export async function handleNip47GetInfo(payload: { connectionId: string }): Promise<HandlerResult<Nip47InfoResponse>> {
  const vaultData = await requireUnlockedVaultData();
  const connection = findNip47Connection(vaultData, payload.connectionId);
  if (!connection) {
    throw new Error('NIP-47 connection not found');
  }

  const info = await nip47Client.getInfo(connection);
  const updatedConnection: Nip47Connection = {
    ...connection,
    capabilities: info.capabilities,
    lastInfoCheckedAt: info.checkedAt,
    updatedAt: new Date().toISOString(),
  };
  await saveVaultData(upsertNip47Connection(vaultData, updatedConnection));
  return { success: true, data: info };
}

export async function handleNip47GetBalance(payload: { connectionId: string }): Promise<HandlerResult<Nip47BalanceResponse>> {
  const vaultData = await requireUnlockedVaultData();
  const connection = findNip47Connection(vaultData, payload.connectionId);
  if (!connection) {
    throw new Error('NIP-47 connection not found');
  }

  const balance = await nip47Client.getBalance(connection);
  return { success: true, data: balance };
}

export async function handleNip47PayInvoice(
  payload: Nip47PayInvoiceRequest,
): Promise<HandlerResult<Nip47PayInvoiceResponse>> {
  const vaultData = await requireUnlockedVaultData();
  const connection = findNip47Connection(vaultData, payload.connectionId);
  if (!connection) {
    throw new Error('NIP-47 connection not found');
  }

  const invoice = payload.invoice.trim();
  if (!invoice) {
    throw new Error('Lightning invoice is required');
  }

  const payment = await nip47Client.payInvoice(connection, invoice);
  return { success: true, data: payment };
}
