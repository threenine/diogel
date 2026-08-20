import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  checkPermission,
  clearPermissionCache,
  getGrantedPermissions,
  grantPermission,
  revokePermission,
} from 'app/src-bex/handlers/permission-handler';
import { storageService } from 'app/src/services/storage-service';
import type { PermissionGrant } from 'app/src-bex/types/background';

vi.mock('app/src/services/storage-service', () => ({
  storageService: { get: vi.fn(), set: vi.fn() },
  PERMISSIONS_KEY: 'permissions',
}));

vi.mock('src/services/log-service', () => ({
  LogLevel: { WARN: 'warn' },
  logService: { log: vi.fn() },
}));

const ORIGIN = 'https://example.com';

/** A pre-#136 record: no request type, and `eventKind` carrying both meanings. */
interface LegacyGrant {
  origin: string;
  eventKind: number;
  granted: boolean;
  timestamp: number;
  expiry?: number;
}

let stored: Array<PermissionGrant | LegacyGrant> = [];

const seed = (records: Array<PermissionGrant | LegacyGrant>): void => {
  stored = records;
};

beforeEach(() => {
  vi.clearAllMocks();
  clearPermissionCache();
  stored = [];
  vi.mocked(storageService).get.mockImplementation(() => Promise.resolve(stored));
  vi.mocked(storageService).set.mockImplementation((_key, value) => {
    stored = value as PermissionGrant[];
    return Promise.resolve();
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('permission grants', () => {
  describe('duration', () => {
    it('grants without expiry for "always"', async () => {
      await grantPermission(ORIGIN, 'sign_event', 1, 'always');

      const result = await checkPermission(ORIGIN, 'sign_event', 1);
      expect(result).toEqual({ granted: true, always: true });
      expect(stored[0]?.expiry).toBeUndefined();
    });

    it('grants with an expiry for "8h", and stops granting once it passes', async () => {
      const now = Date.now();
      vi.useFakeTimers();
      vi.setSystemTime(now);

      await grantPermission(ORIGIN, 'sign_event', 1, '8h');
      expect(await checkPermission(ORIGIN, 'sign_event', 1)).toEqual({
        granted: true,
        always: false,
      });
      expect(stored[0]?.expiry).toBe(now + 8 * 60 * 60 * 1000);

      vi.advanceTimersByTime(8 * 60 * 60 * 1000 + 1);
      expect(await checkPermission(ORIGIN, 'sign_event', 1)).toEqual({ granted: false });
    });

    it('refuses a duration it does not model', async () => {
      await expect(
        grantPermission(ORIGIN, 'sign_event', 1, 'forever' as '8h'),
      ).rejects.toThrow(/Unsupported permission duration/);
    });
  });

  /**
   * The defect #136 exists for.
   *
   * `-1` meant "this request has no event kind" at the approval call sites and "any event kind" in
   * the checker, so approving a `get_public_key` request with "always" wrote a record that
   * authorised signing anything.
   */
  describe('key spaces (#136)', () => {
    it('does not let a public-key grant authorise signing', async () => {
      await grantPermission(ORIGIN, 'get_public_key', null, 'always');

      expect(await checkPermission(ORIGIN, 'sign_event', 1)).toEqual({ granted: false });
    });

    it('does not let a signing grant authorise a different request type', async () => {
      await grantPermission(ORIGIN, 'sign_event', 1, 'always');

      expect(await checkPermission(ORIGIN, 'nip04_decrypt', null)).toEqual({ granted: false });
    });

    it('keeps each kindless request type separate from the others', async () => {
      await grantPermission(ORIGIN, 'nip04_decrypt', null, 'always');

      expect(await checkPermission(ORIGIN, 'nip44_decrypt', null)).toEqual({ granted: false });
      expect(await checkPermission(ORIGIN, 'nip04_decrypt', null)).toEqual({
        granted: true,
        always: true,
      });
    });

    it('keeps each event kind separate', async () => {
      await grantPermission(ORIGIN, 'sign_event', 1, 'always');

      expect(await checkPermission(ORIGIN, 'sign_event', 5)).toEqual({ granted: false });
    });

    it('keeps each origin separate', async () => {
      await grantPermission(ORIGIN, 'sign_event', 1, 'always');

      expect(await checkPermission('https://other.example', 'sign_event', 1)).toEqual({
        granted: false,
      });
    });
  });

  /**
   * The wildcard match is intentional and kept. What changed is that nothing can produce one as a
   * side effect: it must be written as a wildcard on a signing request, and no path offers that yet.
   */
  describe('the signing wildcard', () => {
    it('answers any kind for the same origin when one exists', async () => {
      seed([
        { origin: ORIGIN, requestType: 'sign_event', eventKind: 'any', granted: true, timestamp: 1 },
      ]);

      expect(await checkPermission(ORIGIN, 'sign_event', 30023)).toEqual({
        granted: true,
        always: true,
      });
    });

    it('answers only signing, never another request type', async () => {
      seed([
        { origin: ORIGIN, requestType: 'sign_event', eventKind: 'any', granted: true, timestamp: 1 },
      ]);

      expect(await checkPermission(ORIGIN, 'get_public_key', null)).toEqual({ granted: false });
    });

    it('cannot be created through grantPermission', async () => {
      await grantPermission(ORIGIN, 'sign_event', null, 'always');

      // null is "this request carries no kind", not a wildcard, so signing stays unauthorised.
      expect(await checkPermission(ORIGIN, 'sign_event', 1)).toEqual({ granted: false });
      expect(stored.every((grant) => grant.eventKind !== 'any')).toBe(true);
    });
  });

  describe('migrating 0.0.32 records', () => {
    it('keeps a legacy grant that names a real event kind, as signing', async () => {
      seed([{ origin: ORIGIN, eventKind: 1, granted: true, timestamp: 1 }]);

      expect(await checkPermission(ORIGIN, 'sign_event', 1)).toEqual({ granted: true, always: true });
    });

    it('discards a legacy -1, which cannot be attributed after the fact', async () => {
      seed([{ origin: ORIGIN, eventKind: -1, granted: true, timestamp: 1 }]);

      // It may have been a non-signing grant or a signing wildcard. Neither is assumed.
      expect(await checkPermission(ORIGIN, 'sign_event', 1)).toEqual({ granted: false });
      expect(await checkPermission(ORIGIN, 'get_public_key', null)).toEqual({ granted: false });
      expect(await getGrantedPermissions()).toEqual([]);
    });

    it('broadens nothing: a legacy kind grant still answers only that kind', async () => {
      seed([{ origin: ORIGIN, eventKind: 1, granted: true, timestamp: 1 }]);

      expect(await checkPermission(ORIGIN, 'sign_event', 5)).toEqual({ granted: false });
    });

    it('preserves a legacy expiry', async () => {
      const expiry = Date.now() + 60_000;
      seed([{ origin: ORIGIN, eventKind: 1, granted: true, timestamp: 1, expiry }]);

      const [grant] = await getGrantedPermissions();
      expect(grant?.expiry).toBe(expiry);
      expect(await checkPermission(ORIGIN, 'sign_event', 1)).toEqual({ granted: true, always: false });
    });

    it('writes the migrated shape back, so the discard is not re-done on every read', async () => {
      seed([
        { origin: ORIGIN, eventKind: 1, granted: true, timestamp: 1 },
        { origin: ORIGIN, eventKind: -1, granted: true, timestamp: 1 },
      ]);

      await getGrantedPermissions();

      expect(vi.mocked(storageService).set).toHaveBeenCalled();
      expect(stored).toHaveLength(1);
      expect(stored[0]).toMatchObject({ requestType: 'sign_event', eventKind: 1 });
    });

    it('leaves already-migrated records alone', async () => {
      seed([
        { origin: ORIGIN, requestType: 'sign_event', eventKind: 1, granted: true, timestamp: 1 },
      ]);

      await getGrantedPermissions();

      expect(vi.mocked(storageService).set).not.toHaveBeenCalled();
    });
  });

  describe('revoking', () => {
    it('removes only the scope named', async () => {
      await grantPermission(ORIGIN, 'sign_event', 1, 'always');
      await grantPermission(ORIGIN, 'get_public_key', null, 'always');

      await revokePermission(ORIGIN, 'sign_event', 1);

      expect(await checkPermission(ORIGIN, 'sign_event', 1)).toEqual({ granted: false });
      expect(await checkPermission(ORIGIN, 'get_public_key', null)).toEqual({
        granted: true,
        always: true,
      });
    });
  });

  describe('listing', () => {
    it('returns every live grant', async () => {
      await grantPermission('https://site1.example', 'sign_event', 1, 'always');
      await grantPermission('https://site2.example', 'sign_event', 4, '8h');

      const all = await getGrantedPermissions();

      expect(all).toHaveLength(2);
      expect(all.map((grant) => grant.origin).sort()).toEqual([
        'https://site1.example',
        'https://site2.example',
      ]);
    });
  });

  describe('caching', () => {
    it('reads storage once until the cache is cleared', async () => {
      seed([
        { origin: ORIGIN, requestType: 'sign_event', eventKind: 1, granted: true, timestamp: 1 },
      ]);

      await getGrantedPermissions();
      await getGrantedPermissions();
      expect(vi.mocked(storageService).get).toHaveBeenCalledTimes(1);

      clearPermissionCache();
      await getGrantedPermissions();
      expect(vi.mocked(storageService).get).toHaveBeenCalledTimes(2);
    });
  });
});
