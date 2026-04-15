import { db } from './database';
import { ErrorCode } from 'src/types/error-codes';
import type { BridgeAction, BridgeRequestMap, BridgeResponsePayload, VaultData } from 'src/types/bridge';

/**
 * Robust messaging for BEX environment.
 * Prefers Quasar bridge if available, but falls back to direct chrome.runtime.sendMessage
 * which is more reliable across different context lifetimes (popup vs options vs tab).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getBridge = (): any => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).bridge || (window as any).$q?.bex;
};

export async function sendBexMessage<T extends BridgeAction>(
  type: T,
  payload?: Omit<BridgeRequestMap[T], 'id' | 'action'>,
): Promise<BridgeResponsePayload<T> | undefined> {
  const bridge = getBridge();
  if (bridge) {
    try {
      const response = (await Promise.race([
        bridge.send({ event: type, to: 'background', payload }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Bridge timeout')), 5000)),
      ])) as { data: BridgeResponsePayload<T> };
      return response.data;
    } catch (e) {
      console.warn(
        `[VaultService] Bridge call failed for ${type}, falling back to direct messaging`,
        e,
      );
    }
  }

  // Fallback to direct chrome.runtime.sendMessage
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    console.log(`[VaultService] Using direct chrome.runtime.sendMessage for ${type}`);
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type, payload }, (response) => {
        resolve(response as BridgeResponsePayload<T>);
      });
    });
  }

  throw new Error('No communication channel available (bridge or chrome.runtime)');
}

export async function unlockVault(
  password: string,
): Promise<{ success: boolean; vaultData?: VaultData | null; error?: string; code?: string }> {
  try {
    const data = await sendBexMessage('vault.unlock', { password });
    return (
      (data as { success: boolean; vaultData?: VaultData | null; error?: string; code?: string }) || {
        success: false,
        error: 'No response from background',
        code: ErrorCode.GEN_UNKNOWN,
      }
    );
  } catch (e) {
    console.error('[VaultService] Failed to unlock vault', e);
    return {
      success: false,
      error: (e as Error).message,
      code: ErrorCode.GEN_UNKNOWN,
    };
  }
}

export async function lockVault() {
  try {
    await sendBexMessage('vault.lock');
  } catch (e) {
    console.error('[VaultService] Failed to lock vault', e);
  }
}

export async function createVault(
  password: string,
  vaultData: VaultData,
): Promise<{
  success: boolean;
  error?: string;
  code?: string;
  encryptedVault?: string;
}> {
  try {
    const data = await sendBexMessage('vault.create', { password, vaultData });
    return (
      (data as {
        success: boolean;
        error?: string;
        code?: string;
        encryptedVault?: string;
      }) || {
        success: false,
        error: 'No response from background',
        code: ErrorCode.GEN_UNKNOWN,
      }
    );
  } catch (e) {
    console.error('[VaultService] Failed to create vault', e);
    return {
      success: false,
      error: (e as Error).message,
      code: ErrorCode.GEN_UNKNOWN,
    };
  }
}

export async function isVaultUnlocked(): Promise<boolean> {
  try {
    const data = await sendBexMessage('vault.isUnlocked');
    return !!data;
  } catch (e) {
    console.error('[VaultService] Failed to check if vault is unlocked', e);
    return false;
  }
}

export async function getVaultData(): Promise<{
  success: boolean;
  vaultData?: VaultData | null;
  error?: string;
  code?: string;
}> {
  try {
    const data = await sendBexMessage('vault.getData');
    return (
      (data as {
        success: boolean;
        vaultData?: VaultData | null;
        error?: string;
        code?: string;
      }) || {
        success: false,
        error: 'No response from background',
        code: ErrorCode.GEN_UNKNOWN,
      }
    );
  } catch (e) {
    console.error('[VaultService] Failed to get vault data', e);
    return {
      success: false,
      error: (e as Error).message,
      code: ErrorCode.GEN_UNKNOWN,
    };
  }
}

export async function updateVaultData(
  vaultData: VaultData,
): Promise<{ success: boolean; error?: string; code?: string }> {
  try {
    const data = await sendBexMessage('vault.updateData', { vaultData });
    return (
      (data as { success: boolean; error?: string; code?: string }) || {
        success: false,
        error: 'No response from background',
        code: ErrorCode.GEN_UNKNOWN,
      }
    );
  } catch (e) {
    console.error('[VaultService] Failed to update vault data', e);
    return {
      success: false,
      error: (e as Error).message,
      code: ErrorCode.GEN_UNKNOWN,
    };
  }
}

export async function hasVault() {
  console.log('[VaultService] Checking if vault exists via direct DB access...');
  try {
    const vault = await Promise.race([
      db.vaults.get('master'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Database timeout')), 2000)),
    ]);
    console.log('[VaultService] hasVault result:', !!vault);
    return !!vault;
  } catch (e) {
    console.error('[VaultService] Failed to check if vault exists', e);
    return false;
  }
}

export async function exportVault(): Promise<{
  success: boolean;
  encryptedData?: string;
  error?: string;
  code?: string;
}> {
  try {
    const data = await sendBexMessage('vault.export');
    return (
      (data as {
        success: boolean;
        encryptedData?: string;
        error?: string;
        code?: string;
      }) || {
        success: false,
        error: 'No response from background',
        code: ErrorCode.GEN_UNKNOWN,
      }
    );
  } catch (e) {
    console.error('[VaultService] Failed to export vault', e);
    return {
      success: false,
      error: (e as Error).message,
      code: ErrorCode.GEN_UNKNOWN,
    };
  }
}

export async function importVault(
  encryptedData: string,
): Promise<{ success: boolean; error?: string; code?: string }> {
  try {
    const data = await sendBexMessage('vault.import', { encryptedData });
    return (
      (data as { success: boolean; error?: string; code?: string }) || {
        success: false,
        error: 'No response from background',
        code: ErrorCode.GEN_UNKNOWN,
      }
    );
  } catch (e) {
    console.error('[VaultService] Failed to import vault', e);
    return {
      success: false,
      error: (e as Error).message,
      code: ErrorCode.GEN_UNKNOWN,
    };
  }
}
