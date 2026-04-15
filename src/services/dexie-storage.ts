import type { StoredKey } from 'src/types/bridge';
import { getVaultData, isVaultUnlocked, updateVaultData } from './vault-service';
import { NOSTR_ACTIVE, storageService } from './storage-service';

export async function get(): Promise<Record<string, StoredKey>> {
  if (!(await isVaultUnlocked())) {
    return {};
  }
  const res = await getVaultData();
  if (!res.success || !res.vaultData) {
    return {};
  }

  const vaultData = res.vaultData;
  const accounts = vaultData.accounts || [];

  return accounts.reduce(
    (acc: Record<string, StoredKey>, key: StoredKey) => {
      acc[key.alias] = key;
      return acc;
    },
    {} as Record<string, StoredKey>,
  );
}

export async function getActive(): Promise<string | undefined> {
  return await storageService.get<string>(NOSTR_ACTIVE);
}

export async function setActive(alias: string): Promise<void> {
  await storageService.set(NOSTR_ACTIVE, alias);
}

export async function save(storedKey: StoredKey): Promise<void> {
  if (!(await isVaultUnlocked())) {
    throw new Error('Vault is locked. Cannot save key.');
  }

  const res = await getVaultData();
  if (!res.success || !res.vaultData) {
    throw new Error('Failed to retrieve vault data');
  }

  const vaultData = res.vaultData;
  vaultData.accounts = vaultData.accounts || [];

  // Check if a key with the same alias or id already exists
  const existingAlias = vaultData.accounts.find((acc: StoredKey) => acc.alias === storedKey.alias);
  if (existingAlias) {
    throw new Error('Key with the same alias already exists.');
  }

  const existingId = vaultData.accounts.find((acc: StoredKey) => acc.id === storedKey.id);
  if (existingId) {
    throw new Error('Key with the same npub already exists.');
  }

  vaultData.accounts.push(JSON.parse(JSON.stringify(storedKey)));
  await updateVaultData(vaultData);
  await setActive(storedKey.alias);
}

export async function remove(id: string): Promise<void> {
  if (!(await isVaultUnlocked())) {
    throw new Error('Vault is locked. Cannot remove key.');
  }

  const res = await getVaultData();
  if (!res.success || !res.vaultData) {
    throw new Error('Failed to retrieve vault data');
  }

  const vaultData = res.vaultData;
  vaultData.accounts = vaultData.accounts || [];

  const filteredAccounts = vaultData.accounts.filter((acc: StoredKey) => acc.id !== id);
  if (filteredAccounts.length === vaultData.accounts.length) {
    return; // Already not there
  }

  vaultData.accounts = filteredAccounts;
  await updateVaultData(vaultData);
}
