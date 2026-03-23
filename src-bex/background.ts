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
} from './constants';
import {
  startAutoLockTimer,
  stopAutoLockTimer,
  resetAutoLockTimer,
  restoreLastActivity,
  checkAutoLock,
} from './services/auto-lock';
import type {
  BridgeRequest,
  BridgeResponsePayload,
  VaultData,
} from 'src/types/bridge';
import type { BridgeError } from './types/bridge';
import {
  handleVaultUnlock,
  handleVaultLock,
  handleVaultIsUnlocked,
  handleVaultCreate,
  handleVaultGetData,
  handleVaultUpdateData,
  handleVaultExport,
  handleVaultImport,
  restoreVaultState,
} from './handlers/vault-handler';
import {
  checkPermission,
  grantPermission,
} from './handlers/permission-handler';

const NOSTR_ACTIVE = 'nostr:active';
const BLOSSOM_UPLOAD_STATUS = 'blossom:upload_status';

async function getActiveAlias() {
  const items = await chrome.storage.local.get([NOSTR_ACTIVE]);
  return items[NOSTR_ACTIVE];
}

async function getActiveStoredKey() {
  console.log('[BEX] Getting active account...');
  const isUnlockedResult = await handleVaultIsUnlocked({}, '');
  if (!isUnlockedResult.success || !isUnlockedResult.data) {
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
      String(activeAlias),
      'background',
    );
    // If no active alias is set, try to pick the first one from the vault as a fallback
    const vaultDataRes = await handleVaultGetData({}, '');
    if (vaultDataRes.success && vaultDataRes.data.vaultData) {
      const vaultData = vaultDataRes.data.vaultData as VaultData;
      const accounts = vaultData.accounts || [];
      if (accounts.length > 0) {
        console.log('[BEX] Fallback: Using first account from vault');
        const fallbackAccount = accounts[0];
        if (fallbackAccount) {
          await chrome.storage.local.set({ [NOSTR_ACTIVE]: fallbackAccount.alias });
          return fallbackAccount;
        }
      }
    }
    return null;
  }

  const vaultRes = await handleVaultGetData({}, '');
  if (!vaultRes.success || !vaultRes.data.vaultData) {
    console.error('[BEX] Failed to retrieve vault data from memory');
    void logService.logException(
      'Failed to retrieve vault data from memory',
      activeAlias,
      'background',
    );
    return null;
  }

  const vaultData = vaultRes.data.vaultData as VaultData;
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
    'nostr.getPublicKey': [GetPublicKeyRequest, GetPublicKeyResponse];
    'nostr.signEvent': [SignEventRequest, SignEventResponse];
    'nostr.getRelays': [{ origin: string }, BridgeResponsePayload<'nostr.getRelays'>];
    'nostr.nip04.encrypt': [
      { pubkey: string; plaintext: string; origin: string },
      BridgeResponsePayload<'nostr.nip04.encrypt'>,
    ];
    'nostr.nip04.decrypt': [
      { pubkey: string; ciphertext: string; origin: string },
      BridgeResponsePayload<'nostr.nip04.decrypt'>,
    ];
    'nostr.approval.respond': [{ approved: boolean; duration: string }, void];
    'vault.unlock': [{ password: string }, BridgeResponsePayload<'vault.unlock'>];
    'vault.lock': [undefined, BridgeResponsePayload<'vault.lock'>];
    'vault.create': [
      { password: string; vaultData: VaultData },
      BridgeResponsePayload<'vault.create'>,
    ];
    'vault.isUnlocked': [undefined, boolean];
    'vault.getData': [undefined, BridgeResponsePayload<'vault.getData'>];
    'vault.updateData': [{ vaultData: VaultData }, BridgeResponsePayload<'vault.updateData'>];
    'vault.export': [undefined, BridgeResponsePayload<'vault.export'>];
    'vault.import': [{ encryptedData: string }, BridgeResponsePayload<'vault.import'>];
    'blossom.upload': [
      {
        base64Data: string;
        fileType: string;
        blossomServer: string;
        uploadId?: string;
      },
      BridgeResponsePayload<'blossom.upload'>,
    ];
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
bridge.on('ping', (): BridgeResponsePayload<'ping'> => {
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
  ({
    payload: { approved, duration },
  }: {
    payload: BridgeRequest<'nostr.approval.respond'>;
  }): BridgeResponsePayload<'nostr.approval.respond'> => {
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

bridge.on(
  'vault.unlock',
  async ({
    payload: { password },
  }: {
    payload: BridgeRequest<'vault.unlock'>;
  }): Promise<BridgeResponsePayload<'vault.unlock'>> => {
    const result = await handleVaultUnlock({ password }, '');
    if (result.success) {
      resetAutoLockTimer();
      startAutoLockTimer();
      return { success: true, vaultData: result.data.vaultData as VaultData };
    }
    return { success: false, error: result.error };
  },
);

bridge.on('vault.lock', async (): Promise<BridgeResponsePayload<'vault.lock'>> => {
  await handleVaultLock({}, '');
  stopAutoLockTimer();
  return { success: true };
});

bridge.on(
  'vault.create',
  async ({
    payload: { password, vaultData },
  }: {
    payload: BridgeRequest<'vault.create'>;
  }): Promise<BridgeResponsePayload<'vault.create'>> => {
    const result = await handleVaultCreate({ password, vaultData }, '');
    if (result.success) {
      return {
        success: true,
        ...(result.data.encryptedVault ? { encryptedVault: result.data.encryptedVault } : {}),
      };
    }
    return { success: false, error: result.error };
  },
);

bridge.on('vault.isUnlocked', async (): Promise<BridgeResponsePayload<'vault.isUnlocked'>> => {
  const result = await handleVaultIsUnlocked({}, '');
  return result.success ? result.data : false;
});

bridge.on('activity.mark', (): BridgeResponsePayload<'activity.mark'> => {
  resetAutoLockTimer();
});

bridge.on('vault.getData', async (): Promise<BridgeResponsePayload<'vault.getData'>> => {
  const result = await handleVaultGetData({}, '');
  if (result.success) {
    return { success: true, vaultData: result.data.vaultData as VaultData };
  }
  return { success: false, error: result.error };
});

bridge.on(
  'vault.updateData',
  async ({
    payload: { vaultData },
  }: {
    payload: BridgeRequest<'vault.updateData'>;
  }): Promise<BridgeResponsePayload<'vault.updateData'>> => {
    const result = await handleVaultUpdateData({ vaultData }, '');
    if (result.success) {
      return { success: true };
    }
    return { success: false, error: result.error };
  },
);

// Restore vault state from session storage on startup
async function initialize() {
  console.log('[BEX] Service worker initializing...');
  try {
    await restoreLastActivity();
    const restored = await restoreVaultState();
    if (restored) {
      startAutoLockTimer();
      checkAutoLock();
    }
  } catch (e) {
    console.error('[BEX] Initialization error:', e);
  }
}

void initialize();

  bridge.on('vault.export', async (): Promise<BridgeResponsePayload<'vault.export'>> => {
    const result = await handleVaultExport({}, '');
    if (result.success) {
      return {
        success: true,
        ...(result.data.encryptedData ? { encryptedData: result.data.encryptedData } : {}),
      };
    }
    return { success: false, error: result.error };
  });

bridge.on(
  'vault.import',
  async ({
    payload,
  }: {
    payload: BridgeRequest<'vault.import'>;
  }): Promise<BridgeResponsePayload<'vault.import'>> => {
    const encryptedData = (payload as any).encryptedData || payload.payload.encryptedData;
    const result = await handleVaultImport({ encryptedData }, '');
    if (result.success) {
      notifyLockStatusChanged(false);
      return { success: true };
    }
    return { success: false, error: result.error };
  },
);

// Add direct chrome.runtime.onMessage listener as a fallback for the bridge
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'vault.isUnlocked') {
    handleVaultIsUnlocked({}, '').then((result) => {
      sendResponse(result.success ? result.data : false);
    });
    return true;
  }
  if (message.type === 'vault.unlock') {
    handleVaultUnlock({ password: message.payload.password }, '').then((result) => {
      if (result.success) {
        // Reset auto-lock timer
        resetAutoLockTimer();
        startAutoLockTimer();
        sendResponse({ success: true, vaultData: result.data.vaultData });
      } else {
        sendResponse(result);
      }
    });
    return true;
  }
  if (message.type === 'vault.lock') {
    handleVaultLock({}, '').then((result) => {
      stopAutoLockTimer();
      sendResponse(result.success);
    });
    return true;
  }
  if (message.type === 'activity.mark') {
    resetAutoLockTimer();
    sendResponse(true);
    return true;
  }
  if (message.type === 'vault.create') {
    handleVaultCreate({ password: message.payload.password, vaultData: message.payload.vaultData }, '').then((result) => {
      if (result.success) {
        sendResponse({ success: true, encryptedVault: result.data.encryptedVault });
      } else {
        sendResponse(result);
      }
    });
    return true;
  }
  if (message.type === 'vault.getData') {
    handleVaultGetData({}, '').then((result) => {
      if (result.success) {
        sendResponse({ success: true, vaultData: result.data.vaultData });
      } else {
        sendResponse(result);
      }
    });
    return true;
  }
  if (message.type === 'vault.updateData') {
    handleVaultUpdateData({ vaultData: message.payload.vaultData }, '').then((result) => {
      if (result.success) {
        sendResponse({ success: true });
      } else {
        sendResponse(result);
      }
    });
    return true;
  }
  if (message.type === 'vault.export') {
    handleVaultExport({}, '').then((result) => {
      if (result.success) {
        sendResponse({ success: true, encryptedData: result.data.encryptedData });
      } else {
        sendResponse(result);
      }
    });
    return true;
  }
  if (message.type === 'vault.import') {
    handleVaultImport({ encryptedData: message.payload.encryptedData }, '').then((result) => {
      if (result.success) {
        notifyLockStatusChanged(false);
        sendResponse({ success: true });
      } else {
        sendResponse(result);
      }
    });
    return true;
  }
  if (message.type === 'ping') {
    sendResponse('pong');
    return true;
  }
  return false;
});

async function requestApproval(origin: string, eventKind: number): Promise<boolean> {
  console.log('[BEX] Requesting approval for:', origin, 'kind:', eventKind);

  const permission = await checkPermission(origin, eventKind);
  if (permission.granted) {
    console.log('[BEX] Valid permission found for:', origin, 'kind:', eventKind);
    return true;
  }

  // If vault is locked, open the unlock popup so the user can unlock the vault
  const isUnlockedStatus = await handleVaultIsUnlocked({}, '');
  if (!isUnlockedStatus.success || !isUnlockedStatus.data) {
    console.warn('[BEX] Vault is locked, opening unlock popup');

    // Notify UI listeners of locked status
    notifyLockStatusChanged(false);

    try {
      // Open login page with a redirect parameter to the approve page
      const loginUrl = chrome.runtime.getURL(
        `www/index.html#/login?redirect=/approve&origin=${encodeURIComponent(origin)}&kind=${eventKind}`,
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
          const status = await handleVaultIsUnlocked({}, '');
          if (status.success && status.data) {
            clearInterval(checkStatus);
            chrome.windows.onRemoved.removeListener(onRemoved);
            // Once unlocked, we call requestApproval again which will now open the actual approval page
            resolve(requestApproval(origin, eventKind));
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

  const url = chrome.runtime.getURL(
    `www/index.html#/approve?origin=${encodeURIComponent(origin)}&kind=${eventKind}`,
  );

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
            const duration = val.duration === 'always' ? 'always' : 'session';
            await grantPermission(origin, eventKind, duration);
            console.log(`[BEX] Stored permission "${duration}" for:`, origin, 'kind:', eventKind);
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
  async ({
    payload: { origin },
  }: {
    payload: BridgeRequest<'nostr.getPublicKey'>;
  }): Promise<BridgeResponsePayload<'nostr.getPublicKey'>> => {
    resetAutoLockTimer();
    console.log('[BEX] Handling nostr.getPublicKey for:', origin);
    const activeStoredKey = await getActiveStoredKey();
    void logService.logApproval('get_public_key', getHostname(origin), activeStoredKey?.alias);
    const approved = await requestApproval(origin, -1);

    console.log('[BEX] Approval result for getPublicKey:', approved);
    if (!approved) {
      const unlockedStatus = await handleVaultIsUnlocked({}, '');
      if (!unlockedStatus.success || !unlockedStatus.data) {
        throw {
          code: 'VAULT_LOCKED',
          message: 'Vault is locked. Please open the extension to unlock.',
        } as BridgeError;
      }
      throw {
        code: 'PERMISSION_DENIED',
        message: 'User rejected the request',
      } as BridgeError;
    }

    if (!activeStoredKey) {
      throw {
        code: 'NOT_FOUND',
        message: 'No active account found',
      } as BridgeError;
    }
    console.log('[BEX] Returning pubkey:', activeStoredKey.id);
    return activeStoredKey.id;
  },
);

bridge.on(
  'nostr.signEvent',
  async ({
    payload: { event, origin },
  }: {
    payload: BridgeRequest<'nostr.signEvent'>;
  }): Promise<BridgeResponsePayload<'nostr.signEvent'>> => {
    resetAutoLockTimer();
    console.log('[BEX] Handling nostr.signEvent for:', origin, event);
    const activeStoredKey = await getActiveStoredKey();
    void logService.logApproval(event.kind, getHostname(origin), activeStoredKey?.alias);
    const approved = await requestApproval(origin, event.kind);

    console.log('[BEX] Approval result for signEvent:', approved);
    if (!approved) {
      const unlockedStatus = await handleVaultIsUnlocked({}, '');
      if (!unlockedStatus.success || !unlockedStatus.data) {
        throw {
          code: 'VAULT_LOCKED',
          message: 'Vault is locked. Open the extension to unlock.',
        } as BridgeError;
      }
      throw {
        code: 'PERMISSION_DENIED',
        message: 'User rejected the request',
      } as BridgeError;
    }

    if (!activeStoredKey) {
      throw {
        code: 'NOT_FOUND',
        message: 'No active account found',
      } as BridgeError;
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
      throw {
        code: 'SIGNING_FAILED',
        message: e.message || String(e),
      } as BridgeError;
    }
  },
);

bridge.on(
  'nostr.getRelays',
  async ({
    payload: { origin },
  }: {
    payload: BridgeRequest<'nostr.getRelays'>;
  }): Promise<BridgeResponsePayload<'nostr.getRelays'>> => {
  resetAutoLockTimer();
  const activeStoredKey = await getActiveStoredKey();
  void logService.logApproval('get_relays', getHostname(origin), activeStoredKey?.alias);
  const approved = await requestApproval(origin, -1);
  if (!approved) {
    const unlockedStatus = await handleVaultIsUnlocked({}, '');
    if (!unlockedStatus.success || !unlockedStatus.data) {
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
    payload: BridgeRequest<'nostr.nip04.encrypt'>;
  }): Promise<BridgeResponsePayload<'nostr.nip04.encrypt'>> => {
    resetAutoLockTimer();
    const activeStoredKey = await getActiveStoredKey();
    void logService.logApproval('nip04_encrypt', getHostname(origin), activeStoredKey?.alias);
    const approved = await requestApproval(origin, -1);
    if (!approved) {
      const unlockedStatus = await handleVaultIsUnlocked({}, '');
      if (!unlockedStatus.success || !unlockedStatus.data) {
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
    payload: BridgeRequest<'nostr.nip04.decrypt'>;
  }): Promise<BridgeResponsePayload<'nostr.nip04.decrypt'>> => {
    resetAutoLockTimer();
    const activeStoredKey = await getActiveStoredKey();
    void logService.logApproval('nip04_decrypt', getHostname(origin), activeStoredKey?.alias);
    const approved = await requestApproval(origin, -1);
    if (!approved) {
      const unlockedStatus = await handleVaultIsUnlocked({}, '');
      if (!unlockedStatus.success || !unlockedStatus.data) {
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
    payload: BridgeRequest<'blossom.upload'>;
  }): void => {
    resetAutoLockTimer();
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

    void processUpload();
  },
);
