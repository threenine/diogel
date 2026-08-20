/**
 * NIP-07 method handlers
 */

import type { HandlerResult, UnsignedEvent, SignedEvent } from '../types/background';
import { finalizeEvent } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';
import { isVaultUnlocked } from '../vault';
import { checkPermission } from './permission-handler';
import { resolveSigningAccount } from '../services/signing-account';
import { logService } from 'src/services/log-service';
import { ErrorCode } from 'src/types/error-codes.d';

const logWrapper = <TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  name: string,
) => logService.wrapWithLogging(fn, 'Nip07Handler', name);

export const handleGetPublicKey = logWrapper(async (
  _payload: unknown,
  origin: string
): Promise<HandlerResult<string>> => {
  void _payload;
  if (!isVaultUnlocked()) {
    return { success: false, error: 'Vault is locked', code: ErrorCode.VLT_LOCKED };
  }

  // This is where a site's identity is established, and the answer a client will cache.
  const resolved = await resolveSigningAccount(origin);
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
  const resolved = await resolveSigningAccount(origin);
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
