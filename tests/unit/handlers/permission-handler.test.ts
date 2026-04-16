import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkPermission, grantPermission, revokePermission, clearPermissionCache, getGrantedPermissions } from 'app/src-bex/handlers/permission-handler';
import { storageService } from 'app/src/services/storage-service';
import type { PermissionGrant } from 'app/src-bex/types/background';

vi.mock('app/src/services/storage-service', () => ({
  storageService: {
    get: vi.fn(),
    set: vi.fn(),
  },
  PERMISSIONS_KEY: 'permissions',
}));

describe('PermissionHandler', () => {
  const mockOrigin = 'https://example.com';
  const mockKind = 1;

  beforeEach(() => {
    vi.clearAllMocks();
    clearPermissionCache();
  });

  it('should grant and check "always" permission', async () => {
    let storedPermissions: PermissionGrant[] = [];
    vi.mocked(storageService).get.mockImplementation(() => Promise.resolve(storedPermissions));
    vi.mocked(storageService).set.mockImplementation((_key, val) => {
      storedPermissions = val as PermissionGrant[];
      return Promise.resolve();
    });

    await grantPermission(mockOrigin, mockKind, 'always');

    const result = await checkPermission(mockOrigin, mockKind);
    expect(result.granted).toBe(true);
    expect(result.always).toBe(true);
    expect(storedPermissions[0]?.expiry).toBeUndefined();
  });

  it('should grant and check "8h" permission', async () => {
    let storedPermissions: PermissionGrant[] = [];
    vi.mocked(storageService).get.mockImplementation(() => Promise.resolve(storedPermissions));
    vi.mocked(storageService).set.mockImplementation((_key, val) => {
      storedPermissions = val as PermissionGrant[];
      return Promise.resolve();
    });

    const now = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(now);

    await grantPermission(mockOrigin, mockKind, '8h');

    const result = await checkPermission(mockOrigin, mockKind);
    expect(result.granted).toBe(true);
    expect(result.always).toBe(false);
    expect(storedPermissions[0]?.expiry).toBe(now + 8 * 60 * 60 * 1000);

    // Advance time past 8 hours
    vi.advanceTimersByTime(8 * 60 * 60 * 1000 + 1);

    const expiredResult = await checkPermission(mockOrigin, mockKind);
    expect(expiredResult.granted).toBe(false);

    vi.useRealTimers();
  });

  it('should replace an existing permission with a new duration', async () => {
    let storedPermissions: PermissionGrant[] = [];
    vi.mocked(storageService).get.mockImplementation(() => Promise.resolve(storedPermissions));
    vi.mocked(storageService).set.mockImplementation((_key, val) => {
      storedPermissions = val as PermissionGrant[];
      return Promise.resolve();
    });

    // First grant "always"
    await grantPermission(mockOrigin, mockKind, 'always');
    expect(storedPermissions[0]?.expiry).toBeUndefined();

    // Now grant "8h"
    const now = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(now);

    await grantPermission(mockOrigin, mockKind, '8h');
    expect(storedPermissions.length).toBe(1);
    expect(storedPermissions[0]?.expiry).toBe(now + 8 * 60 * 60 * 1000);

    vi.useRealTimers();
  });

  it('should handle multiple origins and event kinds separately', async () => {
    let storedPermissions: PermissionGrant[] = [];
    vi.mocked(storageService).get.mockImplementation(() => Promise.resolve(storedPermissions));
    vi.mocked(storageService).set.mockImplementation((_key, val) => {
      storedPermissions = val as PermissionGrant[];
      return Promise.resolve();
    });

    await grantPermission('https://site1.com', 1, 'always');
    await grantPermission('https://site2.com', 1, '8h');
    await grantPermission('https://site1.com', 4, 'always');

    expect(storedPermissions.length).toBe(3);

    const res1 = await checkPermission('https://site1.com', 1);
    expect(res1.granted).toBe(true);
    expect(res1.always).toBe(true);

    const res2 = await checkPermission('https://site2.com', 1);
    expect(res2.granted).toBe(true);
    expect(res2.always).toBe(false);

    const res3 = await checkPermission('https://site1.com', 4);
    expect(res3.granted).toBe(true);
    expect(res3.always).toBe(true);

    const res4 = await checkPermission('https://site1.com', 7); // Not granted
    expect(res4.granted).toBe(false);
  });

  it('should handle wildcard permission (eventKind -1)', async () => {
    let storedPermissions: PermissionGrant[] = [];
    vi.mocked(storageService).get.mockImplementation(() => Promise.resolve(storedPermissions));
    vi.mocked(storageService).set.mockImplementation((_key, val) => {
      storedPermissions = val as PermissionGrant[];
      return Promise.resolve();
    });

    await grantPermission(mockOrigin, -1, 'always');

    const result = await checkPermission(mockOrigin, 99);
    expect(result.granted).toBe(true);
  });

  it('should revoke permission', async () => {
    let storedPermissions: PermissionGrant[] = [{ origin: mockOrigin, eventKind: mockKind, granted: true, timestamp: Date.now() }];
    vi.mocked(storageService).get.mockImplementation(() => Promise.resolve(storedPermissions));
    vi.mocked(storageService).set.mockImplementation((_key, val) => {
      storedPermissions = val as PermissionGrant[];
      return Promise.resolve();
    });

    await revokePermission(mockOrigin, mockKind);

    expect(storedPermissions.length).toBe(0);
    const result = await checkPermission(mockOrigin, mockKind);
    expect(result.granted).toBe(false);
  });

  it('should return all granted permissions via getGrantedPermissions', async () => {
    let storedPermissions: PermissionGrant[] = [];
    vi.mocked(storageService).get.mockImplementation(() => Promise.resolve(storedPermissions));
    vi.mocked(storageService).set.mockImplementation((_key, val) => {
      storedPermissions = val as PermissionGrant[];
      return Promise.resolve();
    });

    await grantPermission('https://site1.com', 1, 'always');
    await grantPermission('https://site2.com', 4, '8h');

    const all = await getGrantedPermissions();
    expect(all.length).toBe(2);
    expect(all.find(p => p.origin === 'https://site1.com')?.eventKind).toBe(1);
    expect(all.find(p => p.origin === 'https://site2.com')?.eventKind).toBe(4);
  });

  it('should respect the permission cache and allow clearing it', async () => {
    const storedPermissions: PermissionGrant[] = [{ origin: mockOrigin, eventKind: mockKind, granted: true, timestamp: Date.now() }];
    vi.mocked(storageService).get.mockResolvedValue(storedPermissions);

    // First call loads from storage
    const firstCall = await getGrantedPermissions();
    expect(firstCall.length).toBe(1);
    expect(vi.mocked(storageService).get.mock.calls.length).toBe(1);

    // Second call should use cache, so storage.get is NOT called again
    const secondCall = await getGrantedPermissions();
    expect(secondCall.length).toBe(1);
    expect(vi.mocked(storageService).get.mock.calls.length).toBe(1);

    // Clearing cache should force a new storage read
    clearPermissionCache();
    const thirdCall = await getGrantedPermissions();
    expect(thirdCall.length).toBe(1);
    expect(vi.mocked(storageService).get.mock.calls.length).toBe(2);
  });
});
