/**
 * Importing the file below initializes the content script.
 *
 * Warning:
 *   Do not remove the import statement below. It is required for the extension to work.
 *   If you don't need createBridge(), leave it as "import '#q-app/bex/content'".
 */
import { createBridge } from '#q-app/bex/content';

// The use of the bridge is optional.
const bridge = createBridge({ debug: false });
/**
 * bridge.portName is 'content@<path>-<number>'
 *   where <path> is the relative path of this content script
 *   filename (without extension) from /src-bex
 *   (eg. 'my-content-script', 'subdir/my-script')
 *   and <number> is a unique instance number (1-10000).
 */

declare module '@quasar/app-vite' {
  interface BexEventMap {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    'some.event': [{ someProp: string }, void];
    'nostr.getPublicKey': [{ origin: string }, any];
    'nostr.signEvent': [{ event: any; origin: string }, any];
    'nostr.getRelays': [{ origin: string }, any];
    'nostr.nip04.encrypt': [{ pubkey: string; plaintext: string; origin: string }, any];
    'nostr.nip04.decrypt': [{ pubkey: string; ciphertext: string; origin: string }, any];
    'blossom.upload': [
      {
        base64Data: string;
        fileType: string;
        blossomServer: string;
        uploadId?: string;
      },
      any,
    ];
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }
}

// Inject the NIP-07 provider script
console.log('[BEX] Content script starting. document.readyState:', document.readyState);
const injectProvider = () => {
  console.log('[BEX] Injecting NIP-07 provider script...');
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('nostr-provider.js');
  console.log('[BEX] Script source URL:', script.src);
  script.onerror = (e) => {
    console.error('[BEX] Failed to load provider script:', e);
  };
  const container = document.head || document.documentElement;
  if (container) {
    container.appendChild(script);
    script.onload = () => {
      console.log('[BEX] Provider script loaded and removed from DOM');
      script.remove();
    };
  } else {
    console.error('[BEX] Could not find container to inject script');
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectProvider);
} else {
  injectProvider();
}

window.addEventListener('message', async (event) => {
  // Broad logging for debugging
  if (event.data && event.data.type && event.data.type.startsWith('nostr-ext')) {
    console.log('[BEX] Content script received potential nostr-ext message:', event.data);
  }

  // Filter messages. We only want 'nostr-ext-request' or 'nostr-ext-ping' from the current window.
  if (event.source !== window || !event.data) {
    return;
  }

  // Handle both our internal ping and external requests
  if (event.data.type !== 'nostr-ext-request' && event.data.type !== 'nostr-ext-ping') {
    return;
  }

  if (event.data.type === 'nostr-ext-ping') {
    console.log('[BEX] Content script received ping (nostr-ext-ping) from page');
    window.postMessage({ id: event.data.id, response: true, result: 'pong' }, '*');
    return;
  }

  const { id, method, payload } = event.data;
  console.log('[BEX] Content script received request from page:', method, payload);

  if (method === 'ping') {
    console.log(`[BEX] Content script received ping (method=ping) for ID ${id}`);
    window.postMessage({ id, response: true, result: 'pong' }, '*');
    return;
  }

  const origin = window.location.origin;

  if (!bridge.isConnected) {
    console.warn('[BEX] Bridge is not connected, attempting to connect...');
    try {
      await bridge.connectToBackground();
      console.log('[BEX] Reconnected to background');
    } catch (err: any) {
      console.error('[BEX] Failed to reconnect:', err);
      window.postMessage(
        {
          id,
          response: true,
          error: `Bridge connection failed: ${err.message || err}`,
        },
        '*',
      );
      return;
    }
  }

  try {
    const result = await bridge.send({
      event: `nostr.${method}`,
      to: 'background',
      payload: { ...payload, origin },
    });
    console.log(`[BEX] Content script received response from background for ID ${id}:`, result);
    window.postMessage(
      {
        id,
        response: true,
        result,
      },
      '*',
    );
  } catch (error: any) {
    console.error(`[BEX] Content script received error from background for ID ${id}:`, error);
    window.postMessage(
      {
        id,
        response: true,
        error: error.message || error,
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
    console.log('[BEX] Connected to background');
  })
  .catch((err) => {
    console.error('[BEX] Failed to connect to background:', err);
  });
