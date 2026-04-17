/**
 * NIP-07 method handlers
 */

import type { HandlerResult, UnsignedEvent, SignedEvent } from '../types/background';
import type { StoredKey } from 'src/types';
import type { VaultData } from 'src/types/bridge';
import { finalizeEvent } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';
import { isVaultUnlocked, getVaultData } from '../vault';
import { NOSTR_ACTIVE, storageService } from 'src/services/storage-service';
import { checkPermission } from './permission-handler';
import { resetAutoLockTimer } from '../services/auto-lock';
import { logService } from 'src/services/log-service';
import { ErrorCode } from 'src/types/error-codes';

const logWrapper = <Args extends unknown[], R>(fn: (...args: Args) => Promise<R>, name: string) =>
  logService.wrapWithLogging(fn, 'Nip07Handler', name);

async function getActiveAccount(): Promise<StoredKey | null> {
  const alias = await storageService.get<string>(NOSTR_ACTIVE);

  if (!alias) return null;

  const vaultDataRes = await getVaultData();
  if (!vaultDataRes.success || !vaultDataRes.vaultData) return null;

  const data = vaultDataRes.vaultData as VaultData;
  return data.accounts?.find((acc) => acc.alias === alias) || null;
}

export const handleGetPublicKey = logWrapper(async (
  _payload: unknown,
  _origin: string
): Promise<HandlerResult<string>> => {
  if (!isVaultUnlocked()) {
    return { success: false, error: 'Vault is locked', code: ErrorCode.VLT_LOCKED as string };
  }

  const account = await getActiveAccount();
  if (!account) {
    return { success: false, error: 'No active account', code: ErrorCode.SIG_NO_ACTIVE_KEY as string };
  }

  // Reset auto-lock timer on activity
  resetAutoLockTimer();

  return { success: true, data: account.id };
}, 'getPublicKey');

export const handleSignEvent = logWrapper(async (
  payload: { event: UnsignedEvent },
  origin: string
): Promise<HandlerResult<SignedEvent>> => {
  // Check vault
  if (!isVaultUnlocked()) {
    return { success: false, error: 'Vault is locked', code: ErrorCode.VLT_LOCKED as string };
  }

  // Check permission
  const permission = await checkPermission(origin, payload.event.kind);
  if (!permission.granted) {
    return { success: false, error: 'Permission denied', code: ErrorCode.PER_DENIED as string };
  }

  // Get active account (includes privkey)
  const account = await getActiveAccount();
  if (!account) {
    return { success: false, error: 'No active account', code: ErrorCode.SIG_NO_ACTIVE_KEY as string };
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
    const message = error instanceof Error ? error.message : 'Failed to sign event';
    return { success: false, error: message, code: ErrorCode.SIG_FAILED as string };
  }
}, 'signEvent');
