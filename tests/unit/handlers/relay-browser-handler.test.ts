import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleRelayBrowserList, handleRelayBrowserGetStatus } from 'app/src-bex/handlers/relay-browser-handler';
import { relayCatalogService } from 'src/services/relay-catalog';
import { db } from 'src/services/database';

// Mock dependencies
vi.mock('src/services/relay-catalog', () => ({
  relayCatalogService: {
    getEntries: vi.fn(),
    getDiscoveryState: vi.fn(),
  },
}));

vi.mock('src/services/database', () => ({
  db: {
    relayDiscoveryState: {
      get: vi.fn(),
    },
  },
}));

describe('RelayBrowserHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleRelayBrowserList', () => {
    it('should return cached relay entries successfully', async () => {
      const mockEntries = [
        { url: 'wss://relay1.com', hostname: 'relay1.com', status: 'online' },
        { url: 'wss://relay2.com', hostname: 'relay2.com', status: 'offline' },
      ];
      vi.mocked(relayCatalogService.getEntries).mockResolvedValue(mockEntries as any);

      const result = await handleRelayBrowserList();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockEntries);
      }
      expect(relayCatalogService.getEntries).toHaveBeenCalled();
    });

    it('should return failure when service throws an error', async () => {
      vi.mocked(relayCatalogService.getEntries).mockRejectedValue(new Error('Database error'));

      const result = await handleRelayBrowserList();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Database error');
      }
    });
  });

  describe('handleRelayBrowserGetStatus', () => {
    it('should return discovery status successfully', async () => {
      const mockStatus = {
        id: 'global',
        lastGlobalDiscoveryAt: 123456789,
        isDiscoveryInProgress: false,
        updatedAt: 123456789,
      };
      vi.mocked(relayCatalogService.getDiscoveryState).mockResolvedValue(mockStatus as any);

      const result = await handleRelayBrowserGetStatus();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockStatus);
      }
      expect(relayCatalogService.getDiscoveryState).toHaveBeenCalledWith('global');
    });

    it('should return null when no status exists in database', async () => {
      vi.mocked(relayCatalogService.getDiscoveryState).mockResolvedValue(null);

      const result = await handleRelayBrowserGetStatus();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it('should return failure when database access fails', async () => {
      vi.mocked(relayCatalogService.getDiscoveryState).mockRejectedValue(new Error('Read error'));

      const result = await handleRelayBrowserGetStatus();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Read error');
      }
    });
  });
});
