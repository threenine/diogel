import type {
  BridgeAction,
  BridgeRequestMap,
  BridgeResponsePayload,
  VaultData,
} from 'src/types/bridge';
import {
  handleVaultUnlock,
  handleVaultLock,
  handleVaultIsUnlocked,
  handleVaultCreate,
  handleVaultGetData,
  handleVaultUpdateData,
  handleVaultExport,
  handleVaultImport,
} from './handlers/vault-handler';
import {
  resetAutoLockTimer,
  startAutoLockTimer,
  stopAutoLockTimer,
} from './services/auto-lock';
import { handleGetPublicKey, handleSignEvent } from './handlers/nip07';
import { handleBlossomUpload } from './handlers/blossom-handler';
import { handleNip04Encrypt, handleNip04Decrypt } from './handlers/nip04';
import { handleNip44Encrypt, handleNip44Decrypt } from './handlers/nip44';
import { handleRelayBrowserList, handleRelayBrowserGetStatus, handleRelayBrowserRefresh } from './handlers/relay-browser-handler';
import {
  handleNip47ConnectionImport,
  handleNip47ConnectionRemove,
  handleNip47ConnectionsList,
  handleNip47GetBalance,
  handleNip47GetInfo,
} from './handlers/nip47';

/**
 * Dispatches messages to the appropriate handlers.
 * This is used by both the Quasar BEX bridge and the direct chrome.runtime.onMessage listener.
 *
 * @param type The message type/event name
 * @param payload The message payload
 * @param origin The origin of the request (if applicable)
 * @returns The response payload
 */
export async function dispatchMessage<K extends BridgeAction>(
  type: K,
  payload: BridgeRequestMap[K],
  origin: string = '',
): Promise<BridgeResponsePayload<K> | null> {
  switch (type) {
    case 'ping':
      return 'pong' as BridgeResponsePayload<K>;

    case 'nostr.getPublicKey': {
      const result = await handleGetPublicKey(payload, origin);
      if (result.success) {
        return result.data as BridgeResponsePayload<K>;
      }
      return { success: false, error: result.error, code: result.code } as unknown as BridgeResponsePayload<K>;
    }

    case 'nostr.signEvent': {
      const signPayload = payload as BridgeRequestMap['nostr.signEvent'];
      const result = await handleSignEvent({ event: signPayload.event }, origin);
      if (result.success) {
        return result.data as BridgeResponsePayload<K>;
      }
      return { success: false, error: result.error, code: result.code } as unknown as BridgeResponsePayload<K>;
    }

    case 'nostr.getRelays': {
      return {} as BridgeResponsePayload<K>;
    }

    case 'nostr.nip04.encrypt': {
      const result = await handleNip04Encrypt(payload as BridgeRequestMap['nostr.nip04.encrypt'], origin);
      if (result.success) {
        return result.data as BridgeResponsePayload<K>;
      }
      throw new Error(result.error);
    }

    case 'nostr.nip04.decrypt': {
      const result = await handleNip04Decrypt(payload as BridgeRequestMap['nostr.nip04.decrypt'], origin);
      if (result.success) {
        return result.data as BridgeResponsePayload<K>;
      }
      throw new Error(result.error);
    }

    case 'nostr.nip44.encrypt': {
      const result = await handleNip44Encrypt(payload as BridgeRequestMap['nostr.nip44.encrypt'], origin);
      if (result.success) {
        return result.data as BridgeResponsePayload<K>;
      }
      throw new Error(result.error);
    }

    case 'nostr.nip44.decrypt': {
      const result = await handleNip44Decrypt(payload as BridgeRequestMap['nostr.nip44.decrypt'], origin);
      if (result.success) {
        return result.data as BridgeResponsePayload<K>;
      }
      throw new Error(result.error);
    }

    case 'vault.isUnlocked': {
      const result = await handleVaultIsUnlocked({}, origin);
      return (result.success ? result.data : false) as BridgeResponsePayload<K>;
    }

    case 'vault.unlock': {
      const unlockPayload = payload as BridgeRequestMap['vault.unlock'];
      const result = await handleVaultUnlock({ password: unlockPayload.password }, origin);
      if (result.success) {
        await resetAutoLockTimer();
        startAutoLockTimer();
        return { success: true, vaultData: result.data.vaultData as VaultData } as BridgeResponsePayload<K>;
      }
      return { success: false, error: result.error, code: result.code } as unknown as BridgeResponsePayload<K>;
    }

    case 'vault.lock': {
      await handleVaultLock({}, origin);
      stopAutoLockTimer();
      return { success: true } as BridgeResponsePayload<K>;
    }

    case 'vault.create': {
      const createPayload = payload as BridgeRequestMap['vault.create'];
      const result = await handleVaultCreate({
        password: createPayload.password,
        vaultData: createPayload.vaultData,
      }, origin);
      if (result.success) {
        return {
          success: true,
          ...(result.data.encryptedVault ? { encryptedVault: result.data.encryptedVault } : {}),
        } as BridgeResponsePayload<K>;
      }
      return { success: false, error: result.error, code: result.code } as unknown as BridgeResponsePayload<K>;
    }

    case 'vault.getData': {
      const result = await handleVaultGetData({}, origin);
      if (result.success) {
        return { success: true, vaultData: result.data.vaultData as VaultData } as BridgeResponsePayload<K>;
      }
      return { success: false, error: result.error, code: result.code } as unknown as BridgeResponsePayload<K>;
    }

    case 'vault.updateData': {
      const updatePayload = payload as BridgeRequestMap['vault.updateData'];
      const result = await handleVaultUpdateData({ vaultData: updatePayload.vaultData }, origin);
      if (result.success) {
        return { success: true } as BridgeResponsePayload<K>;
      }
      return { success: false, error: result.error, code: result.code } as unknown as BridgeResponsePayload<K>;
    }

    case 'vault.export': {
      const result = await handleVaultExport({}, origin);
      if (result.success) {
        return { success: true, encryptedData: result.data.encryptedData } as BridgeResponsePayload<K>;
      }
      return { success: false, error: result.error, code: result.code } as unknown as BridgeResponsePayload<K>;
    }

    case 'vault.import': {
      const importPayload = payload as BridgeRequestMap['vault.import'];
      const encryptedData = importPayload.encryptedData || importPayload.payload?.encryptedData;
      if (!encryptedData) {
        return { success: false, error: 'Missing encrypted data', code: 'NOT_FOUND' } as unknown as BridgeResponsePayload<K>;
      }
      const result = await handleVaultImport({ encryptedData }, origin);
      if (result.success) {
        return { success: true } as BridgeResponsePayload<K>;
      }
      return { success: false, error: result.error, code: result.code } as unknown as BridgeResponsePayload<K>;
    }

    case 'blossom.upload': {
      const blossomPayload = payload as BridgeRequestMap['blossom.upload'];
      const result = await handleBlossomUpload({
        base64Data: blossomPayload.base64Data || '',
        fileType: blossomPayload.fileType || '',
        blossomServer: blossomPayload.blossomServer || '',
        ...(blossomPayload.uploadId ? { uploadId: blossomPayload.uploadId } : {}),
      }, origin);
      if (result.success) {
        return { success: true, url: result.data } as unknown as BridgeResponsePayload<K>;
      }
      return { success: false, error: result.error } as unknown as BridgeResponsePayload<K>;
    }

    case 'activity.mark': {
      await resetAutoLockTimer();
      return true as BridgeResponsePayload<K>;
    }

    case 'relay.browser.list': {
      const result = await handleRelayBrowserList();
      if (result.success) {
        return result.data as BridgeResponsePayload<K>;
      }
      return [] as unknown as BridgeResponsePayload<K>;
    }

    case 'relay.browser.getStatus': {
      const result = await handleRelayBrowserGetStatus();
      if (result.success) {
        return result.data as BridgeResponsePayload<K>;
      }
      return null;
    }

    case 'relay.browser.refresh': {
      const result = await handleRelayBrowserRefresh(payload as BridgeRequestMap['relay.browser.refresh']);
      if (result.success) {
        return true as BridgeResponsePayload<K>;
      }
      return { success: false, error: result.error } as unknown as BridgeResponsePayload<K>;
    }

    case 'nip47.connections.list': {
      const result = await handleNip47ConnectionsList();
      if (result.success) {
        return result.data as BridgeResponsePayload<K>;
      }
      return [] as unknown as BridgeResponsePayload<K>;
    }

    case 'nip47.connections.import': {
      try {
        const result = await handleNip47ConnectionImport(payload as BridgeRequestMap['nip47.connections.import']);
        if (result.success) {
          return result.data as BridgeResponsePayload<K>;
        }
        return { success: false, error: result.error } as unknown as BridgeResponsePayload<K>;
      } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : String(error) } as unknown as BridgeResponsePayload<K>;
      }
    }

    case 'nip47.connections.remove': {
      try {
        const result = await handleNip47ConnectionRemove(payload as BridgeRequestMap['nip47.connections.remove']);
        if (result.success) {
          return true as BridgeResponsePayload<K>;
        }
        return { success: false, error: result.error } as unknown as BridgeResponsePayload<K>;
      } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : String(error) } as unknown as BridgeResponsePayload<K>;
      }
    }

    case 'nip47.getInfo': {
      try {
        const result = await handleNip47GetInfo(payload as BridgeRequestMap['nip47.getInfo']);
        if (result.success) {
          return result.data as BridgeResponsePayload<K>;
        }
        return { success: false, error: result.error } as unknown as BridgeResponsePayload<K>;
      } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : String(error) } as unknown as BridgeResponsePayload<K>;
      }
    }

    case 'nip47.getBalance': {
      try {
        const result = await handleNip47GetBalance(payload as BridgeRequestMap['nip47.getBalance']);
        if (result.success) {
          return result.data as BridgeResponsePayload<K>;
        }
        return { success: false, error: result.error } as unknown as BridgeResponsePayload<K>;
      } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : String(error) } as unknown as BridgeResponsePayload<K>;
      }
    }

    default:
      return null;
  }
}
