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
import { LogLevel, logService } from 'src/services/log-service';
import {
  NOSTR_ACTIVE,
  storageService,
} from 'src/services/storage-service';
import {
  REQUEST_TIMEOUT_MS,
} from './constants';
import {
  startAutoLockTimer,
  resetAutoLockTimer,
  restoreLastActivity,
  checkAutoLock,
} from './services/auto-lock';
import type {
  BridgeResponsePayload,
  VaultData,
  GetPublicKeyRequest,
  GetPublicKeyResponse,
  SignEventRequest,
  SignEventResponse,
  BridgeError,
} from 'src/types/bridge';
import type { HandlerResult } from './types/background';
import {
  handleVaultIsUnlocked,
  handleVaultGetData,
  restoreVaultState,
} from './handlers/vault-handler';
import {
  checkPermission,
  grantPermission,
} from './handlers/permission-handler';
import {
  handleGetPublicKey,
  handleSignEvent,
} from './handlers/nip07';
import { loadSeedRelays } from 'src/services/relay-catalog';
import { dispatchMessage } from './dispatcher';
import { createBridgeRequest } from 'src/types/bridge';

async function getActiveAlias() {
  return await storageService.get<string>(NOSTR_ACTIVE);
}

async function getActiveStoredKey() {
  const isUnlockedResult = (await handleVaultIsUnlocked({}, '')) as HandlerResult<boolean>;
  if (!isUnlockedResult.success || !isUnlockedResult.data) {
    return null;
  }
  const activeAlias = await getActiveAlias();

  if (!activeAlias) {
    const vaultDataRes = (await handleVaultGetData({}, '')) as HandlerResult<{ vaultData?: unknown }>;
    if (vaultDataRes.success && vaultDataRes.data.vaultData) {
      const vaultData = vaultDataRes.data.vaultData as VaultData;
      const accounts = vaultData.accounts || [];
      if (accounts.length > 0) {
        const fallbackAccount = accounts[0];
        if (fallbackAccount) {
          await storageService.set(NOSTR_ACTIVE, fallbackAccount.alias);
          return fallbackAccount;
        }
      }
    }
    return null;
  }

  const vaultRes = (await handleVaultGetData({}, '')) as HandlerResult<{ vaultData?: unknown }>;
  if (!vaultRes.success || !vaultRes.data.vaultData) {
    return null;
  }

  const vaultData = vaultRes.data.vaultData as VaultData;
  return (vaultData.accounts || []).find((acc) => acc.alias === activeAlias) || null;
}

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
    'nostr.approval.respond': [{ approved: boolean; duration: string }, BridgeResponsePayload<'nostr.approval.respond'>];
    'vault.unlock': [{ password: string }, BridgeResponsePayload<'vault.unlock'>];
    'vault.lock': [undefined, BridgeResponsePayload<'vault.lock'>];
    'vault.create': [
      { password: string; vaultData: VaultData },
      BridgeResponsePayload<'vault.create'>,
    ];
    'vault.isUnlocked': [undefined, BridgeResponsePayload<'vault.isUnlocked'>];
    'activity.mark': [undefined, BridgeResponsePayload<'activity.mark'>];
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
    'relay.browser.list': [undefined, BridgeResponsePayload<'relay.browser.list'>];
    'relay.browser.getStatus': [undefined, BridgeResponsePayload<'relay.browser.getStatus'>];
    'relay.browser.refresh': [{ force?: boolean }, BridgeResponsePayload<'relay.browser.refresh'>];
  }
}

type BexBridge = ReturnType<typeof createBridge>;

const bridgeHost = globalThis as typeof globalThis & {
  bridge?: BexBridge;
  $q?: { bex?: BexBridge };
};

logService.log(LogLevel.INFO, '[BEX] Initializing bridge');
let bridge: BexBridge;
try {
  bridge = createBridge({ debug: false });
  bridgeHost.bridge = bridge;
  if (bridgeHost.$q) {
    bridgeHost.$q.bex = bridge;
  }
} catch (error: unknown) {
  logService.log(LogLevel.ERROR, '[BEX] Failed to create bridge', {
    error: error instanceof Error ? error.message : String(error),
  });
  throw error;
}

bridge.on('ping', () => 'pong');

if (typeof self !== 'undefined') {
  self.addEventListener('error', async (event: ErrorEvent) => {
    const activeAlias = await getActiveAlias();
    void logService.logException(event.message || 'Unknown error', activeAlias, 'background');
  });

  self.addEventListener('unhandledrejection', async (event: PromiseRejectionEvent) => {
    const activeAlias = await getActiveAlias();
    void logService.logException(
      event.reason instanceof Error ? event.reason.message : String(event.reason),
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

interface ApprovalResponse {
  approved: boolean;
  duration: string;
}

interface ApprovalPromise {
  resolve: (value: ApprovalResponse) => void;
  reject: (reason?: unknown) => void;
}

let approvalPromise: ApprovalPromise | null = null;

bridge.on('nostr.approval.respond', ({ payload }) => {
  if (approvalPromise) {
    approvalPromise.resolve({ approved: payload.approved, duration: payload.duration });
    approvalPromise = null;
  }
  return true;
});

bridge.on('vault.unlock', ({ payload }) => {
  void dispatchMessage('vault.unlock', createBridgeRequest('vault.unlock', payload), '');
  return { success: false, error: 'Bridge response handled asynchronously' };
});

bridge.on('vault.lock', () => {
  void dispatchMessage('vault.lock', createBridgeRequest('vault.lock', {}), '');
  return { success: true };
});

bridge.on('vault.create', ({ payload }) => {
  void dispatchMessage('vault.create', createBridgeRequest('vault.create', payload), '');
  return { success: false, error: 'Bridge response handled asynchronously' };
});

bridge.on('vault.isUnlocked', () => {
  void dispatchMessage('vault.isUnlocked', createBridgeRequest('vault.isUnlocked', {}), '');
  return false;
});

bridge.on('activity.mark', () => {
  void dispatchMessage('activity.mark', createBridgeRequest('activity.mark', {}), '');
  return undefined;
});

bridge.on('vault.getData', () => {
  void dispatchMessage('vault.getData', createBridgeRequest('vault.getData', {}), '');
  return { success: false, error: 'Bridge response handled asynchronously' };
});

bridge.on('vault.updateData', ({ payload }) => {
  void dispatchMessage('vault.updateData', createBridgeRequest('vault.updateData', payload), '');
  return { success: false, error: 'Bridge response handled asynchronously' };
});

bridge.on('vault.export', () => {
  void dispatchMessage('vault.export', createBridgeRequest('vault.export', {}), '');
  return { success: false, error: 'Bridge response handled asynchronously' };
});

bridge.on('vault.import', ({ payload }) => {
  void dispatchMessage('vault.import', createBridgeRequest('vault.import', payload), '');
  return { success: false, error: 'Bridge response handled asynchronously' };
});

async function initialize() {
  try {
    await restoreLastActivity();
    const restored = await restoreVaultState();
    if (restored) {
      startAutoLockTimer();
      await checkAutoLock();
    }
    // Seed relay catalog on startup
    void loadSeedRelays().then(result => {
      logService.log(
        LogLevel.INFO,
        `[BEX] Seeded relay catalog: ${result.added} added, ${result.updated} updated`,
      );
    });
  } catch (e) {
    logService.log(LogLevel.ERROR, '[BEX] Initialization error:', { error: e });
  }
}

void initialize();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  dispatchMessage(message.type, message.payload || {}, '')
    .then((response) => {
      if (response !== null) {
        sendResponse(response);
      }
    });
  return true;
});

async function requestApproval(origin: string, eventKind: number): Promise<boolean> {
  const permission = await checkPermission(origin, eventKind);
  if (permission.granted) return true;

  const isUnlockedStatus = await handleVaultIsUnlocked({}, '');
  if (!isUnlockedStatus.success || !isUnlockedStatus.data) {
    try {
      const loginUrl = chrome.runtime.getURL(
        `www/index.html#/login?redirect=/approve?origin=${encodeURIComponent(origin)}&kind=${eventKind}`,
      );
      const win = await chrome.windows.create({ url: loginUrl, type: 'popup', width: 450, height: 700, focused: true });
      const windowId = win.id;

      return new Promise<boolean>((resolve) => {
        const checkStatus = setInterval(async () => {
          const status = await handleVaultIsUnlocked({}, '');
          if (status.success && status.data) {
            clearInterval(checkStatus);
            chrome.windows.onRemoved.removeListener(onRemoved);
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
      return false;
    }
  }

  if (approvalPromise) throw new Error('Another approval request is already pending');

  const url = chrome.runtime.getURL(`www/index.html#/approve?origin=${encodeURIComponent(origin)}&kind=${eventKind}`);
  let windowId: number | undefined;

  const promise = new Promise<ApprovalResponse>((resolve, reject) => {
    approvalPromise = { resolve, reject };
    const timeout = setTimeout(() => {
      if (approvalPromise) {
        approvalPromise.reject(new Error('Approval request timed out'));
        approvalPromise = null;
        if (windowId !== undefined) void chrome.windows.remove(windowId);
      }
    }, REQUEST_TIMEOUT_MS);

    const originalResolve = approvalPromise!.resolve;
    const originalReject = approvalPromise!.reject;

    const onRemovedHandler = (closedWindowId: number) => {
      if (closedWindowId === windowId && approvalPromise) {
        approvalPromise.resolve({ approved: false, duration: 'once' });
        approvalPromise = null;
      }
    };
    chrome.windows.onRemoved.addListener(onRemovedHandler);

    approvalPromise.resolve = async (val: ApprovalResponse) => {
      clearTimeout(timeout);
      chrome.windows.onRemoved.removeListener(onRemovedHandler);
      if (val.approved && val.duration !== 'once') {
        try {
          if (val.duration === 'always' || val.duration === '8h') {
            await grantPermission(origin, eventKind, val.duration);
          } else {
            logService.log(LogLevel.WARN, `[BEX] Received unsupported approval duration: ${val.duration}`);
          }
        } catch (error: unknown) {
          logService.log(LogLevel.ERROR, '[BEX] Failed to grant permission', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      originalResolve(val);
    };
    approvalPromise.reject = (err: unknown) => {
      clearTimeout(timeout);
      chrome.windows.onRemoved.removeListener(onRemovedHandler);
      originalReject(err);
    };
  });

  try {
    const win = await chrome.windows.create({ url, type: 'popup', width: 450, height: 700, focused: true });
    windowId = win.id;
  } catch (err) {
    const currentPromise = approvalPromise as ApprovalPromise | null;
    if (currentPromise) {
      currentPromise.reject(err);
      approvalPromise = null;
    }
  }
  return promise.then((res) => res.approved);
}

bridge.on('nostr.getPublicKey', ({ payload: { origin } }) => {
  resetAutoLockTimer();
  void (async () => {
    const result = await handleGetPublicKey({}, origin);
    if (!result.success) {
      throw { code: result.error === 'Vault is locked' ? 'VAULT_LOCKED' : 'NOT_FOUND', message: result.error } as BridgeError;
    }
    const activeStoredKey = await getActiveStoredKey();
    void logService.logApproval('get_public_key', getHostname(origin), activeStoredKey?.alias);
    const approved = await requestApproval(origin, -1);
    if (!approved) throw { code: 'PERMISSION_DENIED', message: 'User rejected the request' } as BridgeError;
  })();
  return '';
});

bridge.on('nostr.signEvent', ({ payload: { event, origin } }) => {
  resetAutoLockTimer();
  void (async () => {
    const activeStoredKey = await getActiveStoredKey();
    void logService.logApproval(event.kind, getHostname(origin), activeStoredKey?.alias);
    const approved = await requestApproval(origin, event.kind);
    if (!approved) {
      const unlockedStatus = await handleVaultIsUnlocked({}, '');
      if (!unlockedStatus.success || !unlockedStatus.data) {
        throw { code: 'VAULT_LOCKED', message: 'Vault is locked. Open the extension to unlock.' } as BridgeError;
      }
      throw { code: 'PERMISSION_DENIED', message: 'User rejected the request' } as BridgeError;
    }
    const result = await handleSignEvent({ event }, origin);
    if (!result.success) {
      throw {
        code: result.error === 'Vault is locked' ? 'VAULT_LOCKED' :
              result.error === 'Permission denied' ? 'PERMISSION_DENIED' : 'SIGNING_FAILED',
        message: result.error,
      } as BridgeError;
    }
  })();
  return {
    id: '',
    pubkey: '',
    sig: '',
    created_at: event.created_at,
    kind: event.kind,
    tags: event.tags,
    content: event.content,
  };
});

bridge.on('nostr.getRelays', ({ payload: { origin } }) => {
  resetAutoLockTimer();
  void (async () => {
    const activeStoredKey = await getActiveStoredKey();
    void logService.logApproval('get_relays', getHostname(origin), activeStoredKey?.alias);
    const approved = await requestApproval(origin, -1);
    if (!approved) {
      const unlockedStatus = await handleVaultIsUnlocked({}, '');
      if (!unlockedStatus.success || !unlockedStatus.data) throw new Error('Vault is locked. Open the extension to unlock.');
      throw new Error('User rejected the request');
    }
  })();
  return {};
});

bridge.on('nostr.nip04.encrypt', ({ payload }) => {
  resetAutoLockTimer();
  void (async () => {
    const activeStoredKey = await getActiveStoredKey();
    void logService.logApproval('nip04_encrypt', getHostname(payload.origin), activeStoredKey?.alias);
    const approved = await requestApproval(payload.origin, -1);
    if (!approved) {
      const unlockedStatus = await handleVaultIsUnlocked({}, '');
      if (!unlockedStatus.success || !unlockedStatus.data) throw new Error('Vault is locked. Open the extension to unlock.');
      throw new Error('User rejected the request');
    }
    void dispatchMessage('nostr.nip04.encrypt', createBridgeRequest('nostr.nip04.encrypt', payload), payload.origin);
  })();
  return '';
});

bridge.on('nostr.nip04.decrypt', ({ payload }) => {
  resetAutoLockTimer();
  void (async () => {
    const activeStoredKey = await getActiveStoredKey();
    void logService.logApproval('nip04_decrypt', getHostname(payload.origin), activeStoredKey?.alias);
    const approved = await requestApproval(payload.origin, -1);
    if (!approved) {
      const unlockedStatus = await handleVaultIsUnlocked({}, '');
      if (!unlockedStatus.success || !unlockedStatus.data) throw new Error('Vault is locked. Open the extension to unlock.');
      throw new Error('User rejected the request');
    }
    void dispatchMessage('nostr.nip04.decrypt', createBridgeRequest('nostr.nip04.decrypt', payload), payload.origin);
  })();
  return '';
});

bridge.on('blossom.upload', ({ payload }) => {
  resetAutoLockTimer();
  void dispatchMessage('blossom.upload', createBridgeRequest('blossom.upload', payload), '');
  return {};
});

bridge.on('relay.browser.list', () => {
  void dispatchMessage('relay.browser.list', createBridgeRequest('relay.browser.list', {}), '');
  return [];
});

bridge.on('relay.browser.getStatus', () => {
  void dispatchMessage('relay.browser.getStatus', createBridgeRequest('relay.browser.getStatus', {}), '');
  return null;
});

bridge.on('relay.browser.refresh', ({ payload }) => {
  void dispatchMessage('relay.browser.refresh', createBridgeRequest('relay.browser.refresh', payload), '');
  return false;
});
