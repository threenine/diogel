import { nip04 } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';
import { storageService, NOSTR_ACTIVE } from 'src/services/storage-service';
import type { VaultData, StoredKey } from 'src/types/bridge';
import type { HandlerResult } from '../types/background';
import { handleVaultGetData, handleVaultIsUnlocked } from './vault-handler';

export async function handleNip04Encrypt(
  payload: { pubkey: string; plaintext: string },
  _origin: string = '',
): Promise<HandlerResult<string>> {
  try {
    const secretKey = await getActiveSecretKey();
    const ciphertext = nip04.encrypt(secretKey, payload.pubkey, payload.plaintext);
    return { success: true, data: ciphertext };
  } catch (error: any) {
    return { success: false, error: error.message || String(error) };
  }
}

export async function handleNip04Decrypt(
  payload: { pubkey: string; ciphertext: string },
  _origin: string = '',
): Promise<HandlerResult<string>> {
  try {
    const secretKey = await getActiveSecretKey();
    const plaintext = nip04.decrypt(secretKey, payload.pubkey, payload.ciphertext);
    return { success: true, data: plaintext };
  } catch (error: any) {
    return { success: false, error: error.message || String(error) };
  }
}

async function getActiveSecretKey(): Promise<Uint8Array> {
  const isUnlockedResult = (await handleVaultIsUnlocked({}, '')) as HandlerResult<boolean>;
  if (!isUnlockedResult.success || !isUnlockedResult.data) {
    throw new Error('Vault is locked');
  }

  const activeAlias = await storageService.get<string>(NOSTR_ACTIVE);
  if (!activeAlias) {
    throw new Error('No active account found');
  }

  const vaultRes = (await handleVaultGetData({}, '')) as HandlerResult<{ vaultData?: unknown }>;
  if (vaultRes.success && vaultRes.data.vaultData) {
    const vaultData = vaultRes.data.vaultData as VaultData;
    const storedKey = vaultData.accounts?.find((a) => a.alias === activeAlias);
    if (storedKey) {
      return hexToBytes(storedKey.account.privkey);
    }
  }

  throw new Error('Secret key not found');
}
