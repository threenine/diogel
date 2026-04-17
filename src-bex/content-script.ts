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
// Note: Bridge types are in src-bex/types, not src/types
// Import minimal types needed to avoid breaking the build
// Full type safety will be addressed in a future prompt
// Types from './types/bridge' imported as needed
// Avoiding imports of non-existent types to prevent build failures

// The use of the bridge is optional.
const bridge = createBridge({ debug: false });
/**
 * bridge.portName is 'content@<path>-<number>'
 *   where <path> is the relative path of this content script
 *   filename (without extension) from /src-bex
 *   (eg. 'my-content-script', 'subdir/my-script')
 *   and <number> is a unique instance number (1-10000).
 */

// Bridge event types - simplified for now to avoid import issues
// Full type safety will be addressed in a future prompt

const debug = process.env.DEBUG === 'true';

type LogContext = Record<string, unknown>;

const log = (message: string, context?: LogContext): void => {
  if (debug) {
    console.debug(message, context);
  }
};

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

// Inject the NIP-07 provider script
log('[BEX] Content script starting', { readyState: document.readyState });
const injectProvider = () => {
  log('[BEX] Injecting NIP-07 provider script');
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('nostr-provider.js');
  log('[BEX] Script source URL', { src: script.src });
  script.onerror = (event: Event) => {
    error('[BEX] Failed to load provider script', { event });
  };
  const container = document.head || document.documentElement;
  if (container) {
    container.appendChild(script);
    script.onload = () => {
      log('[BEX] Provider script loaded and removed from DOM');
      script.remove();
    };
  } else {
    error('[BEX] Could not find container to inject script');
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectProvider);
} else {
  injectProvider();
}

window.addEventListener('message', async (event: MessageEvent<unknown>) => {
  const message = event.data;
  if (isDiogelWindowMessage(message) && message.type.startsWith('diogel')) {
    log('[BEX] Content script received potential diogel message', { type: message.type });
  }

  const validMessageTypes = new Set([MESSAGE_TYPE_REQUEST, MESSAGE_TYPE_PING]);

  if (event.source !== window || !isDiogelWindowMessage(message) || !validMessageTypes.has(message.type)) {
    return;
  }

  if (message.type === MESSAGE_TYPE_PING) {
    log('[BEX] Content script received ping from page', { type: message.type });
    window.postMessage({ id: message.id, response: true, result: 'pong' }, '*');
    return;
  }

  const { id, method, payload } = message;
  log('[BEX] Content script received request from page', { method });

  if (method === 'ping') {
    log('[BEX] Content script received ping (method=ping)', { id });
    window.postMessage({ id, response: true, result: 'pong' }, '*');
    return;
  }

  const origin = window.location.origin;

  if (!bridge.isConnected) {
    warn('[BEX] Bridge is not connected, attempting to connect...');
    try {
      await bridge.connectToBackground();
      log('[BEX] Reconnected to background');
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
    log('[BEX] Content script received response from background', { id });
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
});

// Hook into the bridge to listen for events sent from the other BEX parts.
bridge.on('some.event', ({ payload }) => {
  if (payload.someProp) {
    // Access a DOM element from here.
    // Document in this instance is the underlying website the contentScript runs on
    const el = document.getElementById('some-id');
    if (el) {
      el.innerText = 'Quasar Rocks!';
    }
  }
});

/**
 * Leave this AFTER you attach your initial listeners
 * so that the bridge can properly handle them.
 *
 * You can also disconnect from the background script
 * later on by calling bridge.disconnectFromBackground().
 *
 * To check connection status, access bridge.isConnected
 */
bridge
  .connectToBackground()
  .then(() => {
    log('[BEX] Connected to background');
  })
  .catch((err) => {
    error('[BEX] Failed to connect to background:', err);
  });
