import {
  decryptWithKey,
  deriveKeyFromEncryptedVault,
  deriveNewKey,
  encryptWithKey,
} from 'src/services/crypto';
import { db } from 'src/services/database';

let vaultKey: CryptoKey | null = null;
let vaultSalt: Uint8Array | null = null;

const SESSION_KEY = 'vault:session-key' as const;
const SESSION_SALT = 'vault:session-salt' as const;

async function saveKeyToSession() {
  if (vaultKey && vaultSalt && typeof chrome !== 'undefined' && chrome.storage?.session) {
    try {
      const rawKey = await crypto.subtle.exportKey('raw', vaultKey);
      const keyBase64 = btoa(String.fromCharCode(...new Uint8Array(rawKey)));
      const saltBase64 = btoa(String.fromCharCode(...vaultSalt));

      await chrome.storage.session.set({
        [SESSION_KEY]: keyBase64,
        [SESSION_SALT]: saltBase64,
      });
      console.log('[Vault] Session state saved');
    } catch (e) {
      console.error('[Vault] Failed to save key to session:', e);
    }
  }
}

async function clearSession() {
  if (typeof chrome !== 'undefined' && chrome.storage?.session) {
    await chrome.storage.session.remove([SESSION_KEY, SESSION_SALT]);
    console.log('[Vault] Session state cleared');
  }
}

export async function restoreVaultState() {
  if (typeof chrome !== 'undefined' && chrome.storage?.session) {
    try {
      const items = await chrome.storage.session.get([SESSION_KEY, SESSION_SALT]);
      if (items[SESSION_KEY] && items[SESSION_SALT]) {
        const keyData = Uint8Array.from(atob(items[SESSION_KEY]), (c) => c.charCodeAt(0));
        const saltData = Uint8Array.from(atob(items[SESSION_SALT]), (c) => c.charCodeAt(0));

        vaultKey = await crypto.subtle.importKey('raw', keyData.buffer, 'AES-GCM', true, [
          'encrypt',
          'decrypt',
        ]);
        vaultSalt = saltData;
        console.log('[Vault] Session state restored');
        return true;
      }
    } catch (e) {
      console.error('[Vault] Failed to restore key from session:', e);
    }
  }
  return false;
}

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

    await saveKeyToSession();

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
  await clearSession();
}

export async function createNewVault(password: string, vaultData: unknown) {
  try {
    const { key, salt } = await deriveNewKey(password);
    vaultKey = key;
    vaultSalt = salt;

    await saveKeyToSession();

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

export async function updateVaultData(vaultData: unknown) {
  if (!isVaultUnlocked() || !vaultKey || !vaultSalt) {
    return { success: false, error: 'Vault is locked' };
  }

  try {
    const encryptedVault = await encryptWithKey(vaultData, vaultKey, vaultSalt);

    await db.vaults.put({
      id: 'master',
      encryptedData: encryptedVault,
      createdAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (err) {
    console.error('Update vault data error:', err);
    return { success: false, error: (err as Error).message };
  }
}

export async function getVaultData() {
  if (!isVaultUnlocked() || !vaultKey) {
    return { success: false, error: 'Vault is locked' };
  }

  try {
    const vault = await db.vaults.get('master');
    if (!vault) {
      return { success: false, error: 'No vault found' };
    }

    const vaultData = await decryptWithKey(vault.encryptedData, vaultKey);
    return { success: true, vaultData };
  } catch (err) {
    console.error('Get vault data error:', err);
    return { success: false, error: (err as Error).message };
  }
}

export async function exportVault() {
  try {
    const vault = await db.vaults.get('master');
    if (!vault) {
      return { success: false, error: 'No vault found' };
    }
    return { success: true, encryptedData: vault.encryptedData };
  } catch (err) {
    console.error('Export vault error:', err);
    return { success: false, error: (err as Error).message };
  }
}

export async function importVault(encryptedData: string) {
  try {
    // Basic validation
    if (!encryptedData || !encryptedData.startsWith('v2:')) {
      return { success: false, error: 'Invalid vault format' };
    }

    await db.vaults.put({
      id: 'master',
      encryptedData,
      createdAt: new Date().toISOString(),
    });

    // When importing a vault, it's safer to clear the current session's key
    clearVaultKey();
    await clearSession();

    return { success: true };
  } catch (err) {
    console.error('Import vault error:', err);
    return { success: false, error: (err as Error).message };
  }
}

export function getVaultKey() {
  return { key: vaultKey, salt: vaultSalt };
}
