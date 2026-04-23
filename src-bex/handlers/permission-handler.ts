/**
 * Permission management for Nostr event signing
 */

import { PERMISSIONS_KEY, storageService } from 'src/services/storage-service';
import type { PermissionGrant } from '../types/background';

const PERMISSION_ALWAYS = -1;

// In-memory cache
let permissionCache: PermissionGrant[] | null = null;

async function loadPermissions(): Promise<PermissionGrant[]> {
  if (permissionCache) {
    return permissionCache;
  }

  const permissions = (await storageService.get<PermissionGrant[]>(PERMISSIONS_KEY)) || [];
  permissionCache = permissions;
  return permissions;
}

async function savePermissions(permissions: PermissionGrant[]): Promise<void> {
  permissionCache = permissions;
  await storageService.set(PERMISSIONS_KEY, permissions);
}

export async function checkPermission(
  origin: string,
  eventKind: number,
): Promise<{ granted: boolean; always?: boolean }> {
  const permissions = await loadPermissions();

  const exactMatch = permissions.find(
    (permission) => permission.origin === origin && permission.eventKind === eventKind,
  );

  if (exactMatch) {
    if (exactMatch.expiry && exactMatch.expiry < Date.now()) {
      return { granted: false };
    }

    return {
      granted: true,
      always: !exactMatch.expiry,
    };
  }

  const wildcardMatch = permissions.find(
    (permission) => permission.origin === origin && permission.eventKind === PERMISSION_ALWAYS,
  );

  if (wildcardMatch) {
    return { granted: true, always: !wildcardMatch.expiry };
  }

  return { granted: false };
}

export async function grantPermission(
  origin: string,
  eventKind: number,
  duration: '8h' | 'always',
): Promise<void> {
  const permissions = await loadPermissions();

  const filtered = permissions.filter(
    (permission) => !(permission.origin === origin && permission.eventKind === eventKind),
  );

  const grant: PermissionGrant = {
    origin,
    eventKind,
    granted: true,
    timestamp: Date.now(),
  };

  if (duration === '8h') {
    grant.expiry = Date.now() + 8 * 60 * 60 * 1000;
  } else if (duration !== 'always') {
    throw new Error(`Unsupported permission duration: ${String(duration)}`);
  }

  await savePermissions([...filtered, grant]);
}

export async function revokePermission(
  origin: string,
  eventKind: number,
): Promise<void> {
  const permissions = await loadPermissions();
  const filtered = permissions.filter(
    (permission) => !(permission.origin === origin && permission.eventKind === eventKind),
  );
  await savePermissions(filtered);
}

export async function getGrantedPermissions(): Promise<PermissionGrant[]> {
  return loadPermissions();
}

export function clearPermissionCache(): void {
  permissionCache = null;
}
