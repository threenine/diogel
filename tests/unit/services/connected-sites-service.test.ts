import { describe, it, expect, vi, beforeEach } from 'vitest';

const { sendBexMessage } = vi.hoisted(() => ({ sendBexMessage: vi.fn() }));

vi.mock('src/services/bridge-client', () => ({ sendBexMessage }));

import { disconnectSite, listConnectedSites } from 'src/services/connected-sites-service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('reading connected sites from the background', () => {
  it('asks the background rather than caching', async () => {
    // A cached list would show a user authority that has already been revoked.
    sendBexMessage.mockResolvedValue([{ origin: 'https://example.com' }]);

    await listConnectedSites();
    await listConnectedSites();

    expect(sendBexMessage).toHaveBeenCalledTimes(2);
    expect(sendBexMessage).toHaveBeenCalledWith('sites.list');
  });

  it('reports nothing rather than undefined when the background has no answer', async () => {
    sendBexMessage.mockResolvedValue(undefined);

    await expect(listConnectedSites()).resolves.toEqual([]);
  });
});

describe('disconnecting through the background', () => {
  it('names the origin', async () => {
    sendBexMessage.mockResolvedValue(true);

    await expect(disconnectSite('https://example.com')).resolves.toBe(true);
    expect(sendBexMessage).toHaveBeenCalledWith('sites.revoke', {
      origin: 'https://example.com',
    });
  });

  it('reports failure rather than assuming success', async () => {
    sendBexMessage.mockResolvedValue(undefined);

    await expect(disconnectSite('https://example.com')).resolves.toBe(false);
  });
});
