import { describe, it, expect, vi, beforeEach } from 'vitest';

const { requeuePresented } = vi.hoisted(() => ({ requeuePresented: vi.fn(async () => undefined) }));

vi.mock('app/src-bex/services/request-queue', () => ({ requeuePresented }));
vi.mock('src/services/log-service', () => ({
  LogLevel: { ERROR: 'error' },
  logService: { log: vi.fn() },
}));

import {
  PANEL_PORT_NAME,
  __resetPanelPresenceForTests,
  getPanelCount,
  isPanelPresent,
  observePanelConnections,
  onPanelPresenceChange,
} from 'app/src-bex/services/panel-presence';

type Connect = (port: chrome.runtime.Port) => void;

const addListener = vi.fn();

const openPort = (
  connect: Connect,
  over: Partial<chrome.runtime.Port> = {},
): { port: chrome.runtime.Port; disconnect: () => void } => {
  const handlers: Array<() => void> = [];
  const port = {
    name: PANEL_PORT_NAME,
    onDisconnect: { addListener: (fn: () => void) => handlers.push(fn) },
    ...over,
  } as unknown as chrome.runtime.Port;

  connect(port);
  return { port, disconnect: () => handlers.forEach((fn) => fn()) };
};

const startObserving = (): Connect => {
  observePanelConnections();
  return addListener.mock.calls.at(-1)?.[0] as Connect;
};

beforeEach(() => {
  vi.clearAllMocks();
  __resetPanelPresenceForTests();
  vi.stubGlobal('chrome', { runtime: { onConnect: { addListener } } });
});

describe('panel presence', () => {
  it('counts a connected panel as present', () => {
    const connect = startObserving();

    expect(isPanelPresent()).toBe(false);
    openPort(connect);
    expect(isPanelPresent()).toBe(true);
  });

  it('ignores ports that are not the panel', () => {
    const connect = startObserving();

    openPort(connect, { name: 'something-else' });

    expect(isPanelPresent()).toBe(false);
  });

  it('counts the panel even when it is running in a tab, as it does in development (#142)', () => {
    const connect = startObserving();

    openPort(connect, { sender: { tab: { id: 1 } } as chrome.runtime.MessageSender });

    expect(isPanelPresent()).toBe(true);
  });

  it('counts each window separately, since every window has its own panel (D2)', () => {
    const connect = startObserving();

    openPort(connect);
    openPort(connect);

    expect(getPanelCount()).toBe(2);
  });

  describe('when a panel goes away', () => {
    it('requeues the presented request only once the last one has gone', () => {
      const connect = startObserving();
      const first = openPort(connect);
      const second = openPort(connect);

      first.disconnect();
      expect(requeuePresented).not.toHaveBeenCalled();
      expect(isPanelPresent()).toBe(true);

      second.disconnect();
      // Closing the panel is never a decision (FR-6): the request goes back to the queue.
      expect(requeuePresented).toHaveBeenCalledTimes(1);
      expect(isPanelPresent()).toBe(false);
    });

    it('ignores a repeated disconnect for the same port', () => {
      const connect = startObserving();
      const panel = openPort(connect);

      panel.disconnect();
      panel.disconnect();

      expect(requeuePresented).toHaveBeenCalledTimes(1);
    });
  });

  it('reports presence changes to listeners', () => {
    const seen: boolean[] = [];
    onPanelPresenceChange((present) => seen.push(present));

    const connect = startObserving();
    const panel = openPort(connect);
    panel.disconnect();

    expect(seen).toEqual([true, false]);
  });
});
