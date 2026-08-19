/**
 * Background script specific types
 * Uses simple string-based errors (backward-compatible with existing code)
 */

// Result type for all handler operations
export type HandlerResult<T> =
  | { success: true; data: T; metadata?: Record<string, unknown> }
  | { success: false; error: string; code?: string; metadata?: Record<string, unknown> };

// NIP-07 interface (what we expose to content script)
export interface NostrWindow {
  getPublicKey(): Promise<string>;
  signEvent(event: UnsignedEvent): Promise<SignedEvent>;
  getRelays(): Promise<Record<string, { read: boolean; write: boolean }>>;
  nip04: {
    encrypt(pubkey: string, plaintext: string): Promise<string>;
    decrypt(pubkey: string, ciphertext: string): Promise<string>;
  };
  nip44: {
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

// Approval request queue types (ADR D5, D6)

/**
 * Request lifecycle states. `approved`, `rejected`, `expired`, and `interrupted` are terminal:
 * a request in any of them can never be approved.
 */
export type ApprovalRequestState =
  | 'queued'
  | 'presented'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'interrupted';

export const TERMINAL_REQUEST_STATES: readonly ApprovalRequestState[] = [
  'approved',
  'rejected',
  'expired',
  'interrupted',
];

/**
 * The durable shape of a queued request.
 *
 * This is the complete list of fields permitted in session storage (ADR D6). Event content,
 * event bodies, plaintext, ciphertext, invoices, preimages, and key material are transient and
 * must never appear here.
 */
export interface ApprovalRequestRecord {
  id: string;
  origin: string;
  requestType: string;
  eventKind: number;
  accountAlias: string | null;
  accountPubkey: string | null;
  createdAt: number;
  expiresAt: number;
  state: ApprovalRequestState;
}

/**
 * Reviewable detail for a queued request.
 *
 * Memory-only, never persisted: event content, plaintext, ciphertext, and invoices are excluded
 * from durable storage by D6, and the panel reads them from the live service worker instead.
 */
export interface ApprovalRequestContent {
  /** Short human-readable summary shown before the user expands anything. */
  contentDescription?: string;
  /** The complete unsigned event, for `sign_event` requests only. */
  event?: UnsignedEvent;
  /** Counterparty for encryption and decryption requests. Never the plaintext itself. */
  counterpartyPubkey?: string;
  /** Whether durations beyond `once` may be offered at all (payments never may). */
  allowRemember: boolean;
}

/** Approval durations the user can choose. */
export type ApprovalDuration = 'once' | '8h' | 'always';

export interface ApprovalDecision {
  approved: boolean;
  duration: ApprovalDuration;
}

/** Why a decision was refused, when it was not applied. */
export type DecisionRefusal = 'unknown-request' | 'already-resolved' | 'expired';

export type DecisionResult =
  | { applied: true; record: ApprovalRequestRecord }
  | { applied: false; reason: DecisionRefusal };

// Handler function type
export type HandlerFn<T, R> = (payload: T, origin: string) => Promise<HandlerResult<R>>;
