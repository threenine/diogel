/**
 * Vault operation handlers
 * Wraps vault.ts functions for use by the bridge
 */

import type { HandlerResult } from '../types/background';
import type { VaultData } from 'src/types/bridge';
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
import { logService } from 'src/services/log-service';

// Re-export restoreVaultState for use by background.ts
export { restoreVaultState };

const logWrapper = <TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  name: string,
) => logService.wrapWithLogging(fn, 'VaultHandler', name);

export const handleVaultUnlock = logWrapper(async (
  payload: { password: string },
  _origin: string
): Promise<HandlerResult<{ vaultData?: VaultData }>> => {
  const result = await unlock(payload.password);

  if (result.success) {
    return {
      success: true,
      data: result.vaultData ? { vaultData: result.vaultData as VaultData } : {},
    };
  }

  return { success: false, error: result.error || 'Unlock failed', code: result.errorCode as string };
}, 'unlock');

export const handleVaultLock = logWrapper(async (
  _payload: unknown,
  _origin: string
): Promise<HandlerResult<void>> => {
  await lock();
  return { success: true, data: undefined };
}, 'lock');

export const handleVaultIsUnlocked = logWrapper(async (
  _payload: unknown,
  _origin: string
): Promise<HandlerResult<boolean>> => {
  return { success: true, data: isVaultUnlocked() };
}, 'isUnlocked');

export const handleVaultCreate = logWrapper(async (
  payload: { password: string; vaultData: VaultData },
  _origin: string
): Promise<HandlerResult<{ encryptedVault?: string }>> => {
  const result = await createNewVault(payload.password, payload.vaultData);

  if (result.success) {
    return {
      success: true,
      data: {
        ...(result.encryptedVault ? { encryptedVault: result.encryptedVault } : {}),
      },
    };
  }

  return { success: false, error: result.error || 'Create failed', code: result.errorCode as string };
}, 'create');

export const handleVaultGetData = logWrapper(async (
  _payload: unknown,
  _origin: string
): Promise<HandlerResult<{ vaultData?: VaultData }>> => {
  const result = await getVaultData();

  if (result.success) {
    return {
      success: true,
      data: result.vaultData ? { vaultData: result.vaultData as VaultData } : {},
    };
  }

  return { success: false, error: result.error || 'Get data failed', code: result.errorCode as string };
}, 'getData');

export const handleVaultUpdateData = logWrapper(async (
  payload: { vaultData: VaultData },
  _origin: string
): Promise<HandlerResult<void>> => {
  const result = await updateVaultData(payload.vaultData);

  if (result.success) {
    return { success: true, data: undefined };
  }

  return { success: false, error: result.error || 'Update failed', code: result.errorCode as string };
}, 'updateData');

export const handleVaultExport = logWrapper(async (
  _payload: unknown,
  _origin: string
): Promise<HandlerResult<{ encryptedData?: string }>> => {
  const result = await exportV();

  if (result.success) {
    return {
      success: true,
      data: {
        ...(result.encryptedData ? { encryptedData: result.encryptedData } : {}),
      },
    };
  }

  return { success: false, error: result.error || 'Export failed', code: result.errorCode as string };
}, 'export');

export const handleVaultImport = logWrapper(async (
  payload: { encryptedData: string },
  _origin: string
): Promise<HandlerResult<void>> => {
  const result = await importV(payload.encryptedData);

  if (result.success) {
    return { success: true, data: undefined };
  }

  return { success: false, error: result.error || 'Import failed', code: result.errorCode as string };
}, 'import');
