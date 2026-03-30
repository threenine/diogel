/**
 * Vault operation handlers
 * Wraps vault.ts functions for use by the bridge
 */

import type { HandlerResult } from '../types/background';
import {
  unlockVault as unlock,
  lockVault as lock,
  isVaultUnlocked,
  createNewVault,
  exportVault as exportV,
  importVault as importV,
  getVaultData,
  updateVaultData,
  restoreVaultState,
} from '../vault';

// Re-export restoreVaultState for use by background.ts
export { restoreVaultState };

export async function handleVaultUnlock(
  payload: { password: string },
  _origin: string
): Promise<HandlerResult<{ vaultData?: unknown }>> {
  const result = await unlock(payload.password);

  if (result.success) {
    return { success: true, data: { vaultData: result.vaultData } };
  }

  return { success: false, error: result.error || 'Unlock failed' };
}

export async function handleVaultLock(
  _payload: unknown,
  _origin: string
): Promise<HandlerResult<void>> {
  await lock();
  return { success: true, data: undefined };
}

export async function handleVaultIsUnlocked(
  _payload: unknown,
  _origin: string
): Promise<HandlerResult<boolean>> {
  return { success: true, data: isVaultUnlocked() };
}

export async function handleVaultCreate(
  payload: { password: string; vaultData: unknown },
  _origin: string
): Promise<HandlerResult<{ encryptedVault?: string }>> {
  const result = await createNewVault(payload.password, payload.vaultData);

  if (result.success) {
    return {
      success: true,
      data: {
        ...(result.encryptedVault ? { encryptedVault: result.encryptedVault } : {}),
      },
    };
  }

  return { success: false, error: result.error || 'Create failed' };
}

export async function handleVaultGetData(
  _payload: unknown,
  _origin: string
): Promise<HandlerResult<{ vaultData?: unknown }>> {
  const result = await getVaultData();

  if (result.success) {
    return { success: true, data: { vaultData: result.vaultData } };
  }

  return { success: false, error: result.error || 'Get data failed' };
}

export async function handleVaultUpdateData(
  payload: { vaultData: unknown },
  _origin: string
): Promise<HandlerResult<void>> {
  const result = await updateVaultData(payload.vaultData);

  if (result.success) {
    return { success: true, data: undefined };
  }

  return { success: false, error: result.error || 'Update failed' };
}

export async function handleVaultExport(
  _payload: unknown,
  _origin: string
): Promise<HandlerResult<{ encryptedData?: string }>> {
  const result = await exportV();

  if (result.success) {
    return {
      success: true,
      data: {
        ...(result.encryptedData ? { encryptedData: result.encryptedData } : {}),
      },
    };
  }

  return { success: false, error: result.error || 'Export failed' };
}

export async function handleVaultImport(
  payload: { encryptedData: string },
  _origin: string
): Promise<HandlerResult<void>> {
  const result = await importV(payload.encryptedData);

  if (result.success) {
    return { success: true, data: undefined };
  }

  return { success: false, error: result.error || 'Import failed' };
}
