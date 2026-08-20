/**
 * NIP-07 method handlers
 */

import type { HandlerResult, UnsignedEvent, SignedEvent } from '../types/background';
import type { StoredKey } from 'src/types';
import { finalizeEvent } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';
import { isVaultUnlocked, getVaultData } from '../vault';
import { NOSTR_ACTIVE, storageService } from 'src/services/storage-service';
import { checkPermission } from './permission-handler';
import { bindOriginIfUnbound, getBinding } from '../services/site-binding-store';
import { logService } from 'src/services/log-service';
import { ErrorCode } from 'src/types/error-codes.d';

const logWrapper = <TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  name: string,
) => logService.wrapWithLogging(fn, 'Nip07Handler', name);

async function listAccounts(): Promise<StoredKey[]> {
  const vaultDataRes = await getVaultData();
  if (!vaultDataRes.success || !vaultDataRes.vaultData) return [];

  const data = vaultDataRes.vaultData as { accounts?: StoredKey[] };
  return data.accounts ?? [];
}

async function getActiveAccount(): Promise<StoredKey | null> {
  const alias = await storageService.get<string>(NOSTR_ACTIVE);

  if (!alias) return null;

  const accounts = await listAccounts();
  return accounts.find((acc) => acc.alias === alias) || null;
}

/**
 * The account a site signs as.
 *
 * Bound accounts only: a site keeps the identity it was bound to, whatever is active now (#116). A
 * client caches the public key it received at login and assumes every later signature comes from
 * it, so following the active account would silently make that untrue.
 *
 * An unbound site binds to the active account here, because the first request has to establish it
 * somehow. Everything after that is fixed.
 */
async function getSigningAccount(origin: string): Promise<
  { account: StoredKey } | { error: string; code: ErrorCode }
> {
  const accounts = await listAccounts();
  const binding = await getBinding(origin);

  if (binding) {
    const bound = accounts.find((acc) => acc.id === binding.pubkey);
    if (bound) return { account: bound };

    // Fail closed. Falling back to the active account is exactly the substitution this prevents.
    return {
      error: 'The account this site is connected to is no longer available',
      code: ErrorCode.SIG_NO_ACTIVE_KEY,
    };
  }

  const active = await getActiveAccount();
  if (!active) return { error: 'No active account', code: ErrorCode.SIG_NO_ACTIVE_KEY };

  await bindOriginIfUnbound(origin, active.id);
  return { account: active };
}

export const handleGetPublicKey = logWrapper(async (
  _payload: unknown,
  origin: string
): Promise<HandlerResult<string>> => {
  void _payload;
  if (!isVaultUnlocked()) {
    return { success: false, error: 'Vault is locked', code: ErrorCode.VLT_LOCKED };
  }

  // This is where a site's identity is established, and the answer a client will cache.
  const resolved = await getSigningAccount(origin);
  if ('error' in resolved) {
    return { success: false, error: resolved.error, code: resolved.code };
  }

  return { success: true, data: resolved.account.id };
}, 'getPublicKey');

export const handleSignEvent = logWrapper(async (
  payload: { event: UnsignedEvent },
  origin: string,
  options: { skipPermissionCheck?: boolean } = {},
): Promise<HandlerResult<SignedEvent>> => {
  // Check vault
  if (!isVaultUnlocked()) {
    return { success: false, error: 'Vault is locked', code: ErrorCode.VLT_LOCKED };
  }

  // Check permission
  if (!options.skipPermissionCheck) {
    // Signing is its own key space: a grant from a request that carries no event kind can never
    // answer this check (#136).
    const permission = await checkPermission(origin, 'sign_event', payload.event.kind);
    if (!permission.granted) {
      return { success: false, error: 'Permission denied', code: ErrorCode.PER_DENIED };
    }
  }

  // The site's bound account, not the active one: a signature must come from the identity the site
  // was given at login (#116).
  const resolved = await getSigningAccount(origin);
  if ('error' in resolved) {
    return { success: false, error: resolved.error, code: resolved.code };
  }
  const account = resolved.account;

  try {
    // Set the correct pubkey
    payload.event.pubkey = account.id;

    // Sign
    const sk = hexToBytes(account.account.privkey);
    const signed = finalizeEvent(payload.event, sk);


    return { success: true, data: signed };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to sign event';
    return { success: false, error: message, code: ErrorCode.SIG_FAILED };
  }
}, 'signEvent');
