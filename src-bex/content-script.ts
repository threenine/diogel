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
const script = document.createElement('script');
script.src = chrome.runtime.getURL('nostr-provider.js');
script.dataset.name = 'Diogel';
script.dataset.icon = chrome.runtime.getURL('icons/icon-128x128.png');
(document.head || document.documentElement).appendChild(script);
script.onload = () => {
  script.remove();
};

// Listen for messages from the page and relay them to the background script
window.addEventListener('message', (event) => {
  if (event.source !== window || !event.data || event.data.type !== 'nostr-ext-request') {
    return;
  }

  const { id, method, payload } = event.data;
  const origin = window.location.origin;

  bridge
    .send({
      event: `nostr.${method}`,
      to: 'background',
      payload: { ...payload, origin },
    })
    .then((result) => {
      window.postMessage(
        {
          id,
          response: true,
          result,
        },
        '*',
      );
    })
    .catch((error) => {
      window.postMessage(
        {
          id,
          response: true,
          error: error.message || error,
        },
        '*',
      );
    });
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
    console.log('Connected to background');
  })
  .catch((err) => {
    console.error('Failed to connect to background:', err);
  });

