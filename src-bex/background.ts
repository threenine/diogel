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
import { hexToBytes } from '@noble/hashes/utils';
import { db } from 'src/services/database';

const NOSTR_ACTIVE = 'nostr:active';

async function getActiveStoredKey() {
  console.log('[BEX] Getting active account...');
  const items = await chrome.storage.local.get([NOSTR_ACTIVE]);
  console.log('[BEX] Active account items:', items);
  const activeAlias = items[NOSTR_ACTIVE];
  console.log('[BEX] Active account alias:', activeAlias);

  if (!activeAlias) {
    console.error('[BEX] No active account alias found in storage');
    throw new Error('No active account found');
  }

  const storedKey = await db.storedKeys.where('alias').equals(activeAlias).first();

  if (!storedKey) {
    console.error('[BEX] No account found in database for alias:', activeAlias);
    throw new Error('No active account found');
  }

  console.log('[BEX] Active account found:', activeAlias);
  return storedKey;
}

declare module '@quasar/app-vite' {
  interface BexEventMap {
    /* eslint-disable @typescript-eslint/no-explicit-any */
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
  const storedKey = await getActiveStoredKey();
  return storedKey.id;
});

bridge.on('nostr.signEvent', async ({ payload: { event, origin } }) => {
  console.log('[BEX] Handling nostr.signEvent for:', origin);
  const approved = await requestApproval(origin);
  console.log('[BEX] Approval result for signEvent:', approved);
  if (!approved) {
    throw new Error('User rejected the request');
  }
  const storedKey = await getActiveStoredKey();
  // Ensure the event has the correct pubkey
  event.pubkey = storedKey.id;

  // finalizeEvent from nostr-tools v2
  const sk = hexToBytes(storedKey.account.privkey);
  return finalizeEvent(event, sk);
});

bridge.on('nostr.getRelays', async ({ payload: { origin } }) => {
  const approved = await requestApproval(origin);
  if (!approved) {
    throw new Error('User rejected the request');
  }
  return {};
});

async function getActiveSecretKey(): Promise<Uint8Array> {
  const storedKey = await getActiveStoredKey();
  return hexToBytes(storedKey.account.privkey);
}


bridge.on('nostr.nip04.encrypt', async ({ payload: { pubkey, plaintext, origin } }) => {
  const approved = await requestApproval(origin);
  if (!approved) {
    throw new Error('User rejected the request');
  }

  const secretKey = await getActiveSecretKey();
  return nip04.encrypt(secretKey, pubkey, plaintext);
});

bridge.on('nostr.nip04.decrypt', async ({ payload: { pubkey, ciphertext, origin } }) => {
  const approved = await requestApproval(origin);
  if (!approved) {
    throw new Error('User rejected the request');
  }
  const secretKey = await getActiveSecretKey();
  return  nip04.decrypt(secretKey, pubkey, ciphertext);
});


