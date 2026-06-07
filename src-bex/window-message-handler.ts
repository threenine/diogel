import type { BridgeAction, BridgeRequestMap } from '../src/types/bridge';
import { MESSAGE_TYPE_PING, MESSAGE_TYPE_REQUEST } from './constants';
import {
  getCurrentWindowOrigin,
  isDiogelWindowMessage,
  isSameWindowOrigin,
} from './window-message-security';

type LogContext = Record<string, unknown>;

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

  const pageOrigin = getCurrentWindowOrigin();

  if (!dependencies.bridge.isConnected) {
    dependencies.warn?.('[BEX] Bridge is not connected, attempting to connect...');
    try {
      await dependencies.bridge.connectToBackground();
    } catch (connectError: unknown) {
      dependencies.error?.('[BEX] Failed to reconnect', {
        error: connectError instanceof Error ? connectError.message : String(connectError),
      });
      dependencies.postMessage(
        {
          id,
          response: true,
          error: `Bridge connection failed: ${connectError instanceof Error ? connectError.message : String(connectError)}`,
        },
        targetOrigin,
      );
      return;
    }
  }

  try {
    const methodAction = `nostr.${method}` as BridgeAction;
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
    dependencies.error?.('[BEX] Content script received error from background', {
      id,
      error: bridgeError instanceof Error ? bridgeError.message : String(bridgeError),
    });
    dependencies.postMessage(
      {
        id,
        response: true,
        error: bridgeError instanceof Error ? bridgeError.message : String(bridgeError),
      },
      targetOrigin,
    );
  }
}
