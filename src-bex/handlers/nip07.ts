/**
 * NIP-07 method handlers
 */

import type { HandlerResult, UnsignedEvent, SignedEvent } from '../types/background';
import type { StoredKey } from 'src/types';
import { finalizeEvent } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';
import { isVaultUnlocked, getVaultData } from '../vault';
import { resetAutoLockTimer } from '../services/auto-lock';
import { checkPermission } from './permission-handler';

const NOSTR_ACTIVE = 'nostr:active';

async function getActiveAccount() {
  const items = await chrome.storage.local.get([NOSTR_ACTIVE]);
  const alias = items[NOSTR_ACTIVE];

  if (!alias) return null;

  const vaultDataRes = await getVaultData();
  if (!vaultDataRes.success || !vaultDataRes.vaultData) return null;

  const data = vaultDataRes.vaultData as { accounts?: StoredKey[] };
  return data.accounts?.find(acc => acc.alias === alias) || null;
}

export async function handleGetPublicKey(
  _payload: unknown,
  origin: string
): Promise<HandlerResult<string>> {
  if (!isVaultUnlocked()) {
    return { success: false, error: 'Vault is locked' };
  }

  const account = await getActiveAccount();
  if (!account) {
    return { success: false, error: 'No active account' };
  }

  // Reset auto-lock timer on activity
  resetAutoLockTimer();

  return { success: true, data: account.id };
}

export async function handleSignEvent(
  payload: { event: UnsignedEvent },
  origin: string
): Promise<HandlerResult<SignedEvent>> {
  // Check vault
  if (!isVaultUnlocked()) {
    return { success: false, error: 'Vault is locked' };
  }

  // Check permission
  const permission = await checkPermission(origin, payload.event.kind);
  if (!permission.granted) {
    return { success: false, error: 'Permission denied' };
  }

  // Get active account (includes privkey)
  const account = await getActiveAccount();
  if (!account) {
    return { success: false, error: 'No active account' };
  }

  try {
    // Set the correct pubkey
    payload.event.pubkey = account.id;

    // Sign
    const sk = hexToBytes(account.account.privkey);
    const signed = finalizeEvent(payload.event, sk);

    // Reset auto-lock timer
    resetAutoLockTimer();

    return { success: true, data: signed as SignedEvent };
  } catch (error) {
    console.error('Sign event error:', error);
    return { success: false, error: 'Failed to sign event' };
  }
}
