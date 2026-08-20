import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('src/services/log-service', () => ({
  LogLevel: { DEBUG: 'debug' },
  logService: { log: vi.fn() },
}));

import { PANEL_PORT_NAME, connectPanelPort } from 'src/services/panel-port';

const connect = vi.fn();
const disconnect = vi.fn();

const makePort = () => {
  const handlers: Array<() => void> = [];
  return {
    port: {
      name: PANEL_PORT_NAME,
      disconnect,
      onDisconnect: { addListener: (fn: () => void) => handlers.push(fn) },
    },
    drop: () => handlers.forEach((fn) => fn()),
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.stubGlobal('chrome', { runtime: { connect } });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('panel presence port', () => {
  it('opens one named connection', () => {
    connect.mockReturnValue(makePort().port);

    connectPanelPort();

    expect(connect).toHaveBeenCalledWith({ name: PANEL_PORT_NAME });
  });

  it('reconnects when the worker suspends underneath it', () => {
    const first = makePort();
    connect.mockReturnValueOnce(first.port).mockReturnValue(makePort().port);
    const onReconnect = vi.fn();

    connectPanelPort({ onReconnect });
    expect(onReconnect).not.toHaveBeenCalled();

    // A suspended service worker drops the port without the panel having gone anywhere.
    first.drop();
    vi.advanceTimersByTime(500);

    expect(connect).toHaveBeenCalledTimes(2);
    // The worker may have reconciled the queue while it was away, so the caller must re-read.
    expect(onReconnect).toHaveBeenCalledTimes(1);
  });

  it('stops reconnecting once the panel disconnects deliberately', () => {
    const first = makePort();
    connect.mockReturnValue(first.port);

    const handle = connectPanelPort();
    handle.disconnect();

    expect(disconnect).toHaveBeenCalledTimes(1);

    first.drop();
    vi.advanceTimersByTime(2000);
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('retries when the connection cannot be opened at all', () => {
    connect.mockImplementationOnce(() => {
      throw new Error('receiving end does not exist');
    });
    connect.mockReturnValue(makePort().port);

    connectPanelPort();
    expect(connect).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(500);
    expect(connect).toHaveBeenCalledTimes(2);
  });

  it('gives up quietly where there is no extension API to connect to', () => {
    vi.stubGlobal('chrome', undefined);

    expect(() => connectPanelPort()).not.toThrow();

    vi.advanceTimersByTime(5000);
    expect(connect).not.toHaveBeenCalled();
  });
});
