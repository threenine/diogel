import type { BridgeAction, BridgeRequestMap } from '../src/types/bridge';
import { MESSAGE_TYPE_PING, MESSAGE_TYPE_REQUEST } from './constants';
import { normalizeErrorMessage } from './error-normalizer';
import {
  getCurrentWindowOrigin,
  isDiogelWindowMessage,
  isSameWindowOrigin,
} from './window-message-security';

type LogContext = Record<string, unknown>;

// Methods the injected window.nostr provider is permitted to invoke from page context.
// Anything outside this set (e.g. internal bridge events such as
// 'approval.respond') must never be reachable via postMessage from the page.
const PAGE_METHOD_TO_BRIDGE_ACTION = {
  getPublicKey: 'nostr.getPublicKey',
  signEvent: 'nostr.signEvent',
  getRelays: 'nostr.getRelays',
  'nip04.encrypt': 'nostr.nip04.encrypt',
  'nip04.decrypt': 'nostr.nip04.decrypt',
  'nip44.encrypt': 'nostr.nip44.encrypt',
  'nip44.decrypt': 'nostr.nip44.decrypt',
  'diogel.getZapCapabilities': 'nip57.getCapabilities',
  'diogel.sendZap': 'nip57.sendZap',
} as const satisfies Record<string, BridgeAction>;

const ALLOWED_PAGE_METHODS = new Set<string>(Object.keys(PAGE_METHOD_TO_BRIDGE_ACTION));

export interface WindowMessageBridge {
  isConnected: boolean;
  connectToBackground: () => Promise<void>;
  send: (message: {
    event: BridgeAction;
    to: 'background';
    payload: Omit<BridgeRequestMap[BridgeAction], 'id' | 'action'>;
  }) => Promise<unknown>;
}

export interface WindowMessageHandlerDependencies {
  bridge: WindowMessageBridge;
  postMessage: (message: unknown, targetOrigin: string) => void;
  warn?: (message: string, context?: LogContext) => void;
  error?: (message: string, context?: LogContext) => void;
}

export async function handleDiogelWindowMessage(
  event: MessageEvent<unknown>,
  dependencies: WindowMessageHandlerDependencies,
): Promise<void> {
  const message = event.data;
  const validMessageTypes = new Set([MESSAGE_TYPE_REQUEST, MESSAGE_TYPE_PING]);

  if (
    event.source !== window ||
    !isSameWindowOrigin(event) ||
    !isDiogelWindowMessage(message) ||
    !validMessageTypes.has(message.type)
  ) {
    return;
  }

  const targetOrigin = getCurrentWindowOrigin();

  if (message.type === MESSAGE_TYPE_PING) {
    dependencies.postMessage({ id: message.id, response: true, result: 'pong' }, targetOrigin);
    return;
  }

  const { id, method, payload } = message;
  if (method === 'ping') {
    dependencies.postMessage({ id, response: true, result: 'pong' }, targetOrigin);
    return;
  }

  if (!method || !ALLOWED_PAGE_METHODS.has(method)) {
    dependencies.warn?.('[BEX] Rejected disallowed window.nostr method', { method });
    dependencies.postMessage(
      {
        id,
        response: true,
        error: `Unsupported method: ${method}`,
      },
      targetOrigin,
    );
    return;
  }

  const pageOrigin = getCurrentWindowOrigin();

  if (!dependencies.bridge.isConnected) {
    dependencies.warn?.('[BEX] Bridge is not connected, attempting to connect...');
    try {
      await dependencies.bridge.connectToBackground();
    } catch (connectError: unknown) {
      const errorMessage = normalizeErrorMessage(connectError);
      dependencies.error?.('[BEX] Failed to reconnect', {
        error: errorMessage,
      });
      dependencies.postMessage(
        {
          id,
          response: true,
          error: `Bridge connection failed: ${errorMessage}`,
        },
        targetOrigin,
      );
      return;
    }
  }

  try {
    const methodAction = PAGE_METHOD_TO_BRIDGE_ACTION[method as keyof typeof PAGE_METHOD_TO_BRIDGE_ACTION];
    const bridgePayload = {
      ...(payload ?? {}),
      origin: pageOrigin,
    } as Omit<BridgeRequestMap[BridgeAction], 'id' | 'action'>;
    const result = await dependencies.bridge.send({
      event: methodAction,
      to: 'background',
      payload: bridgePayload,
    });
    dependencies.postMessage(
      {
        id,
        response: true,
        result,
      },
      targetOrigin,
    );
  } catch (bridgeError: unknown) {
    const errorMessage = normalizeErrorMessage(bridgeError);
    dependencies.error?.('[BEX] Content script received error from background', {
      id,
      error: errorMessage,
    });
    dependencies.postMessage(
      {
        id,
        response: true,
        error: errorMessage,
      },
      targetOrigin,
    );
  }
}
