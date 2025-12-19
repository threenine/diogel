/**
 * Importing the file below initializes the extension background.
 *
 * Warnings:
 * 1. Do NOT remove the import statement below. It is required for the extension to work.
 *    If you don't need createBridge(), leave it as "import '#q-app/bex/background'".
 * 2. Do NOT import this file in multiple background scripts. Only in one!
 * 3. Import it in your background service worker (if available for your target browser).
 */
import { createBridge } from '#q-app/bex/background';
import { finalizeEvent, nip04 } from 'nostr-tools';
import type { StoredKey } from 'src/types';

const NOSTR_KEYS = 'nostr:keys';
const NOSTR_ACTIVE = 'nostr:active';

async function getActiveAccount() {
  console.log('[BEX] Getting active account...');
  const items = await chrome.storage.local.get([NOSTR_KEYS, NOSTR_ACTIVE]);
  const activeAlias = items[NOSTR_ACTIVE];
  const keys: Record<string, StoredKey> = items[NOSTR_KEYS] || {};

  if (!activeAlias || !keys[activeAlias]) {
    console.error('[BEX] No active account found. Active:', activeAlias, 'Keys:', Object.keys(keys));
    throw new Error('No active account found');
  }

  console.log('[BEX] Active account found:', activeAlias);
  return keys[activeAlias].account;
}

function openExtension() {
  chrome.tabs.create(
    {
      url: chrome.runtime.getURL('www/index.html'),
    },
    (/* newTab */) => {
      // Tab opened.
    },
  );
}

chrome.runtime.onInstalled.addListener(openExtension);
chrome.action.onClicked.addListener(openExtension);

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-128x128.png',
    title: 'Tab Changed',
    message: `Tab with ID ${activeInfo.tabId} is now active.`,
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon-128x128.png',
      title: 'Tab Updated',
      message: `Tab ${tabId} updated: ${tab.url}`,
    });
  }
});

declare module '@quasar/app-vite' {
  interface BexEventMap {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    log: [{ message: string; data?: any[] }, void];
    getTime: [never, number];

    'storage.get': [string | undefined, any];
    'storage.set': [{ key: string; value: any }, void];
    'storage.remove': [string, void];
    'nostr.getPublicKey': [{ origin: string }, any];
    'nostr.signEvent': [{ event: any; origin: string }, any];
    'nostr.getRelays': [{ origin: string }, any];
    'nostr.nip04.encrypt': [{ pubkey: string; plaintext: string; origin: string }, any];
    'nostr.nip04.decrypt': [{ pubkey: string; ciphertext: string; origin: string }, any];
    'nostr.approval.respond': [{ approved: boolean }, void];
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }
}

/**
 * Call useBridge() to enable communication with the app & content scripts
 * (and between the app & content scripts), otherwise skip calling
 * useBridge() and use no bridge.
 */
const bridge = createBridge({ debug: false });

bridge.on('log', ({ from, payload }) => {
  console.log(`[BEX] @log from "${from}"`, payload);
});

bridge.on('getTime', () => {
  return Date.now();
});

bridge.on('storage.get', ({ payload: key }) => {
  return new Promise((resolve) => {
    if (key === void 0) {
      chrome.storage.local.get(null, (items) => {
        // Group the values up into an array to take advantage of the bridge's chunk splitting.
        resolve(Object.values(items));
      });
    } else {
      chrome.storage.local.get([key], (items) => {
        resolve(items[key]);
      });
    }
  });
});
// Usage:
// bridge.send({
//   event: 'storage.get',
//   to: 'background',
//   payload: 'key' // or omit `payload` to get data for all keys
// }).then((result) => { ... }).catch((error) => { ... });

bridge.on('storage.set', ({ payload: { key, value } }) => {
  void chrome.storage.local.set({ [key]: value });
});
// Usage:
// bridge.send({
//   event: 'storage.set',
//   to: 'background',
//   payload: { key: 'someKey', value: 'someValue' }
// }).then(() => { ... }).catch((error) => { ... });

bridge.on('storage.remove', ({ payload: key }) => {
  void chrome.storage.local.remove(key);
});

let approvalPromise: { resolve: (value: boolean) => void; reject: (reason?: any) => void } | null =
  null;

bridge.on('nostr.approval.respond', ({ payload: { approved } }) => {
  console.log('[BEX] Received nostr.approval.respond:', approved);
  if (approvalPromise) {
    approvalPromise.resolve(approved);
    approvalPromise = null;
  } else {
    console.warn('[BEX] Received approval response but no approvalPromise was found');
  }
  return true;
});

async function requestApproval(origin: string): Promise<boolean> {
  console.log('[BEX] Requesting approval for:', origin);
  // If there's already a pending approval, we might want to queue it or reject it.
  // For simplicity, let's reject it for now.
  if (approvalPromise) {
    throw new Error('Another approval request is already pending');
  }

  const url = chrome.runtime.getURL(`www/index.html#/approve?origin=${encodeURIComponent(origin)}`);

  let windowId: number | undefined;

  const promise = new Promise<boolean>((resolve, reject) => {
    approvalPromise = { resolve, reject };

    // Set a timeout to reject if no response
    const timeout = setTimeout(() => {
      if (approvalPromise) {
        approvalPromise.reject(new Error('Approval request timed out'));
        approvalPromise = null;
        if (windowId !== undefined) {
          void chrome.windows.remove(windowId);
        }
      }
    }, 60000); // 1 minute timeout

    // Wrap resolve/reject to clear timeout and listener
    const originalResolve = approvalPromise.resolve;
    const originalReject = approvalPromise.reject;

    // Handle manual window closure
    const onRemovedHandler = (closedWindowId: number) => {
      if (closedWindowId === windowId) {
        if (approvalPromise) {
          console.log('[BEX] Approval window closed manually');
          approvalPromise.resolve(false);
          approvalPromise = null;
        }
      }
    };
    chrome.windows.onRemoved.addListener(onRemovedHandler);

    approvalPromise.resolve = (val) => {
      clearTimeout(timeout);
      chrome.windows.onRemoved.removeListener(onRemovedHandler);
      originalResolve(val);
    };
    approvalPromise.reject = (err) => {
      clearTimeout(timeout);
      chrome.windows.onRemoved.removeListener(onRemovedHandler);
      originalReject(err);
    };
  });

  const win = await chrome.windows.create({
    url,
    type: 'popup',
    width: 600,
    height: 600,
  });
  windowId = win.id;

  return promise;
}

bridge.on('nostr.getPublicKey', async ({ payload: { origin } }) => {
  console.log('[BEX] Handling nostr.getPublicKey for:', origin);
  const approved = await requestApproval(origin);
  console.log('[BEX] Approval result for getPublicKey:', approved);
  if (!approved) {
    throw new Error('User rejected the request');
  }
  const account = await getActiveAccount();
  return account.pubkey;
});

bridge.on('nostr.signEvent', async ({ payload: { event, origin } }) => {
  console.log('[BEX] Handling nostr.signEvent for:', origin);
  const approved = await requestApproval(origin);
  console.log('[BEX] Approval result for signEvent:', approved);
  if (!approved) {
    throw new Error('User rejected the request');
  }
  const account = await getActiveAccount();
  // Ensure the event has the correct pubkey
  event.pubkey = account.pubkey;

  // finalizeEvent from nostr-tools v2
  const sk = hexToBytes(account.priKey);
  return finalizeEvent(event, sk);
});

bridge.on('nostr.getRelays', async ({ payload: { origin } }) => {
  const approved = await requestApproval(origin);
  if (!approved) {
    throw new Error('User rejected the request');
  }
  const account = await getActiveAccount();
  const relays: Record<string, { read: boolean; write: boolean }> = {};
  account.relays.forEach((r) => {
    relays[r] = { read: true, write: true };
  });
  return relays;
});

bridge.on('nostr.nip04.encrypt', async ({ payload: { pubkey, plaintext, origin } }) => {
  const approved = await requestApproval(origin);
  if (!approved) {
    throw new Error('User rejected the request');
  }
  const account = await getActiveAccount();
  const sk = hexToBytes(account.priKey);
  return await nip04.encrypt(sk, pubkey, plaintext);
});

bridge.on('nostr.nip04.decrypt', async ({ payload: { pubkey, ciphertext, origin } }) => {
  const approved = await requestApproval(origin);
  if (!approved) {
    throw new Error('User rejected the request');
  }
  const account = await getActiveAccount();
  const sk = hexToBytes(account.priKey);
  return await nip04.decrypt(sk, pubkey, ciphertext);
});

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}
// Usage:
// bridge.send({
//   event: 'storage.remove',
//   to: 'background',
//   payload: 'someKey'
// }).then(() => { ... }).catch((error) => { ... });

/*
// More examples:

// Listen to a message from the client
bridge.on('test', message => {
  console.log(message);
  console.log(message.payload);
});

// Send a message and split payload into chunks
// to avoid max size limit of BEX messages.
// Warning! This happens automatically when the payload is an array.
// If you actually want to send an Array, wrap it in an Object.
bridge.send({
  event: 'test',
  to: 'app',
  payload: [ 'chunk1', 'chunk2', 'chunk3', ... ]
}).then(responsePayload => { ... }).catch(err => { ... });

// Send a message and wait for a response
bridge.send({
  event: 'test',
  to: 'app',
  payload: { banner: 'Hello from background!' }
}).then(responsePayload => { ... }).catch(err => { ... });

// Listen to a message from the client and respond synchronously
bridge.on('test', message => {
  console.log(message);
  return { banner: 'Hello from background!' };
});

// Listen to a message from the client and respond asynchronously
bridge.on('test', async message => {
  console.log(message);
  const result = await someAsyncFunction();
  return result;
});
bridge.on('test', message => {
  console.log(message)
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ banner: 'Hello from background!' });
    }, 1000);
  });
});

// Broadcast a message to app & content scripts
bridge.portList.forEach(portName => {
  bridge.send({ event: 'test', to: portName, payload: 'Hello from background!' });
});

// Find any connected content script and send a message to it
const contentPort = bridge.portList.find(portName => portName.startsWith('content@'));
if (contentPort) {
  bridge.send({ event: 'test', to: contentPort, payload: 'Hello from background!' });
}

// Send a message to a certain content script
bridge
  .send({ event: 'test', to: 'content@my-content-script-2345', payload: 'Hello from background!' })
  .then(responsePayload => { ... })
  .catch(err => { ... });

// Listen for connection events
// (the "@quasar:ports" is an internal event name registered automatically by the bridge)
// --> ({ portList: string[], added?: string } | { portList: string[], removed?: string })
bridge.on('@quasar:ports', ({ portList, added, removed }) => {
  console.log('Ports:', portList)
  if (added) {
    console.log('New connection:', added);
  } else if (removed) {
    console.log('Connection removed:', removed);
  }
});

// Send a message to the client based on something happening.
chrome.tabs.onCreated.addListener(tab => {
  bridge.send(...).then(responsePayload => { ... }).catch(err => { ... });
});

// Send a message to the client based on something happening.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    bridge.send(...).then(responsePayload => { ... }).catch(err => { ... });
  }
});

// Dynamically set debug mode
bridge.setDebug(true); // boolean

// Log a message on the console (if debug is enabled)
bridge.log('Hello world!');
bridge.log('Hello', 'world!');
bridge.log('Hello world!', { some: 'data' });
bridge.log('Hello', 'world', '!', { some: 'object' });
// Log a warning on the console (regardless of the debug setting)
bridge.warn('Hello world!');
bridge.warn('Hello', 'world!');
bridge.warn('Hello world!', { some: 'data' });
bridge.warn('Hello', 'world', '!', { some: 'object' });
*/
