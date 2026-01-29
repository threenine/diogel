import {
  decryptWithKey,
  deriveKeyFromEncryptedVault,
  deriveNewKey,
  encryptWithKey,
} from 'src/services/crypto';
import { db } from 'src/services/database';

let vaultKey: CryptoKey | null = null;
let vaultSalt: Uint8Array | null = null;

export function isVaultUnlocked() {
  return vaultKey !== null && vaultSalt !== null;
}

function clearVaultKey() {
  vaultKey = null;
  vaultSalt = null;
}

export async function unlockVault(password: string) {
  try {
    const vault = await db.vaults.get('master');

    if (!vault) {
      return { success: false, error: 'No vault found' };
    }

    const { key, salt } = await deriveKeyFromEncryptedVault(password, vault.encryptedData);
    vaultKey = key;
    vaultSalt = salt;

    const vaultData = await decryptWithKey(vault.encryptedData, vaultKey);

    return { success: true, vaultData };
  } catch (err) {
    clearVaultKey();
    console.error('Unlock vault error:', err);
    return { success: false, error: 'Invalid password' };
  }
}

export async function lockVault() {
  clearVaultKey();
}

export async function createNewVault(password: string, vaultData: any) {
  try {
    const { key, salt } = await deriveNewKey(password);
    vaultKey = key;
    vaultSalt = salt;

    const encryptedVault = await encryptWithKey(vaultData, vaultKey, vaultSalt);

    await db.vaults.put({
      id: 'master',
      encryptedData: encryptedVault,
      createdAt: new Date().toISOString(),
    });

    return { success: true, encryptedVault };
  } catch (err) {
    clearVaultKey();
    console.error('Create vault error:', err);
    return { success: false, error: (err as Error).message };
  }
}

export function getVaultKey() {
  return { key: vaultKey, salt: vaultSalt };
}
