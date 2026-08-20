/**
 * Permission management for Nostr signing and non-signing requests.
 *
 * A grant is keyed by origin, account, request type, and event kind.
 *
 * The request type is part of the key because it used to be absent: every grant was
 * `(origin, eventKind)`, and `-1` meant "no event kind" at the approval call sites but "any event
 * kind" in the checker, so approving a `get_public_key` request with "always" wrote a record that
 * authorised signing any event kind (#136).
 *
 * The account is part of the key because a grant belongs to the identity the user was looking at
 * when they gave it. Without it, connecting a second account to a site inherited the first
 * account's permissions (#116).
 */

import { PERMISSIONS_KEY, storageService } from 'src/services/storage-service';
import { LogLevel, logService } from 'src/services/log-service';
import type { PermissionEventKind, PermissionGrant } from '../types/background';

const SIGN_EVENT = 'sign_event';

// In-memory cache
let permissionCache: PermissionGrant[] | null = null;

/** Anything written before the current shape: missing a request type, an account, or both. */
interface LegacyPermissionGrant {
  origin: string;
  eventKind: number | PermissionEventKind;
  requestType?: string;
  accountPubkey?: string;
  granted: boolean;
  timestamp: number;
  expiry?: number;
}

const isMigrated = (grant: PermissionGrant | LegacyPermissionGrant): grant is PermissionGrant =>
  typeof (grant as PermissionGrant).requestType === 'string' &&
  typeof (grant as PermissionGrant).accountPubkey === 'string';

/**
 * Bring stored grants onto the keyed shape, discarding whatever cannot be attributed.
 *
 * Every record written before the account dimension existed is ambiguous in the same way: it does
 * not say which identity the user was granting for. A vault with several accounts gives no way to
 * tell, and a vault with one today may have had others yesterday. Guessing would hand one identity
 * the authority another was given, which is the defect this dimension exists to prevent.
 *
 * So they are discarded. The user is asked again the next time a site requests something, and the
 * new grant records the account. Nothing is broadened, and no authority is invented (#116, SR-6).
 */
const migrateGrants = (
  stored: Array<PermissionGrant | LegacyPermissionGrant>,
): { grants: PermissionGrant[]; discarded: number } => {
  const grants: PermissionGrant[] = [];
  let discarded = 0;

  for (const grant of stored) {
    if (isMigrated(grant)) {
      grants.push(grant);
      continue;
    }

    discarded += 1;
  }

  return { grants, discarded };
};

async function loadPermissions(): Promise<PermissionGrant[]> {
  if (permissionCache) {
    return permissionCache;
  }

  const stored =
    (await storageService.get<Array<PermissionGrant | LegacyPermissionGrant>>(PERMISSIONS_KEY)) ||
    [];
  const { grants, discarded } = migrateGrants(stored);

  if (discarded > 0 || grants.length !== stored.length) {
    logService.log(LogLevel.WARN, '[Permissions] Discarded grants that name no account', {
      discarded,
    });
    permissionCache = grants;
    await storageService.set(PERMISSIONS_KEY, grants);
    return grants;
  }

  permissionCache = grants;
  return grants;
}

async function savePermissions(permissions: PermissionGrant[]): Promise<void> {
  permissionCache = permissions;
  await storageService.set(PERMISSIONS_KEY, permissions);
}

const isLive = (grant: PermissionGrant, now: number): boolean =>
  grant.granted && (grant.expiry === undefined || grant.expiry > now);

const sameScope = (
  grant: PermissionGrant,
  origin: string,
  accountPubkey: string,
  requestType: string,
  eventKind: PermissionEventKind,
): boolean =>
  grant.origin === origin &&
  grant.accountPubkey === accountPubkey &&
  grant.requestType === requestType &&
  grant.eventKind === eventKind;

export async function checkPermission(
  origin: string,
  accountPubkey: string,
  requestType: string,
  eventKind: PermissionEventKind,
): Promise<{ granted: boolean; always?: boolean }> {
  // No account means nothing to check against. Matching "any account" here would reintroduce the
  // inheritance this dimension removes.
  if (!accountPubkey) return { granted: false };

  const permissions = await loadPermissions();
  const now = Date.now();

  const exactMatch = permissions.find((grant) =>
    sameScope(grant, origin, accountPubkey, requestType, eventKind),
  );
  if (exactMatch) {
    return isLive(exactMatch, now) ? { granted: true, always: exactMatch.expiry === undefined } : { granted: false };
  }

  // A wildcard only ever answers a signing request, and only one written as a wildcard on purpose.
  // It can no longer be produced as a side effect of a request that carries no event kind.
  if (requestType !== SIGN_EVENT) return { granted: false };

  const wildcard = permissions.find((grant) =>
    sameScope(grant, origin, accountPubkey, SIGN_EVENT, 'any'),
  );
  if (wildcard && isLive(wildcard, now)) {
    return { granted: true, always: wildcard.expiry === undefined };
  }

  return { granted: false };
}

export async function grantPermission(
  origin: string,
  accountPubkey: string,
  requestType: string,
  // Deliberately narrower than PermissionEventKind: a wildcard must be asked for explicitly on a
  // signing request, and nothing offers that yet, so this path cannot create one (#136).
  eventKind: number | null,
  duration: '8h' | 'always',
): Promise<void> {
  if (duration !== '8h' && duration !== 'always') {
    throw new Error(`Unsupported permission duration: ${String(duration)}`);
  }

  if (!accountPubkey) {
    throw new Error('A permission grant must name the account it was given to');
  }

  const permissions = await loadPermissions();
  const filtered = permissions.filter(
    (grant) => !sameScope(grant, origin, accountPubkey, requestType, eventKind),
  );

  const grant: PermissionGrant = {
    origin,
    accountPubkey,
    requestType,
    eventKind,
    granted: true,
    timestamp: Date.now(),
    ...(duration === '8h' ? { expiry: Date.now() + 8 * 60 * 60 * 1000 } : {}),
  };

  await savePermissions([...filtered, grant]);
}

export async function revokePermission(
  origin: string,
  accountPubkey: string,
  requestType: string,
  eventKind: PermissionEventKind,
): Promise<void> {
  const permissions = await loadPermissions();
  await savePermissions(
    permissions.filter((grant) => !sameScope(grant, origin, accountPubkey, requestType, eventKind)),
  );
}

/** Every grant for one origin, whichever account holds it. For the Connected Sites view. */
export async function getGrantsForOrigin(origin: string): Promise<PermissionGrant[]> {
  const permissions = await loadPermissions();
  return permissions.filter((grant) => grant.origin === origin);
}

/** Drops every grant an account holds, for when that account is removed or disconnected. */
export async function revokeGrantsForAccount(accountPubkey: string): Promise<number> {
  const permissions = await loadPermissions();
  const remaining = permissions.filter((grant) => grant.accountPubkey !== accountPubkey);

  if (remaining.length !== permissions.length) await savePermissions(remaining);
  return permissions.length - remaining.length;
}

export async function getGrantedPermissions(): Promise<PermissionGrant[]> {
  return loadPermissions();
}

export function clearPermissionCache(): void {
  permissionCache = null;
}
