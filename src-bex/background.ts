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
  StoredKey,
} from 'src/types/bridge';
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

class BackgroundBridgeError extends Error implements BridgeError {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'BackgroundBridgeError';
    this.code = code;
  }
}

async function getActiveAlias(): Promise<string | null> {
  return (await storageService.get<string>(NOSTR_ACTIVE)) ?? null;
}

async function getActiveStoredKey(): Promise<StoredKey | null> {
  const isUnlockedResult = await handleVaultIsUnlocked({}, '');
  if (!isUnlockedResult.success || !isUnlockedResult.data) {
    return null;
  }
  const activeAlias = await getActiveAlias();

  if (!activeAlias) {
    const vaultDataRes = await handleVaultGetData({}, '');
    if (vaultDataRes.success && vaultDataRes.data.vaultData) {
      const vaultData = vaultDataRes.data.vaultData;
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

  const vaultRes = await handleVaultGetData({}, '');
  if (!vaultRes.success || !vaultRes.data.vaultData) {
    return null;
  }

  const vaultData = vaultRes.data.vaultData;
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

bridge.on('ping', async (): Promise<BridgeResponsePayload<'ping'>> => {
  const result = await dispatchMessage('ping', createBridgeRequest('ping', {}), '');
  return result || 'pong';
});

if (typeof self !== 'undefined') {
  self.addEventListener('error', (event: ErrorEvent) => {
    void (async () => {
      const activeAlias = await getActiveAlias();
      await logService.logException(event.message || 'Unknown error', activeAlias, 'background');
    })();
  });

  self.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    void (async () => {
      const activeAlias = await getActiveAlias();
      await logService.logException(
        event.reason instanceof Error ? event.reason.message : String(event.reason),
        activeAlias,
        'background',
      );
    })();
  });
}

const getHostname = (origin: string): string => {
  try {
    return new URL(origin).hostname;
  } catch {
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

const getApprovalPromise = (): ApprovalPromise | null => approvalPromise;

let approvalPromise: ApprovalPromise | null = null;

bridge.on('nostr.approval.respond', ({ payload }) => {
  if (approvalPromise) {
    approvalPromise.resolve({ approved: payload.approved, duration: payload.duration });
    approvalPromise = null;
  }
  return true;
});

bridge.on('vault.unlock', ({ payload }) => {
  return dispatchMessage('vault.unlock', createBridgeRequest('vault.unlock', payload), '') as unknown as BridgeResponsePayload<'vault.unlock'>;
});

bridge.on('vault.lock', () => {
  return dispatchMessage('vault.lock', createBridgeRequest('vault.lock', {}), '') as unknown as BridgeResponsePayload<'vault.lock'>;
});

bridge.on('vault.create', ({ payload }) => {
  return dispatchMessage('vault.create', createBridgeRequest('vault.create', payload), '') as unknown as BridgeResponsePayload<'vault.create'>;
});

bridge.on('vault.isUnlocked', () => {
  return dispatchMessage('vault.isUnlocked', createBridgeRequest('vault.isUnlocked', {}), '') as unknown as BridgeResponsePayload<'vault.isUnlocked'>;
});

bridge.on('activity.mark', () => {
  return dispatchMessage('activity.mark', createBridgeRequest('activity.mark', {}), '') as unknown as BridgeResponsePayload<'activity.mark'>;
});

bridge.on('vault.getData', () => {
  return dispatchMessage('vault.getData', createBridgeRequest('vault.getData', {}), '') as unknown as BridgeResponsePayload<'vault.getData'>;
});

bridge.on('vault.updateData', ({ payload }) => {
  return dispatchMessage('vault.updateData', createBridgeRequest('vault.updateData', payload), '') as unknown as BridgeResponsePayload<'vault.updateData'>;
});

bridge.on('vault.export', () => {
  return dispatchMessage('vault.export', createBridgeRequest('vault.export', {}), '') as unknown as BridgeResponsePayload<'vault.export'>;
});

bridge.on('vault.import', ({ payload }) => {
  return dispatchMessage('vault.import', createBridgeRequest('vault.import', payload), '') as unknown as BridgeResponsePayload<'vault.import'>;
});

async function initialize(): Promise<void> {
  try {
    await restoreLastActivity();
    const restored = await restoreVaultState();
    if (restored) {
      startAutoLockTimer();
      await checkAutoLock();
    }
    void loadSeedRelays().catch((error: unknown) => {
      logService.log(LogLevel.ERROR, '[BEX] Failed to seed relay catalog', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  } catch (error: unknown) {
    logService.log(LogLevel.ERROR, '[BEX] Initialization error:', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

void initialize();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  void dispatchMessage(message.type, message.payload || {}, '')
    .then((response) => {
      if (response !== null) {
        sendResponse(response);
      }
    })
    .catch((error: unknown) => {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
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
        const checkStatus = setInterval(() => {
          void handleVaultIsUnlocked({}, '').then((status) => {
            if (status.success && status.data) {
              clearInterval(checkStatus);
              chrome.windows.onRemoved.removeListener(onRemoved);
              void requestApproval(origin, eventKind).then(resolve);
            }
          });
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
    } catch {
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

    const currentApprovalPromise = approvalPromise;
    if (!currentApprovalPromise) {
      reject(new Error('Approval request state was not initialized'));
      return;
    }

    const originalResolve = currentApprovalPromise.resolve;
    const originalReject = currentApprovalPromise.reject;

    const onRemovedHandler = (closedWindowId: number) => {
      if (closedWindowId === windowId && approvalPromise) {
        approvalPromise.resolve({ approved: false, duration: 'once' });
        approvalPromise = null;
      }
    };
    chrome.windows.onRemoved.addListener(onRemovedHandler);

    approvalPromise.resolve = (val: ApprovalResponse) => {
      clearTimeout(timeout);
      chrome.windows.onRemoved.removeListener(onRemovedHandler);
      void (async () => {
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
      })();
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
  } catch (error: unknown) {
    const pendingApproval = getApprovalPromise();
    if (pendingApproval) {
      pendingApproval.reject(error);
      approvalPromise = null;
    }
  }
  return promise.then((res) => res.approved);
}

bridge.on('nostr.getPublicKey', ({ payload: { origin } }) => (
  (async () => {
    void resetAutoLockTimer();
    const result = await handleGetPublicKey({}, origin);
    if (!result.success) {
      throw new BackgroundBridgeError(
        result.error === 'Vault is locked' ? 'VAULT_LOCKED' : 'NOT_FOUND',
        result.error,
      );
    }
    const activeStoredKey = await getActiveStoredKey();
    void logService.logApproval('get_public_key', getHostname(origin), activeStoredKey?.alias);
    const approved = await requestApproval(origin, -1);
    if (!approved) {
      throw new BackgroundBridgeError('PERMISSION_DENIED', 'User rejected the request');
    }
    return result.data;
  })() as unknown as BridgeResponsePayload<'nostr.getPublicKey'>
));

bridge.on('nostr.signEvent', ({ payload: { event, origin } }) => (
  (async () => {
    void resetAutoLockTimer();
    const activeStoredKey = await getActiveStoredKey();
    void logService.logApproval(event.kind, getHostname(origin), activeStoredKey?.alias);
    const approved = await requestApproval(origin, event.kind);
    if (!approved) {
      const unlockedStatus = await handleVaultIsUnlocked({}, '');
      if (!unlockedStatus.success || !unlockedStatus.data) {
        throw new BackgroundBridgeError('VAULT_LOCKED', 'Vault is locked. Open the extension to unlock.');
      }
      throw new BackgroundBridgeError('PERMISSION_DENIED', 'User rejected the request');
    }
    const result = await handleSignEvent({ event }, origin);
    if (!result.success) {
      throw new BackgroundBridgeError(
        result.error === 'Vault is locked'
          ? 'VAULT_LOCKED'
          : result.error === 'Permission denied'
            ? 'PERMISSION_DENIED'
            : 'SIGNING_FAILED',
        result.error,
      );
    }
    return result.data;
  })() as unknown as BridgeResponsePayload<'nostr.signEvent'>
));

bridge.on('nostr.getRelays', ({ payload: { origin } }) => (
  (async () => {
    void resetAutoLockTimer();
    const activeStoredKey = await getActiveStoredKey();
    void logService.logApproval('get_relays', getHostname(origin), activeStoredKey?.alias);
    const approved = await requestApproval(origin, -1);
    if (!approved) {
      const unlockedStatus = await handleVaultIsUnlocked({}, '');
      if (!unlockedStatus.success || !unlockedStatus.data) throw new Error('Vault is locked. Open the extension to unlock.');
      throw new Error('User rejected the request');
    }
    return await dispatchMessage('nostr.getRelays', createBridgeRequest('nostr.getRelays', { origin }), origin) ?? {};
  })() as unknown as BridgeResponsePayload<'nostr.getRelays'>
));

bridge.on('nostr.nip04.encrypt', ({ payload }) => (
  (async () => {
    void resetAutoLockTimer();
    const activeStoredKey = await getActiveStoredKey();
    void logService.logApproval('nip04_encrypt', getHostname(payload.origin), activeStoredKey?.alias);
    const approved = await requestApproval(payload.origin, -1);
    if (!approved) {
      const unlockedStatus = await handleVaultIsUnlocked({}, '');
      if (!unlockedStatus.success || !unlockedStatus.data) throw new Error('Vault is locked. Open the extension to unlock.');
      throw new Error('User rejected the request');
    }
    return await dispatchMessage('nostr.nip04.encrypt', createBridgeRequest('nostr.nip04.encrypt', payload), payload.origin) ?? '';
  })() as unknown as BridgeResponsePayload<'nostr.nip04.encrypt'>
));

bridge.on('nostr.nip04.decrypt', ({ payload }) => (
  (async () => {
    void resetAutoLockTimer();
    const activeStoredKey = await getActiveStoredKey();
    void logService.logApproval('nip04_decrypt', getHostname(payload.origin), activeStoredKey?.alias);
    const approved = await requestApproval(payload.origin, -1);
    if (!approved) {
      const unlockedStatus = await handleVaultIsUnlocked({}, '');
      if (!unlockedStatus.success || !unlockedStatus.data) throw new Error('Vault is locked. Open the extension to unlock.');
      throw new Error('User rejected the request');
    }
    return await dispatchMessage('nostr.nip04.decrypt', createBridgeRequest('nostr.nip04.decrypt', payload), payload.origin) ?? '';
  })() as unknown as BridgeResponsePayload<'nostr.nip04.decrypt'>
));

bridge.on('blossom.upload', ({ payload }) => {
  void resetAutoLockTimer();
  return dispatchMessage('blossom.upload', createBridgeRequest('blossom.upload', payload), '') as unknown as BridgeResponsePayload<'blossom.upload'>;
});

bridge.on('relay.browser.list', () => {
  return dispatchMessage('relay.browser.list', createBridgeRequest('relay.browser.list', {}), '') as unknown as BridgeResponsePayload<'relay.browser.list'>;
});

bridge.on('relay.browser.getStatus', () => {
  return dispatchMessage('relay.browser.getStatus', createBridgeRequest('relay.browser.getStatus', {}), '') as unknown as BridgeResponsePayload<'relay.browser.getStatus'>;
});

bridge.on('relay.browser.refresh', ({ payload }) => {
  return dispatchMessage('relay.browser.refresh', createBridgeRequest('relay.browser.refresh', payload), '') as unknown as BridgeResponsePayload<'relay.browser.refresh'>;
});
