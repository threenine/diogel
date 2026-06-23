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
import type { SendZapRequest } from 'src/types/nip57';
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
    'nostr.nip44.encrypt': [
      { pubkey: string; plaintext: string; origin: string },
      BridgeResponsePayload<'nostr.nip44.encrypt'>,
    ];
    'nostr.nip44.decrypt': [
      { pubkey: string; ciphertext: string; origin: string },
      BridgeResponsePayload<'nostr.nip44.decrypt'>,
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
    'nip47.connections.list': [undefined, BridgeResponsePayload<'nip47.connections.list'>];
    'nip47.connections.import': [
      { uri: string; label?: string; identityId?: string },
      BridgeResponsePayload<'nip47.connections.import'>,
    ];
    'nip47.connections.remove': [{ connectionId: string }, BridgeResponsePayload<'nip47.connections.remove'>];
    'nip47.connections.setActive': [{ connectionId: string }, BridgeResponsePayload<'nip47.connections.setActive'>];
    'nip47.getInfo': [{ connectionId: string }, BridgeResponsePayload<'nip47.getInfo'>];
    'nip47.getBalance': [{ connectionId: string }, BridgeResponsePayload<'nip47.getBalance'>];
    'nip47.payInvoice': [
      { connectionId: string; invoice: string },
      BridgeResponsePayload<'nip47.payInvoice'>,
    ];
    'nip47.payments.list': [undefined, BridgeResponsePayload<'nip47.payments.list'>];
    'nip57.getCapabilities': [{ origin: string }, BridgeResponsePayload<'nip57.getCapabilities'>];
    'nip57.sendZap': [
      { origin: string; request: SendZapRequest; approved?: boolean },
      BridgeResponsePayload<'nip57.sendZap'>,
    ];
    'nip57.zaps.list': [undefined, BridgeResponsePayload<'nip57.zaps.list'>];
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

bridge.on('nip47.connections.list', () => {
  return dispatchMessage('nip47.connections.list', createBridgeRequest('nip47.connections.list', {}), '') as unknown as BridgeResponsePayload<'nip47.connections.list'>;
});

bridge.on('nip47.connections.import', ({ payload }) => {
  return dispatchMessage('nip47.connections.import', createBridgeRequest('nip47.connections.import', payload), '') as unknown as BridgeResponsePayload<'nip47.connections.import'>;
});

bridge.on('nip47.connections.remove', ({ payload }) => {
  return dispatchMessage('nip47.connections.remove', createBridgeRequest('nip47.connections.remove', payload), '') as unknown as BridgeResponsePayload<'nip47.connections.remove'>;
});

bridge.on('nip47.connections.setActive', ({ payload }) => {
  return dispatchMessage('nip47.connections.setActive', createBridgeRequest('nip47.connections.setActive', payload), '') as unknown as BridgeResponsePayload<'nip47.connections.setActive'>;
});

bridge.on('nip47.getInfo', ({ payload }) => {
  return dispatchMessage('nip47.getInfo', createBridgeRequest('nip47.getInfo', payload), '') as unknown as BridgeResponsePayload<'nip47.getInfo'>;
});

bridge.on('nip47.getBalance', ({ payload }) => {
  return dispatchMessage('nip47.getBalance', createBridgeRequest('nip47.getBalance', payload), '') as unknown as BridgeResponsePayload<'nip47.getBalance'>;
});

bridge.on('nip47.payInvoice', ({ payload }) => {
  return dispatchMessage('nip47.payInvoice', createBridgeRequest('nip47.payInvoice', payload), '') as unknown as BridgeResponsePayload<'nip47.payInvoice'>;
});

bridge.on('nip47.payments.list', () => {
  return dispatchMessage('nip47.payments.list', createBridgeRequest('nip47.payments.list', {}), '') as unknown as BridgeResponsePayload<'nip47.payments.list'>;
});

// The vault's raw AES key is persisted to chrome.storage.session so it survives
// service worker restarts. Explicitly restrict that storage area to extension
// pages/background (never content scripts or web pages), regardless of the
// browser's default access level.
async function lockDownSessionStorage(): Promise<void> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.session?.setAccessLevel) {
      await chrome.storage.session.setAccessLevel({
        accessLevel: 'TRUSTED_CONTEXTS',
      });
    }
  } catch (error: unknown) {
    logService.log(LogLevel.ERROR, '[BEX] Failed to set session storage access level', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function initialize(): Promise<void> {
  try {
    await lockDownSessionStorage();
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

// Signing/encryption actions are scoped to the requesting page's origin for
// permission checks. This raw listener has no reliable origin of its own, so
// these actions must carry a non-empty `payload.origin` rather than falling
// back to '' (which could otherwise match a permission record with no origin).
const ORIGIN_SCOPED_ACTIONS = new Set([
  'nostr.getPublicKey',
  'nostr.signEvent',
  'nostr.getRelays',
  'nostr.nip04.encrypt',
  'nostr.nip04.decrypt',
  'nostr.nip44.encrypt',
  'nostr.nip44.decrypt',
  'nip57.getCapabilities',
  'nip57.sendZap',
]);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const payload = (message.payload || {}) as { origin?: unknown };

  if (ORIGIN_SCOPED_ACTIONS.has(message.type) && !payload.origin) {
    sendResponse({
      success: false,
      error: 'Missing origin for origin-scoped action',
    });
    return true;
  }

  void dispatchMessage(message.type, message.payload || {}, typeof payload.origin === 'string' ? payload.origin : '')
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

interface ApprovalRequestDetails {
  requestType: string;
  contentDescription?: string;
  allowRemember?: boolean;
}

const trimApprovalContentDescription = (content?: string): string | undefined => {
  const normalized = content?.replace(/\s+/g, ' ').trim();
  if (!normalized) return undefined;
  return normalized.length > 240 ? `${normalized.slice(0, 237)}...` : normalized;
};

const buildApprovalUrl = (
  path: 'approve' | 'login',
  origin: string,
  eventKind: number,
  details: ApprovalRequestDetails,
  approvalVaultLocked = false,
): string => {
  const query = new URLSearchParams({
    origin,
    kind: String(eventKind),
    requestType: details.requestType,
  });

  if (details.contentDescription) {
    query.set('contentDescription', details.contentDescription);
  }

  if (details.allowRemember === false) {
    query.set('allowRemember', 'false');
  }

  if (path === 'login') {
    query.set('redirect', '/approve');
  }

  if (approvalVaultLocked) {
    query.set('approvalVaultLocked', 'true');
  }

  return chrome.runtime.getURL(`www/index.html#/${path}?${query.toString()}`);
};

async function requestApproval(
  origin: string,
  eventKind: number,
  details: ApprovalRequestDetails,
): Promise<boolean> {
  const permission = await checkPermission(origin, eventKind);
  if (permission.granted) return true;

  const isUnlockedStatus = await handleVaultIsUnlocked({}, '');
  if (!isUnlockedStatus.success || !isUnlockedStatus.data) {
    try {
      const loginUrl = buildApprovalUrl('login', origin, eventKind, details, true);
      const win = await chrome.windows.create({ url: loginUrl, type: 'popup', width: 450, height: 700, focused: true });
      const windowId = win?.id;
      if (windowId === undefined) {
        return false;
      }

      return new Promise<boolean>((resolve) => {
        const checkStatus = setInterval(() => {
          void handleVaultIsUnlocked({}, '').then((status) => {
            if (status.success && status.data) {
              clearInterval(checkStatus);
              chrome.windows.onRemoved.removeListener(onRemoved);
              void requestApproval(origin, eventKind, details).then(resolve);
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

  const url = buildApprovalUrl('approve', origin, eventKind, details);
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
        if (val.approved && val.duration !== 'once' && details.allowRemember !== false) {
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
    if (win?.id === undefined) {
      throw new Error('Failed to open approval window');
    }
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
    const approved = await requestApproval(origin, -1, { requestType: 'get_public_key' });
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
    const contentDescription = trimApprovalContentDescription(event.content);
    const approvalDetails: ApprovalRequestDetails = contentDescription
      ? { requestType: 'sign_event', contentDescription }
      : { requestType: 'sign_event' };
    const approved = await requestApproval(origin, event.kind, approvalDetails);
    if (!approved) {
      const unlockedStatus = await handleVaultIsUnlocked({}, '');
      if (!unlockedStatus.success || !unlockedStatus.data) {
        throw new BackgroundBridgeError('VAULT_LOCKED', 'Vault is locked. Open the extension to unlock.');
      }
      throw new BackgroundBridgeError('PERMISSION_DENIED', 'User rejected the request');
    }
    const result = await handleSignEvent({ event }, origin, { skipPermissionCheck: true });
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
    const approved = await requestApproval(origin, -1, { requestType: 'get_relays' });
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
    const approved = await requestApproval(payload.origin, -1, { requestType: 'nip04_encrypt' });
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
    const approved = await requestApproval(payload.origin, -1, { requestType: 'nip04_decrypt' });
    if (!approved) {
      const unlockedStatus = await handleVaultIsUnlocked({}, '');
      if (!unlockedStatus.success || !unlockedStatus.data) throw new Error('Vault is locked. Open the extension to unlock.');
      throw new Error('User rejected the request');
    }
    return await dispatchMessage('nostr.nip04.decrypt', createBridgeRequest('nostr.nip04.decrypt', payload), payload.origin) ?? '';
  })() as unknown as BridgeResponsePayload<'nostr.nip04.decrypt'>
));

bridge.on('nostr.nip44.encrypt', ({ payload }) => (
  (async () => {
    void resetAutoLockTimer();
    const activeStoredKey = await getActiveStoredKey();
    void logService.logApproval('nip44_encrypt', getHostname(payload.origin), activeStoredKey?.alias);
    const approved = await requestApproval(payload.origin, -1, { requestType: 'nip44_encrypt' });
    if (!approved) {
      const unlockedStatus = await handleVaultIsUnlocked({}, '');
      if (!unlockedStatus.success || !unlockedStatus.data) throw new Error('Vault is locked. Open the extension to unlock.');
      throw new Error('User rejected the request');
    }
    return await dispatchMessage('nostr.nip44.encrypt', createBridgeRequest('nostr.nip44.encrypt', payload), payload.origin) ?? '';
  })() as unknown as BridgeResponsePayload<'nostr.nip44.encrypt'>
));

bridge.on('nostr.nip44.decrypt', ({ payload }) => (
  (async () => {
    void resetAutoLockTimer();
    const activeStoredKey = await getActiveStoredKey();
    void logService.logApproval('nip44_decrypt', getHostname(payload.origin), activeStoredKey?.alias);
    const approved = await requestApproval(payload.origin, -1, { requestType: 'nip44_decrypt' });
    if (!approved) {
      const unlockedStatus = await handleVaultIsUnlocked({}, '');
      if (!unlockedStatus.success || !unlockedStatus.data) throw new Error('Vault is locked. Open the extension to unlock.');
      throw new Error('User rejected the request');
    }
    return await dispatchMessage('nostr.nip44.decrypt', createBridgeRequest('nostr.nip44.decrypt', payload), payload.origin) ?? '';
  })() as unknown as BridgeResponsePayload<'nostr.nip44.decrypt'>
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

bridge.on('nip57.getCapabilities', ({ payload }) => {
  void resetAutoLockTimer();
  return dispatchMessage(
    'nip57.getCapabilities',
    createBridgeRequest('nip57.getCapabilities', { origin: payload.origin }),
    payload.origin,
  ) as unknown as BridgeResponsePayload<'nip57.getCapabilities'>;
});

bridge.on('nip57.sendZap', ({ payload }) => (
  (async () => {
    void resetAutoLockTimer();
    const amountMsat = payload.request.amountMsat ?? (payload.request.amountSats !== undefined ? payload.request.amountSats * 1000 : 0);
    const amountSatsLabel = amountMsat > 0 ? `${amountMsat / 1000} sats` : 'unknown amount';
    const contentDescription = trimApprovalContentDescription(
      `Zap ${amountSatsLabel} to ${payload.request.target.recipientPubkey}${payload.request.comment ? ` — ${payload.request.comment}` : ''}`,
    );
    const approved = await requestApproval(payload.origin, 9734, {
      requestType: 'send_zap',
      ...(contentDescription ? { contentDescription } : {}),
      allowRemember: false,
    });
    if (!approved) {
      return {
        status: 'cancelled',
        amountMsat,
        recipientPubkey: payload.request.target.recipientPubkey,
        error: 'User rejected the zap payment',
        code: 'USER_REJECTED',
      } as BridgeResponsePayload<'nip57.sendZap'>;
    }
    return await dispatchMessage(
      'nip57.sendZap',
      createBridgeRequest('nip57.sendZap', { origin: payload.origin, request: payload.request, approved: true }),
      payload.origin,
    ) as BridgeResponsePayload<'nip57.sendZap'>;
  })() as unknown as BridgeResponsePayload<'nip57.sendZap'>
));

bridge.on('nip57.zaps.list', () => {
  return dispatchMessage('nip57.zaps.list', createBridgeRequest('nip57.zaps.list', {}), '') as unknown as BridgeResponsePayload<'nip57.zaps.list'>;
});
