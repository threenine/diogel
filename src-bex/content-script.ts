/**
 * Importing the file below initializes the content script.
 *
 * Warning:
 *   Do not remove the import statement below. It is required for the extension to work.
 *   If you don't need createBridge(), leave it as "import '#q-app/bex/content'".
 */
import type { BridgeAction, BridgeRequestMap } from '../src/types/bridge';
import { createBridge } from '#q-app/bex/content';
import { MESSAGE_TYPE_PING, MESSAGE_TYPE_REQUEST } from './constants';
const bridge = createBridge({ debug: false });
/**
 * bridge.portName is 'content@<path>-<number>'
 *   where <path> is the relative path of this content script
 *   filename (without extension) from /src-bex
 *   (eg. 'my-content-script', 'subdir/my-script')
 *   and <number> is a unique instance number (1-10000).
 */

type LogContext = Record<string, unknown>;

const warn = (message: string, context?: LogContext): void => {
  console.warn(message, context);
};

const error = (message: string, context?: LogContext): void => {
  console.error(message, context);
};

interface DiogelWindowMessage {
  id: string;
  type: string;
  method?: string;
  payload?: Record<string, unknown>;
}

const isDiogelWindowMessage = (value: unknown): value is DiogelWindowMessage => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'string' && typeof candidate.type === 'string';
};

const injectProvider = () => {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('nostr-provider.js');
  script.onerror = (event) => {
    error('[BEX] Failed to load provider script', {
      event: typeof event === 'string' ? event : undefined,
    });
  };
  const container = document.head || document.documentElement;
  if (container) {
    container.appendChild(script);
    script.onload = () => {
      script.remove();
    };
  } else {
    error('[BEX] Could not find container to inject script');
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    injectProvider();
  });
} else {
  injectProvider();
}

async function handleWindowMessage(event: MessageEvent<unknown>): Promise<void> {
  const message = event.data;
  const validMessageTypes = new Set([MESSAGE_TYPE_REQUEST, MESSAGE_TYPE_PING]);

  if (event.source !== window || !isDiogelWindowMessage(message) || !validMessageTypes.has(message.type)) {
    return;
  }

  if (message.type === MESSAGE_TYPE_PING) {
    window.postMessage({ id: message.id, response: true, result: 'pong' }, '*');
    return;
  }

  const { id, method, payload } = message;
  if (method === 'ping') {
    window.postMessage({ id, response: true, result: 'pong' }, '*');
    return;
  }

  const origin = window.location.origin;

  if (!bridge.isConnected) {
    warn('[BEX] Bridge is not connected, attempting to connect...');
    try {
      await bridge.connectToBackground();
    } catch (connectError: unknown) {
      error('[BEX] Failed to reconnect', {
        error: connectError instanceof Error ? connectError.message : String(connectError),
      });
      window.postMessage(
        {
          id,
          response: true,
          error: `Bridge connection failed: ${connectError instanceof Error ? connectError.message : String(connectError)}`,
        },
        '*',
      );
      return;
    }
  }

  try {
    const methodAction = `nostr.${method}` as BridgeAction;
    const bridgePayload = {
      ...(payload ?? {}),
      origin,
    } as Omit<BridgeRequestMap[BridgeAction], 'id' | 'action'>;
    const result = await bridge.send({
      event: methodAction,
      to: 'background',
      payload: bridgePayload,
    });
    window.postMessage(
      {
        id,
        response: true,
        result,
      },
      '*',
    );
  } catch (bridgeError: unknown) {
    error('[BEX] Content script received error from background', {
      id,
      error: bridgeError instanceof Error ? bridgeError.message : String(bridgeError),
    });
    window.postMessage(
      {
        id,
        response: true,
        error: bridgeError instanceof Error ? bridgeError.message : String(bridgeError),
      },
      '*',
    );
  }
}

window.addEventListener('message', (event: MessageEvent<unknown>) => {
  void handleWindowMessage(event);
});

bridge.connectToBackground().catch((connectError: unknown) => {
  error('[BEX] Failed to connect to background', {
    error: connectError instanceof Error ? connectError.message : String(connectError),
  });
});
