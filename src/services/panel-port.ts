/**
 * Panel-side presence port.
 *
 * The panel holds one long-lived connection for as long as it is open. The background treats the
 * connection as "a panel is present" and its teardown as "the panel has gone", which is the only
 * signal that works on both browsers (#113).
 *
 * The port carries no requests and no decisions. Those stay on the existing request/response
 * bridge, where the background remains the authority. #140 adds pushes over this same connection.
 *
 * A Chromium service worker can be suspended while the panel stays open, which disconnects the
 * port without the panel having gone anywhere. Reconnecting is therefore normal operation rather
 * than error recovery, and the caller is told so it can re-read state the worker may have
 * reconciled while it was away.
 */

import { LogLevel, logService } from './log-service';

export const PANEL_PORT_NAME = 'porwr-panel';

/** Long enough that a suspended worker has restarted, short enough to feel immediate. */
const RECONNECT_DELAY_MS = 250;

export interface PanelPortHandle {
  disconnect: () => void;
}

export interface PanelPortOptions {
  /** Called after every reconnect, never on the first connect. */
  onReconnect?: () => void;
}

export function connectPanelPort(options: PanelPortOptions = {}): PanelPortHandle {
  let port: chrome.runtime.Port | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;
  let hasConnected = false;

  const open = (): void => {
    if (closed) return;

    // No extension API at all means there is nothing to be present in — a plain page or a test
    // environment. Retrying forever would only burn timers.
    if (typeof chrome === 'undefined' || !chrome.runtime?.connect) {
      closed = true;
      return;
    }

    try {
      port = chrome.runtime.connect({ name: PANEL_PORT_NAME });
    } catch (error: unknown) {
      logService.log(LogLevel.DEBUG, '[Panel] Presence port failed to open', {
        error: error instanceof Error ? error.message : String(error),
      });
      schedule();
      return;
    }

    if (hasConnected) options.onReconnect?.();
    hasConnected = true;

    port.onDisconnect.addListener(() => {
      port = undefined;
      schedule();
    });
  };

  const schedule = (): void => {
    if (closed || timer !== undefined) return;
    timer = setTimeout(() => {
      timer = undefined;
      open();
    }, RECONNECT_DELAY_MS);
  };

  open();

  return {
    disconnect: (): void => {
      closed = true;
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      // Explicit: the browser would tear this down on unload anyway, but an unmounted panel that
      // is still counted as present would hold a request in `presented` for nobody.
      port?.disconnect();
      port = undefined;
    },
  };
}
