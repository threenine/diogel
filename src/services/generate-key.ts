import { generateSecretKey, getPublicKey } from 'nostr-tools';
import type { Account, StoredKey } from 'src/types';
import * as nip19 from 'nostr-tools/nip19';

export function generateKey(): StoredKey {
  const sk = generateSecretKey();
  const pk = getPublicKey(sk);

  const account: Account = {
    pubkey: pk,
    priKey: nip19.nsecEncode(sk),
    npub: nip19.npubEncode(pk),
    nsec: nip19.nsecEncode(sk),
    relays: [],
    websites: [],
  };
  return {
    id: pk,
    alias: '',
    account: account,
    createdAt: new Date().toISOString(),
  };
}
