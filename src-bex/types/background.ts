/**
 * Background script specific types
 * Uses simple string-based errors (backward-compatible with existing code)
 */

// Result type for all handler operations
export type HandlerResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// NIP-07 interface (what we expose to content script)
export interface NostrWindow {
  getPublicKey(): Promise<string>;
  signEvent(event: UnsignedEvent): Promise<SignedEvent>;
  getRelays(): Promise<Record<string, { read: boolean; write: boolean }>>;
  nip04: {
    encrypt(pubkey: string, plaintext: string): Promise<string>;
    decrypt(pubkey: string, ciphertext: string): Promise<string>;
  };
}

// Event types
export interface UnsignedEvent {
  kind: number;
  content: string;
  tags: string[][];
  created_at: number;
  pubkey?: string;
}

export interface SignedEvent extends UnsignedEvent {
  id: string;
  pubkey: string;
  sig: string;
}

// Permission types
export interface PermissionGrant {
  origin: string;
  eventKind: number;
  granted: boolean;
  timestamp: number;
  expiry?: number;
}

// Handler function type
export type HandlerFn<T, R> = (payload: T, origin: string) => Promise<HandlerResult<R>>;
