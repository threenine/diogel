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
import { finalizeEvent, getPublicKey, nip04 } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';
import { sha256 } from '@noble/hashes/sha256';
import {
  createNewVault,
  getVaultData,
  isVaultUnlocked,
  lockVault,
  unlockVault,
  updateVaultData,
} from './vault';

const NOSTR_ACTIVE = 'nostr:active';
const BLOSSOM_UPLOAD_STATUS = 'blossom:upload_status';

async function getActiveStoredKey() {
  console.log('[BEX] Getting active account...');
  if (!isVaultUnlocked()) {
    console.warn('[BEX] Vault is locked, requesting internal unlock...');
    // When vault is locked, we want to notify the extension to show the login page
    // instead of opening a popup.
    if (bridge && bridge.send) {
      void bridge.send('vault.lock-status-changed', { unlocked: false });
    }
    // We can't automatically unlock without user interaction in the extension UI.
    return null;
  }
  const items = await chrome.storage.local.get([NOSTR_ACTIVE]);
  console.log('[BEX] Active account items:', items);
  const activeAlias = items[NOSTR_ACTIVE];
  console.log('[BEX] Active account alias:', activeAlias);

  if (!activeAlias) {
    console.error('[BEX] No active account alias found in storage');
    // If no active alias is set, try to pick the first one from the vault as a fallback
    const vaultDataRes = await getVaultData();
    if (vaultDataRes.success && vaultDataRes.vaultData) {
      const vaultData = vaultDataRes.vaultData as { accounts?: any[] };
      const accounts = vaultData.accounts || [];
      if (accounts.length > 0) {
        console.log('[BEX] Fallback: Using first account from vault');
        const fallbackAccount = accounts[0];
        await chrome.storage.local.set({ [NOSTR_ACTIVE]: fallbackAccount.alias });
        return fallbackAccount;
      }
    }
    return null;
  }

  const vaultRes = await getVaultData();
  if (!vaultRes.success || !vaultRes.vaultData) {
    console.error('[BEX] Failed to retrieve vault data from memory');
    return null;
  }

  const vaultData = vaultRes.vaultData as { accounts?: any[] };
  const storedKey = (vaultData.accounts || []).find((acc) => acc.alias === activeAlias);

  if (!storedKey) {
    console.error('[BEX] No account found in vault for alias:', activeAlias);
    return null;
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
    'vault.unlock': [{ password: string }, any];
    'vault.lock': [undefined, void];
    'vault.create': [{ password: string; vaultData: any }, any];
    'vault.isUnlocked': [undefined, boolean];
    'vault.getData': [undefined, any];
    'vault.updateData': [{ vaultData: any }, any];
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

/**
 * Call useBridge() to enable communication with the app & content scripts
 * (and between the app & content scripts), otherwise skip calling
 * useBridge() and use no bridge.
 */
console.log('[BEX] Initializing bridge...');
let bridge: any;
try {
  bridge = createBridge({ debug: true });
  console.log('[BEX] Bridge created successfully');
  if (typeof window !== 'undefined') {
    (window as any).bridge = bridge;
  }
  // Also try to put it on globalThis for service workers
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).bridge = bridge;
  }

  // Attach to $q if possible for BEX UI
  if (typeof window !== 'undefined' && (window as any).$q) {
    (window as any).$q.bex = bridge;
  }
} catch (e) {
  console.error('[BEX] Failed to create bridge:', e);
}

// Global ping handler for diagnostics
bridge.on('ping', () => {
  console.log('[BEX] Received ping');
  return 'pong';
});

interface ApprovalPromise {
  resolve: (value: boolean) => void;
  reject: (reason?: any) => void;
}

let approvalPromise: ApprovalPromise | null = null;

bridge.on(
  'nostr.approval.respond',
  ({ payload: { approved } }: { payload: { approved: boolean } }) => {
    console.log('[BEX] Received nostr.approval.respond:', approved);
    if (approvalPromise) {
      approvalPromise.resolve(approved);
      approvalPromise = null;
    } else {
      console.warn('[BEX] Received approval response but no approvalPromise was found');
    }
    return true;
  },
);

bridge.on('vault.unlock', async ({ payload: { password } }: { payload: { password: string } }) => {
  return await unlockVault(password);
});

bridge.on('vault.lock', async () => {
  await lockVault();
});

bridge.on(
  'vault.create',
  async ({
    payload: { password, vaultData },
  }: {
    payload: { password: string; vaultData: any };
  }) => {
    return await createNewVault(password, vaultData);
  },
);

bridge.on('vault.isUnlocked', () => {
  return isVaultUnlocked();
});

bridge.on('vault.getData', async () => {
  return await getVaultData();
});

bridge.on(
  'vault.updateData',
  async ({ payload: { vaultData } }: { payload: { vaultData: any } }) => {
    return await updateVaultData(vaultData);
  },
);

// Add direct chrome.runtime.onMessage listener as a fallback for the bridge
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'vault.isUnlocked') {
    sendResponse(isVaultUnlocked());
    return true;
  }
  if (message.type === 'vault.unlock') {
    unlockVault(message.payload.password).then(sendResponse);
    return true;
  }
  if (message.type === 'vault.lock') {
    lockVault().then(() => sendResponse(true));
    return true;
  }
  if (message.type === 'vault.create') {
    createNewVault(message.payload.password, message.payload.vaultData).then(sendResponse);
    return true;
  }
  if (message.type === 'vault.getData') {
    getVaultData().then(sendResponse);
    return true;
  }
  if (message.type === 'vault.updateData') {
    updateVaultData(message.payload.vaultData).then(sendResponse);
    return true;
  }
  if (message.type === 'ping') {
    sendResponse('pong');
    return true;
  }
  return false;
});

async function requestApproval(origin: string): Promise<boolean> {
  console.log('[BEX] Requesting approval for:', origin);

  // If vault is locked, we should NOT open the popup.
  // Instead, we return false and expect the caller to handle it (e.g. by throwing an error that might trigger a UI update)
  if (!isVaultUnlocked()) {
    console.warn('[BEX] Vault is locked, cannot request approval via popup');
    if (bridge && bridge.send) {
      void bridge.send('vault.lock-status-changed', { unlocked: false });
    }
    return false;
  }

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
    const originalResolve = approvalPromise!.resolve;
    const originalReject = approvalPromise!.reject;

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

    if (approvalPromise) {
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
    }
  });

  try {
    const win = await chrome.windows.create({
      url,
      type: 'popup',
      width: 450,
      height: 650,
      focused: true,
    });
    windowId = win.id;
  } catch (err) {
    console.error('[BEX] Failed to create approval window:', err);
    const currentPromise = approvalPromise as ApprovalPromise | null;
    if (currentPromise) {
      currentPromise.reject(err);
      approvalPromise = null;
    }
  }

  return promise;
}

bridge.on(
  'nostr.getPublicKey',
  async ({ payload: { origin } }: { payload: { origin: string } }) => {
    console.log('[BEX] Handling nostr.getPublicKey for:', origin);
    const approved = await requestApproval(origin);

    console.log('[BEX] Approval result for getPublicKey:', approved);
    if (!approved) {
      if (!isVaultUnlocked()) {
        throw new Error('Vault is locked. Please open the extension to unlock.');
      }
      throw new Error('User rejected the request');
    }

    const storedKey = await getActiveStoredKey();
    if (!storedKey) {
      throw new Error('No active account found');
    }
    console.log('[BEX] Returning pubkey:', storedKey.id);
    return storedKey.id;
  },
);

bridge.on(
  'nostr.signEvent',
  async ({ payload: { event, origin } }: { payload: { event: any; origin: string } }) => {
    console.log('[BEX] Handling nostr.signEvent for:', origin, event);
    const approved = await requestApproval(origin);

    console.log('[BEX] Approval result for signEvent:', approved);
    if (!approved) {
      if (!isVaultUnlocked()) {
        throw new Error('Vault is locked. Please open the extension to unlock.');
      }
      throw new Error('User rejected the request');
    }

    const storedKey = await getActiveStoredKey();
    if (!storedKey) {
      throw new Error('No active account found');
    }
    // Ensure the event has the correct pubkey
    event.pubkey = storedKey.id;

    // finalizeEvent from nostr-tools v2
    const sk = hexToBytes(storedKey.account.privkey);
    const signedEvent = finalizeEvent(event, sk);
    console.log('[BEX] Returning signed event:', signedEvent);
    return signedEvent;
  },
);

bridge.on('nostr.getRelays', async ({ payload: { origin } }: { payload: { origin: string } }) => {
  const approved = await requestApproval(origin);
  if (!approved) {
    if (!isVaultUnlocked()) {
      throw new Error('Vault is locked. Please open the extension to unlock.');
    }
    throw new Error('User rejected the request');
  }
  return {};
});

async function getActiveSecretKey(): Promise<Uint8Array> {
  const storedKey = await getActiveStoredKey();
  if (!storedKey) {
    throw new Error('No active account found');
  }
  return hexToBytes(storedKey.account.privkey);
}

bridge.on(
  'nostr.nip04.encrypt',
  async ({
    payload: { pubkey, plaintext, origin },
  }: {
    payload: { pubkey: string; plaintext: string; origin: string };
  }) => {
    const approved = await requestApproval(origin);
    if (!approved) {
      if (!isVaultUnlocked()) {
        throw new Error('Vault is locked. Please open the extension to unlock.');
      }
      throw new Error('User rejected the request');
    }

    const secretKey = await getActiveSecretKey();
    return nip04.encrypt(secretKey, pubkey, plaintext);
  },
);

bridge.on(
  'nostr.nip04.decrypt',
  async ({
    payload: { pubkey, ciphertext, origin },
  }: {
    payload: { pubkey: string; ciphertext: string; origin: string };
  }) => {
    const approved = await requestApproval(origin);
    if (!approved) {
      if (!isVaultUnlocked()) {
        throw new Error('Vault is locked. Please open the extension to unlock.');
      }
      throw new Error('User rejected the request');
    }
    const secretKey = await getActiveSecretKey();
    return nip04.decrypt(secretKey, pubkey, ciphertext);
  },
);

bridge.on(
  'blossom.upload',
  ({
    payload: { base64Data, fileType, blossomServer, uploadId },
  }: {
    payload: { base64Data: string; fileType: string; blossomServer: string; uploadId?: string };
  }) => {
    console.log('[BEX] Handling blossom.upload, server:', blossomServer, 'uploadId:', uploadId);

    const UPLOAD_STATUS_KEY = uploadId
      ? `blossom:upload_status:${uploadId}`
      : BLOSSOM_UPLOAD_STATUS;

    const processUpload = async () => {
      // Persist status as uploading
      await chrome.storage.local.set({
        [UPLOAD_STATUS_KEY]: {
          uploading: true,
          error: null,
          url: null,
        },
      });

      let uploadResult = null;
      let finalError: any = null;

      const storedKey = await getActiveStoredKey();
      if (!storedKey) {
        finalError = new Error('No active account found');
      } else {
        try {
          const sk = hexToBytes(storedKey.account.privkey);
          const pk = getPublicKey(sk);

          // Convert base64 to Uint8Array
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          const hash = sha256(bytes);
          const hashHex = Array.from(hash)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');

          const normalizedServer = blossomServer.replace(/\/$/, '');

          // Blossom servers often support different upload endpoints.
          // We try the standard ones in order.
          const uploadOptions = [
            { url: `${normalizedServer}/upload`, method: 'PUT' },
            { url: `${normalizedServer}/upload`, method: 'POST' },
            { url: `${normalizedServer}/`, method: 'PUT' },
            { url: `${normalizedServer}/`, method: 'POST' },
            { url: `${normalizedServer}/${hashHex}`, method: 'PUT' },
            // Try without trailing slash if normalizedServer ends with it?
            // No, normalizedServer already has it stripped.
            // What about literally just PUT to the server url as configured if it's special?
            { url: blossomServer, method: 'PUT' },
          ];

          let lastError: any = null;
          uploadResult = await (async () => {
            for (const option of uploadOptions) {
              try {
                // Add a small delay between retries if this is not the first attempt
                if (option !== uploadOptions[0]) {
                  await new Promise((resolve) => setTimeout(resolve, 500));
                }

                console.log(`[BEX] Attempting ${option.method} upload to: ${option.url}`);

                const eventTemplate = {
                  kind: 24242,
                  created_at: Math.floor(Date.now() / 1000),
                  tags: [
                    ['t', 'upload'],
                    ['x', hashHex],
                    ['u', option.url],
                    ['method', option.method],
                  ],
                  content: 'Upload file',
                  pubkey: pk,
                };

                // Some servers might require 'size' tag
                eventTemplate.tags.push(['size', bytes.length.toString()]);

                const signedEvent = finalizeEvent(eventTemplate, sk);
                // Build auth header manually to ensure no unexpected escaping
                const signedEventJson = JSON.stringify(signedEvent);
                console.log(`[BEX] Signed Event: ${signedEventJson}`);
                const authHeader = `Nostr ${btoa(signedEventJson)}`;

                const response = await fetch(option.url, {
                  method: option.method,
                  headers: {
                    Authorization: authHeader,
                    'Content-Type': fileType,
                  },
                  body: bytes,
                });

                if (response.ok) {
                  console.log(`[BEX] Upload successful to ${option.url}`);

                  let finalUrlFromResponse = '';
                  // Try to get URL from JSON response
                  if (response.status !== 204) {
                    try {
                      const responseText = await response.text();
                      console.log(`[BEX] Response body: ${responseText}`);
                      try {
                        const data = JSON.parse(responseText);
                        if (data && data.url) {
                          finalUrlFromResponse = String(data.url);
                        }
                      } catch (e) {
                        // Not JSON, maybe it's just the URL in plain text?
                        if (responseText.startsWith('http')) {
                          finalUrlFromResponse = responseText.trim();
                        }
                      }
                    } catch (e) {
                      console.warn('[BEX] Failed to read response body');
                    }
                  }

                  // Fallback: if we uploaded to a hash-based path, we already know the URL
                  if (!finalUrlFromResponse && option.url === `${normalizedServer}/${hashHex}`) {
                    finalUrlFromResponse = option.url;
                  }

                  if (finalUrlFromResponse) {
                    return { url: finalUrlFromResponse };
                  }
                } else {
                  const errorText = await response.text();
                  console.warn(
                    `[BEX] Upload to ${option.url} failed with ${response.status}: ${errorText}`,
                  );
                  lastError = new Error(
                    `Upload failed (${response.status}: ${response.statusText}) ${errorText.substring(0, 100)}`,
                  );

                  // If it's a 413 (Payload Too Large) or 401/403 (Unauthorized), stop trying fallbacks
                  if (
                    response.status === 413 ||
                    response.status === 401 ||
                    response.status === 403
                  ) {
                    break;
                  }
                }
              } catch (e: any) {
                console.error(`[BEX] Error trying upload to ${option.url}:`, e);
                lastError = e;
              }
            }
            return null;
          })();

          if (!uploadResult) {
            finalError = lastError || new Error('Upload failed');
          }
        } catch (error: any) {
          finalError = error;
        }
      }

      if (uploadResult) {
        await chrome.storage.local.set({
          [UPLOAD_STATUS_KEY]: {
            uploading: false,
            error: null,
            url: uploadResult.url,
          },
        });
        return uploadResult;
      } else {
        console.error('[BEX] Error in blossom.upload:', finalError);
        const errorMessage = finalError?.message || 'Upload failed';
        await chrome.storage.local.set({
          [UPLOAD_STATUS_KEY]: {
            uploading: false,
            error: errorMessage,
            url: null,
          },
        });
        throw finalError;
      }
    };

    return processUpload();
  },
);
