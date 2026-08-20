/**
 * Permission management for Nostr signing and non-signing requests.
 *
 * A grant is keyed by origin, request type, and event kind. The request type is part of the key
 * because it used to be absent: every grant was `(origin, eventKind)`, and `-1` meant "no event
 * kind" at the approval call sites but "any event kind" in the checker. Approving a
 * `get_public_key` request with "always" therefore wrote a record that authorised signing any event
 * kind, with no further prompt (#136).
 */

import { PERMISSIONS_KEY, storageService } from 'src/services/storage-service';
import { LogLevel, logService } from 'src/services/log-service';
import type { PermissionEventKind, PermissionGrant } from '../types/background';

/** Event kinds are non-negative, so this only ever appears in pre-#136 records. */
const LEGACY_AMBIGUOUS_KIND = -1;

const SIGN_EVENT = 'sign_event';

// In-memory cache
let permissionCache: PermissionGrant[] | null = null;

/** A pre-#136 record: no request type, and `eventKind` carrying both meanings. */
interface LegacyPermissionGrant {
  origin: string;
  eventKind: number;
  granted: boolean;
  timestamp: number;
  expiry?: number;
}

const isMigrated = (grant: PermissionGrant | LegacyPermissionGrant): grant is PermissionGrant =>
  typeof (grant as PermissionGrant).requestType === 'string';

/**
 * Bring stored grants onto the keyed shape, narrowing wherever the original scope is ambiguous.
 *
 * A legacy record with a real event kind can only have come from a signing request, so it migrates
 * intact. A legacy `-1` cannot be attributed after the fact — it may have been a non-signing grant
 * or a signing wildcard — so it is discarded rather than guessed at. The user is asked again; no
 * authority is invented (#136).
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

    if (grant.eventKind === LEGACY_AMBIGUOUS_KIND) {
      discarded += 1;
      continue;
    }

    grants.push({
      origin: grant.origin,
      requestType: SIGN_EVENT,
      eventKind: grant.eventKind,
      granted: grant.granted,
      timestamp: grant.timestamp,
      ...(grant.expiry !== undefined ? { expiry: grant.expiry } : {}),
    });
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
    logService.log(LogLevel.WARN, '[Permissions] Discarded ambiguous pre-#136 grants', {
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
  requestType: string,
  eventKind: PermissionEventKind,
): boolean =>
  grant.origin === origin && grant.requestType === requestType && grant.eventKind === eventKind;

export async function checkPermission(
  origin: string,
  requestType: string,
  eventKind: PermissionEventKind,
): Promise<{ granted: boolean; always?: boolean }> {
  const permissions = await loadPermissions();
  const now = Date.now();

  const exactMatch = permissions.find((grant) => sameScope(grant, origin, requestType, eventKind));
  if (exactMatch) {
    return isLive(exactMatch, now) ? { granted: true, always: exactMatch.expiry === undefined } : { granted: false };
  }

  // A wildcard only ever answers a signing request, and only one written as a wildcard on purpose.
  // It can no longer be produced as a side effect of a request that carries no event kind.
  if (requestType !== SIGN_EVENT) return { granted: false };

  const wildcard = permissions.find((grant) => sameScope(grant, origin, SIGN_EVENT, 'any'));
  if (wildcard && isLive(wildcard, now)) {
    return { granted: true, always: wildcard.expiry === undefined };
  }

  return { granted: false };
}

export async function grantPermission(
  origin: string,
  requestType: string,
  // Deliberately narrower than PermissionEventKind: a wildcard must be asked for explicitly on a
  // signing request, and nothing offers that yet, so this path cannot create one (#136).
  eventKind: number | null,
  duration: '8h' | 'always',
): Promise<void> {
  if (duration !== '8h' && duration !== 'always') {
    throw new Error(`Unsupported permission duration: ${String(duration)}`);
  }

  const permissions = await loadPermissions();
  const filtered = permissions.filter(
    (grant) => !sameScope(grant, origin, requestType, eventKind),
  );

  const grant: PermissionGrant = {
    origin,
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
  requestType: string,
  eventKind: PermissionEventKind,
): Promise<void> {
  const permissions = await loadPermissions();
  await savePermissions(
    permissions.filter((grant) => !sameScope(grant, origin, requestType, eventKind)),
  );
}

export async function getGrantedPermissions(): Promise<PermissionGrant[]> {
  return loadPermissions();
}

export function clearPermissionCache(): void {
  permissionCache = null;
}
