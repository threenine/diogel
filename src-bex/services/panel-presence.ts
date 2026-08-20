/**
 * Panel presence.
 *
 * Chromium offers no way to ask whether the side panel is open, and Firefox's
 * `sidebarAction.isOpen` answers only for Firefox. Rather than branch on the browser, presence is
 * taken from a long-lived port the panel opens on mount and the browser tears down when the panel
 * closes. One mechanism, both browsers (ADR D17).
 *
 * Presence is a presentation fact, never a lifecycle one. When the last panel goes away the
 * presented request returns to the queue; nothing is decided, rejected or duplicated, because
 * closing the panel is not a decision (FR-6, S11).
 */

import { LogLevel, logService } from 'src/services/log-service';
import { requeuePresented } from './request-queue';

export const PANEL_PORT_NAME = 'porwr-panel';

type PresenceListener = (present: boolean) => void;

const panels = new Set<chrome.runtime.Port>();
const listeners = new Set<PresenceListener>();

export const isPanelPresent = (): boolean => panels.size > 0;

export const getPanelCount = (): number => panels.size;

export const onPanelPresenceChange = (listener: PresenceListener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const notify = (): void => {
  const present = isPanelPresent();
  for (const listener of listeners) listener(present);
};

const handleDisconnect = (port: chrome.runtime.Port): void => {
  if (!panels.delete(port)) return;

  notify();
  if (panels.size > 0) return;

  // The last panel has gone. A request left in `presented` would otherwise stay that way until
  // something else touched the queue, and would be re-presented to nobody.
  void requeuePresented().catch((error: unknown) => {
    logService.log(LogLevel.ERROR, '[Panel] Failed to requeue after the last panel closed', {
      error: error instanceof Error ? error.message : String(error),
    });
  });
};

/**
 * Watch for panels connecting.
 *
 * Filtered on the port name alone. Content scripts connect too, but under the bridge's own name,
 * so the name is already decisive. Rejecting ports that carry a `sender.tab` would additionally
 * reject the panel opened as a tab, which is how it is run during development (#142) — the panel
 * is the same page either way and should count as present either way.
 */
export const observePanelConnections = (): void => {
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== PANEL_PORT_NAME) return;

    panels.add(port);
    notify();
    port.onDisconnect.addListener(() => handleDisconnect(port));
  });
};

export const __resetPanelPresenceForTests = (): void => {
  panels.clear();
  listeners.clear();
};
