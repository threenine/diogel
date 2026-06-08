import { nip44 } from 'nostr-tools';
import type { HandlerResult } from '../types/background';
import { resetAutoLockTimer } from '../services/auto-lock';
import { getActiveSecretKey } from './active-key';

export async function handleNip44Encrypt(
  payload: { pubkey: string; plaintext: string },
  _origin?: string,
): Promise<HandlerResult<string>> {
  void _origin;

  try {
    const secretKey = await getActiveSecretKey();
    const conversationKey = nip44.getConversationKey(secretKey, payload.pubkey);
    const ciphertext = nip44.encrypt(payload.plaintext, conversationKey);

    void resetAutoLockTimer();

    return { success: true, data: ciphertext };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function handleNip44Decrypt(
  payload: { pubkey: string; ciphertext: string },
  _origin?: string,
): Promise<HandlerResult<string>> {
  void _origin;

  try {
    const secretKey = await getActiveSecretKey();
    const conversationKey = nip44.getConversationKey(secretKey, payload.pubkey);
    const plaintext = nip44.decrypt(payload.ciphertext, conversationKey);

    void resetAutoLockTimer();

    return { success: true, data: plaintext };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
