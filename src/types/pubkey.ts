import { nip19 } from 'nostr-tools';

const HEX_PUBKEY_PATTERN = /^[0-9a-f]{64}$/i;

/**
 * A Nostr public key, normalized to lowercase 64-character hex. Construct via
 * `createPubkey` — never assert a raw string as `Pubkey` — so the type system
 * guarantees any `Pubkey` value has already passed validation.
 */
export type Pubkey = string & { readonly __brand: 'Pubkey' };

/**
 * Validates and normalizes a Nostr public key supplied as either 64-character
 * hex (case-insensitive) or a bech32 `npub1...` string.
 *
 * @returns The normalized (lowercase hex) `Pubkey`, or `null` if `input` is
 * neither valid hex nor a valid `npub`.
 */
export function createPubkey(input: string): Pubkey | null {
  const trimmed = input.trim();

  if (HEX_PUBKEY_PATTERN.test(trimmed)) {
    return trimmed.toLowerCase() as Pubkey;
  }

  try {
    const decoded = nip19.decode(trimmed);
    if (
      decoded.type === 'npub' &&
      typeof decoded.data === 'string' &&
      HEX_PUBKEY_PATTERN.test(decoded.data)
    ) {
      return decoded.data.toLowerCase() as Pubkey;
    }
  } catch {
    return null;
  }

  return null;
}

/** Encodes a `Pubkey` as its bech32 `npub1...` representation. */
export function toNpub(pubkey: Pubkey): string {
  return nip19.npubEncode(pubkey);
}
