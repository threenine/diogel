/**
 * Importing the file below initializes the extension background.
 *
 * Warnings:
 * 1. Do NOT remove the import statement below. It is required for the extension to work.
 *    If you don't need create Bridge(), leave it as "import '#q-app/bex/background'".
 * 2. Do NOT import this file in multiple background scripts. Only in one!
 * 3. Import it in your background service worker (if available for your target browser).
 */
import { createBridge } from '#q-app/bex/background';
import { finalizeEvent, getPublicKey, nip04 } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';
import { sha256 } from '@noble/hashes/sha2.js';
import { logService } from 'src/services/log-service';
import {
  REQUEST_TIMEOUT_MS,
  AUTO_LOCK_CHECK_INTERVAL_MS,
  AUTO_LOCK_DEFAULT_MINUTES,
} from './constants';
import type { BridgeError } from './types/bridge';
import {
  createNewVault,
  exportVault,
  getVaultData,
  importVault,
  isVaultUnlocked,
  lockVault,
  unlockVault,
  updateVaultData,
  restoreVaultState,
} from './vault';

// Auto-lock state
let lastActivityAt = Date.now();
let autoLockTimer: any = null;

function updateLastActivity() {
  lastActivityAt = Date.now();
  void chrome.storage.local.set({ 'vault:last-activity': lastActivityAt });
}

async function checkAutoLock() {
  if (!isVaultUnlocked()) {
    stopAutoLockTimer();
    return;
  }

  const items = await chrome.storage.local.get(['vault:auto-lock-minutes']);
  const minutes = Number(items['vault:auto-lock-minutes'] ?? AUTO_LOCK_DEFAULT_MINUTES);

  if (minutes <= 0) {
    return;
  }

  const idleMs = Date.now() - lastActivityAt;
  const maxIdleMs = minutes * 60 * 1000;

  if (idleMs >= maxIdleMs) {
    console.log(`[BEX] Auto-locking vault after ${minutes} minutes of inactivity`);
    await lockVault();
    notifyLockStatusChanged(false);
    stopAutoLockTimer();
  }
}

function startAutoLockTimer() {
  if (autoLockTimer) return;
  console.log('[BEX] Starting auto-lock timer');
  autoLockTimer = setInterval(() => {
    void checkAutoLock();
  }, AUTO_LOCK_CHECK_INTERVAL_MS);
}

function stopAutoLockTimer() {
  if (autoLockTimer) {
    clearInterval(autoLockTimer);
    autoLockTimer = null;
  }
}

const NOSTR_ACTIVE = 'nostr:active';
const BLOSSOM_UPLOAD_STATUS = 'blossom:upload_status';

async function getActiveAlias() {
  const items = await chrome.storage.local.get([NOSTR_ACTIVE]);
  return items[NOSTR_ACTIVE];
}

async function getActiveStoredKey() {
  console.log('[BEX] Getting active account...');
  if (!isVaultUnlocked()) {
    console.warn('[BEX] Vault is locked, requesting internal unlock...');
    // When vault is locked, we want to notify the extension to show the login page
    // instead of opening a popup.
    notifyLockStatusChanged(false);
    // We can't automatically unlock without user interaction in the extension UI.
    return null;
  }
  const items = await chrome.storage.local.get([NOSTR_ACTIVE]);
  console.log('[BEX] Active account items:', items);
  const activeAlias = items[NOSTR_ACTIVE];
  console.log('[BEX] Active account alias:', activeAlias);

  if (!activeAlias) {
    console.error('[BEX] No active account alias found in storage');
    void logService.logException(
      'No active account alias found in storage',
      activeAlias,
      'background',
    );
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
    void logService.logException(
      'Failed to retrieve vault data from memory',
      activeAlias,
      'background',
    );
    return null;
  }

  const vaultData = vaultRes.vaultData as { accounts?: any[] };
  const storedKey = (vaultData.accounts || []).find((acc) => acc.alias === activeAlias);

  if (!storedKey) {
    console.error('[BEX] No account found in vault for alias:', activeAlias);
    void logService.logException(
      `No account found in vault for alias: ${activeAlias}`,
      activeAlias,
      'background',
    );
    return null;
  }

  console.log('[BEX] Active account found:', activeAlias);
  return storedKey;
}

import type {
  GetPublicKeyRequest,
  GetPublicKeyResponse,
  SignEventRequest,
  SignEventResponse,
} from './types/bridge';

declare module '@quasar/app-vite' {
  interface BexEventMap {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    'nostr.getPublicKey': [GetPublicKeyRequest, GetPublicKeyResponse];
    'nostr.signEvent': [SignEventRequest, SignEventResponse];
    'nostr.getRelays': [{ origin: string }, any];
    'nostr.nip04.encrypt': [{ pubkey: string; plaintext: string; origin: string }, any];
    'nostr.nip04.decrypt': [{ pubkey: string; ciphertext: string; origin: string }, any];
    'nostr.approval.respond': [{ approved: boolean; duration: string }, void];
    'vault.unlock': [{ password: string }, any];
    'vault.lock': [undefined, void];
    'vault.create': [{ password: string; vaultData: any }, any];
    'vault.isUnlocked': [undefined, boolean];
    'vault.getData': [undefined, any];
    'vault.updateData': [{ vaultData: any }, any];
    'vault.export': [undefined, any];
    'vault.import': [{ encryptedData: string }, any];
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
  getActiveAlias().then((alias) => {
    void logService.logException(`Failed to create bridge: ${String(e)}`, alias, 'background');
  });
}

function notifyLockStatusChanged(unlocked: boolean) {
  if (bridge && bridge.portList) {
    bridge.portList.forEach((portName: string) => {
      bridge
        .send({
          event: 'vault.lock-status-changed',
          to: portName,
          payload: { unlocked },
        })
        .catch(() => {
          // Ignore errors if a port disconnected
        });
    });
  }
}

// Global ping handler for diagnostics
bridge.on('ping', () => {
  console.log('[BEX] Received ping');
  return 'pong';
});

// Global error handlers for logging exceptions
if (typeof self !== 'undefined') {
  self.addEventListener('error', async (event: any) => {
    const activeAlias = await getActiveAlias();
    void logService.logException(event.message || 'Unknown error', activeAlias, 'background');
  });

  self.addEventListener('unhandledrejection', async (event: any) => {
    const activeAlias = await getActiveAlias();
    void logService.logException(
      event.reason?.message || String(event.reason),
      activeAlias,
      'background',
    );
  });
}

const getHostname = (origin: string) => {
  try {
    return new URL(origin).hostname;
  } catch (e) {
    return origin;
  }
};

interface ApprovalPromise {
  resolve: (value: { approved: boolean; duration: string }) => void;
  reject: (reason?: any) => void;
}

let approvalPromise: ApprovalPromise | null = null;

bridge.on(
  'nostr.approval.respond',
  ({ payload: { approved, duration } }: { payload: { approved: boolean; duration: string } }) => {
    console.log('[BEX] Received nostr.approval.respond:', approved, duration);
    if (approvalPromise) {
      approvalPromise.resolve({ approved, duration });
      approvalPromise = null;
    } else {
      console.warn('[BEX] Received approval response but no approvalPromise was found');
    }
    return true;
  },
);

bridge.on('vault.unlock', async ({ payload: { password } }: { payload: { password: string } }) => {
  const result = await unlockVault(password);
  if (result.success) {
    updateLastActivity();
    startAutoLockTimer();
  }
  return result;
});

bridge.on('vault.lock', async () => {
  await lockVault();
  stopAutoLockTimer();
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

bridge.on('activity.mark', () => {
  updateLastActivity();
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

// Restore vault state from session storage on startup
async function initialize() {
  console.log('[BEX] Service worker initializing...');
  try {
    const items = await chrome.storage.local.get(['vault:last-activity']);
    if (items['vault:last-activity']) {
      lastActivityAt = Number(items['vault:last-activity']);
      console.log('[BEX] Restored last activity:', new Date(lastActivityAt).toLocaleTimeString());
    }

    const restored = await restoreVaultState();
    if (restored) {
      console.log('[BEX] Vault state restored from session');
      startAutoLockTimer();
      // Force a check immediately in case we were inactive for a long time
      void checkAutoLock();
    }
  } catch (e) {
    console.error('[BEX] Initialization error:', e);
  }
}

void initialize();

bridge.on('vault.export', async () => {
  return await exportVault();
});

bridge.on('vault.import', async ({ payload }: { payload: { encryptedData: string } }) => {
  const { encryptedData } = payload;
  const result = await importVault(encryptedData);
  if (result.success) {
    notifyLockStatusChanged(false);
  }
  return result;
});

// Add direct chrome.runtime.onMessage listener as a fallback for the bridge
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'vault.isUnlocked') {
    sendResponse(isVaultUnlocked());
    return true;
  }
  if (message.type === 'vault.unlock') {
    unlockVault(message.payload.password).then((result) => {
      if (result.success) {
        updateLastActivity();
        startAutoLockTimer();
      }
      sendResponse(result);
    });
    return true;
  }
  if (message.type === 'vault.lock') {
    lockVault().then(() => {
      stopAutoLockTimer();
      sendResponse(true);
    });
    return true;
  }
  if (message.type === 'activity.mark') {
    updateLastActivity();
    sendResponse(true);
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
  if (message.type === 'vault.export') {
    exportVault().then(sendResponse);
    return true;
  }
  if (message.type === 'vault.import') {
    importVault(message.payload.encryptedData).then((result) => {
      if (result.success) {
        notifyLockStatusChanged(false);
      }
      sendResponse(result);
    });
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

  const hostname = getHostname(origin);
  const activeAlias = await getActiveAlias();
  const PERMISSIONS_KEY = `permissions:${activeAlias || 'default'}`;

  // Check existing permissions
  const items = await chrome.storage.local.get([PERMISSIONS_KEY]);
  const permissions = items[PERMISSIONS_KEY] || {};
  const perm = permissions[hostname];

  if (perm && perm.approved) {
    if (perm.duration === 'always') {
      console.log('[BEX] Valid "always" permission found for:', hostname);
      return true;
    }
    if (perm.duration === '8h' && perm.timestamp) {
      const eightHours = 8 * 60 * 60 * 1000;
      if (Date.now() - perm.timestamp < eightHours) {
        console.log('[BEX] Valid "8h" permission found for:', hostname);
        return true;
      }
      console.log('[BEX] "8h" permission expired for:', hostname);
    }
  }

  // If vault is locked, open the unlock popup so the user can unlock the vault
  if (!isVaultUnlocked()) {
    console.warn('[BEX] Vault is locked, opening unlock popup');

    // Notify UI listeners of locked status
    notifyLockStatusChanged(false);

    try {
      // Open login page with a redirect parameter to the approve page
      const loginUrl = chrome.runtime.getURL(
        `www/index.html#/login?redirect=/approve&origin=${encodeURIComponent(origin)}`,
      );
      const win = await chrome.windows.create({
        url: loginUrl,
        type: 'popup',
        width: 450,
        height: 700,
        focused: true,
      });

      const windowId = win.id;

      // Wait for the vault to be unlocked or window to be closed
      return new Promise<boolean>((resolve) => {
        const checkStatus = setInterval(async () => {
          if (isVaultUnlocked()) {
            clearInterval(checkStatus);
            chrome.windows.onRemoved.removeListener(onRemoved);
            // Once unlocked, we call requestApproval again which will now open the actual approval page
            resolve(requestApproval(origin));
          }
        }, 1000);

        const onRemoved = (closedWindowId: number) => {
          if (closedWindowId === windowId) {
            clearInterval(checkStatus);
            chrome.windows.onRemoved.removeListener(onRemoved);
            resolve(false);
          }
        };
        chrome.windows.onRemoved.addListener(onRemoved);
      });
    } catch (e) {
      console.error('[BEX] Failed to handle locked vault:', e);
      return false;
    }
  }

  // If there's already a pending approval, we might want to queue it or reject it.
  // For simplicity, let's reject it for now.
  if (approvalPromise) {
    throw new Error('Another approval request is already pending');
  }

  const url = chrome.runtime.getURL(`www/index.html#/approve?origin=${encodeURIComponent(origin)}`);

  let windowId: number | undefined;

  const promise = new Promise<{ approved: boolean; duration: string }>((resolve, reject) => {
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
    }, REQUEST_TIMEOUT_MS);

    // Wrap resolve/reject to clear timeout and listener
    const originalResolve = approvalPromise!.resolve;
    const originalReject = approvalPromise!.reject;

    // Handle manual window closure
    const onRemovedHandler = (closedWindowId: number) => {
      if (closedWindowId === windowId) {
        if (approvalPromise) {
          console.log('[BEX] Approval window closed manually');
          approvalPromise.resolve({ approved: false, duration: 'once' });
          approvalPromise = null;
        }
      }
    };
    chrome.windows.onRemoved.addListener(onRemovedHandler);

    if (approvalPromise) {
      approvalPromise.resolve = async (val) => {
        clearTimeout(timeout);
        chrome.windows.onRemoved.removeListener(onRemovedHandler);

        // Store permission if not "once"
        if (val.approved && val.duration !== 'once') {
          try {
            const currentItems = await chrome.storage.local.get([PERMISSIONS_KEY]);
            const currentPermissions = currentItems[PERMISSIONS_KEY] || {};
            currentPermissions[hostname] = {
              approved: true,
              duration: val.duration,
              timestamp: Date.now(),
            };
            await chrome.storage.local.set({ [PERMISSIONS_KEY]: currentPermissions });
            console.log(`[BEX] Stored permission "${val.duration}" for:`, hostname);
          } catch (e) {
            console.error('[BEX] Failed to store permission:', e);
          }
        }

        originalResolve(val as any);
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
      height: 700,
      focused: true,
    });
    windowId = win.id;
  } catch (err) {
    console.error('[BEX] Failed to create approval window:', err);
    const alias = await getActiveAlias();
    void logService.logException(
      `Failed to create approval window: ${String(err)}`,
      alias,
      'background',
    );
    const currentPromise = approvalPromise as ApprovalPromise | null;
    if (currentPromise) {
      currentPromise.reject(err);
      approvalPromise = null;
    }
  }

  return promise.then((res) => res.approved);
}

bridge.on(
  'nostr.getPublicKey',
  async ({ payload: { origin } }: { payload: GetPublicKeyRequest }) => {
    updateLastActivity();
    console.log('[BEX] Handling nostr.getPublicKey for:', origin);
    const activeStoredKey = await getActiveStoredKey();
    void logService.logApproval('get_public_key', getHostname(origin), activeStoredKey?.alias);
    const approved = await requestApproval(origin);

    console.log('[BEX] Approval result for getPublicKey:', approved);
    if (!approved) {
      if (!isVaultUnlocked()) {
        const error: BridgeError = {
          code: 'VAULT_LOCKED',
          message: 'Vault is locked. Please open the extension to unlock.',
        };
        throw error;
      }
      const error: BridgeError = {
        code: 'PERMISSION_DENIED',
        message: 'User rejected the request',
      };
      throw error;
    }

    if (!activeStoredKey) {
      const error: BridgeError = {
        code: 'NOT_FOUND',
        message: 'No active account found',
      };
      throw error;
    }
    console.log('[BEX] Returning pubkey:', activeStoredKey.id);
    return activeStoredKey.id;
  },
);

bridge.on(
  'nostr.signEvent',
  async ({ payload: { event, origin } }: { payload: SignEventRequest }) => {
    updateLastActivity();
    console.log('[BEX] Handling nostr.signEvent for:', origin, event);
    const activeStoredKey = await getActiveStoredKey();
    void logService.logApproval(event.kind, getHostname(origin), activeStoredKey?.alias);
    const approved = await requestApproval(origin);

    console.log('[BEX] Approval result for signEvent:', approved);
    if (!approved) {
      if (!isVaultUnlocked()) {
        const error: BridgeError = {
          code: 'VAULT_LOCKED',
          message: 'Vault is locked. Open the extension to unlock.',
        };
        throw error;
      }
      const error: BridgeError = {
        code: 'PERMISSION_DENIED',
        message: 'User rejected the request',
      };
      throw error;
    }

    if (!activeStoredKey) {
      const error: BridgeError = {
        code: 'NOT_FOUND',
        message: 'No active account found',
      };
      throw error;
    }
    // Ensure the event has the correct pubkey
    event.pubkey = activeStoredKey.id;

    try {
      // finalizeEvent from nostr-tools v2
      const sk = hexToBytes(activeStoredKey.account.privkey);
      const signedEvent = finalizeEvent(event, sk);
      console.log('[BEX] Returning signed event:', signedEvent);
      return signedEvent;
    } catch (e: any) {
      const error: BridgeError = {
        code: 'SIGNING_FAILED',
        message: e.message || String(e),
      };
      throw error;
    }
  },
);

bridge.on('nostr.getRelays', async ({ payload: { origin } }: { payload: { origin: string } }) => {
  updateLastActivity();
  const activeStoredKey = await getActiveStoredKey();
  void logService.logApproval('get_relays', getHostname(origin), activeStoredKey?.alias);
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
    updateLastActivity();
    const activeStoredKey = await getActiveStoredKey();
    void logService.logApproval('nip04_encrypt', getHostname(origin), activeStoredKey?.alias);
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
    updateLastActivity();
    const activeStoredKey = await getActiveStoredKey();
    void logService.logApproval('nip04_decrypt', getHostname(origin), activeStoredKey?.alias);
    const approved = await requestApproval(origin);
    if (!approved) {
      if (!isVaultUnlocked()) {
        throw new Error('Vault is locked. Open the extension to unlock.');
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
    updateLastActivity();
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
        const alias = await getActiveAlias();
        void logService.logException(
          `Error in blossom.upload: ${finalError?.message || String(finalError)}`,
          alias,
          'background',
        );
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
