import { db } from './database';
import { ErrorCode } from 'src/types/error-codes';
import { LogLevel, logService } from './log-service';
import type { BridgeAction, BridgeRequestMap, BridgeResponsePayload, VaultData } from 'src/types/bridge';

/**
 * Robust messaging for BEX environment.
 * Prefers Quasar bridge if available, but falls back to direct chrome.runtime.sendMessage
 * which is more reliable across different context lifetimes (popup vs options vs tab).
 */

interface BridgeEnvelope<T> {
  data: T;
}

interface BridgeLike {
  send<T>(request: { event: BridgeAction; to: 'background'; payload?: unknown }): Promise<BridgeEnvelope<T> | T | null | undefined>;
}

const getBridge = (): BridgeLike | undefined => {
  const bridgeHost = window as Window & {
    bridge?: BridgeLike;
    $q?: { bex?: BridgeLike };
  };

  return bridgeHost.bridge || bridgeHost.$q?.bex;
};

export async function sendBexMessage<T extends BridgeAction>(
  type: T,
  payload?: Omit<BridgeRequestMap[T], 'id' | 'action'>,
): Promise<BridgeResponsePayload<T> | undefined> {
  const bridge = getBridge();
  if (bridge) {
    try {
      const response = await Promise.race([
        bridge.send<BridgeResponsePayload<T>>({ event: type, to: 'background', payload }) as Promise<BridgeEnvelope<BridgeResponsePayload<T>> | BridgeResponsePayload<T>>,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Bridge timeout')), 5000)),
      ]);
      if (response && typeof response === 'object' && 'data' in response) {
        return response.data;
      }
      return response;
    } catch (error: unknown) {
      logService.log(LogLevel.WARN, `[VaultService] Bridge call failed for ${type}, falling back to direct messaging`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    logService.log(LogLevel.DEBUG, `[VaultService] Using direct chrome.runtime.sendMessage for ${type}`);
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
  } catch (error: unknown) {
    logService.log(LogLevel.ERROR, '[VaultService] Failed to unlock vault', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      code: ErrorCode.GEN_UNKNOWN,
    };
  }
}

export async function lockVault() {
  try {
    await sendBexMessage('vault.lock');
  } catch (error: unknown) {
    logService.log(LogLevel.ERROR, '[VaultService] Failed to lock vault', {
      error: error instanceof Error ? error.message : String(error),
    });
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
  } catch (error: unknown) {
    logService.log(LogLevel.ERROR, '[VaultService] Failed to create vault', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      code: ErrorCode.GEN_UNKNOWN,
    };
  }
}

export async function isVaultUnlocked(): Promise<boolean> {
  try {
    const data = await sendBexMessage('vault.isUnlocked');
    return !!data;
  } catch (error: unknown) {
    logService.log(LogLevel.ERROR, '[VaultService] Failed to check if vault is unlocked', {
      error: error instanceof Error ? error.message : String(error),
    });
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
  } catch (error: unknown) {
    logService.log(LogLevel.ERROR, '[VaultService] Failed to get vault data', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
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
  } catch (error: unknown) {
    logService.log(LogLevel.ERROR, '[VaultService] Failed to update vault data', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      code: ErrorCode.GEN_UNKNOWN,
    };
  }
}

export async function hasVault() {
  logService.log(LogLevel.DEBUG, '[VaultService] Checking if vault exists via direct DB access');
  try {
    const vault = await Promise.race([
      db.vaults.get('master'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Database timeout')), 2000)),
    ]);
    logService.log(LogLevel.DEBUG, '[VaultService] hasVault result', { exists: !!vault });
    return !!vault;
  } catch (error: unknown) {
    logService.log(LogLevel.ERROR, '[VaultService] Failed to check if vault exists', {
      error: error instanceof Error ? error.message : String(error),
    });
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
  } catch (error: unknown) {
    logService.log(LogLevel.ERROR, '[VaultService] Failed to export vault', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
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
  } catch (error: unknown) {
    logService.log(LogLevel.ERROR, '[VaultService] Failed to import vault', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      code: ErrorCode.GEN_UNKNOWN,
    };
  }
}
