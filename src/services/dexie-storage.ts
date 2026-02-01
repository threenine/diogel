import type { StoredKey } from '../types';
import { getVaultData, isVaultUnlocked, updateVaultData } from './vault-service';

const NOSTR_ACTIVE = 'nostr:active' as const;

export async function get(): Promise<Record<string, StoredKey>> {
  if (!(await isVaultUnlocked())) {
    return {};
  }
  const res = await getVaultData();
  if (!res.success || !res.vaultData) {
    return {};
  }

  const vaultData = res.vaultData as { accounts?: StoredKey[] };
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
  return new Promise((resolve) => {
    chrome.storage.local.get([NOSTR_ACTIVE], (result) => {
      resolve(result[NOSTR_ACTIVE]);
    });
  });
}

export async function setActive(alias: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [NOSTR_ACTIVE]: alias }, () => {
      resolve();
    });
  });
}

export async function save(storedKey: StoredKey): Promise<void> {
  if (!(await isVaultUnlocked())) {
    throw new Error('Vault is locked. Cannot save key.');
  }

  const res = await getVaultData();
  if (!res.success || !res.vaultData) {
    throw new Error('Failed to retrieve vault data');
  }

  const vaultData = res.vaultData as { accounts?: StoredKey[] };
  vaultData.accounts = vaultData.accounts || [];

  // Check if a key with the same alias or id already exists
  const existingAlias = vaultData.accounts.find((acc) => acc.alias === storedKey.alias);
  if (existingAlias) {
    throw new Error('Key with the same alias already exists.');
  }

  const existingId = vaultData.accounts.find((acc) => acc.id === storedKey.id);
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

  const vaultData = res.vaultData as { accounts?: StoredKey[] };
  vaultData.accounts = vaultData.accounts || [];

  const filteredAccounts = vaultData.accounts.filter((acc) => acc.id !== id);
  if (filteredAccounts.length === vaultData.accounts.length) {
    return; // Already not there
  }

  vaultData.accounts = filteredAccounts;
  await updateVaultData(vaultData);
}
