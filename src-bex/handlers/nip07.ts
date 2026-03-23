/**
 * NIP-07 method handlers
 */

import type { HandlerResult } from '../types/background';
import type { StoredKey } from 'src/types';
import { isVaultUnlocked, getVaultData } from '../vault';
import { resetAutoLockTimer } from '../services/auto-lock';

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
