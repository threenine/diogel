import type { StoredKey } from './index';

/**
 * Type-safe bridge communication between content script and background
 */

export interface VaultData {
  accounts: StoredKey[];
}

// Bridge action types
export type BridgeAction =
  | 'nostr.getPublicKey'
  | 'nostr.signEvent'
  | 'nostr.getRelays'
  | 'nostr.nip04.encrypt'
  | 'nostr.nip04.decrypt'
  | 'nostr.nip44.encrypt'
  | 'nostr.nip44.decrypt'
  | 'vault.unlock'
  | 'vault.lock'
  | 'vault.isUnlocked'
  | 'permission.check'
  | 'permission.grant'
  | 'blossom.upload'
  | 'ping'
  | 'vault.getData'
  | 'vault.setData'
  | 'vault.updateData'
  | 'vault.create'
  | 'vault.export'
  | 'vault.import'
  | 'activity.mark'
  | 'nostr.approval.respond';

// Request/Response mapping
export interface BridgeRequestMap {
  'nostr.getPublicKey': {
    id: string;
    action: 'nostr.getPublicKey';
    origin: string;
  };
  'nostr.signEvent': {
    id: string;
    action: 'nostr.signEvent';
    origin: string;
    event: {
      kind: number;
      content: string;
      tags: string[][];
      created_at: number;
      pubkey?: string;
    };
  };
  'nostr.getRelays': {
    id: string;
    action: 'nostr.getRelays';
    origin: string;
  };
  'nostr.nip04.encrypt': {
    id: string;
    action: 'nostr.nip04.encrypt';
    origin: string;
    pubkey: string;
    plaintext: string;
  };
  'nostr.nip04.decrypt': {
    id: string;
    action: 'nostr.nip04.decrypt';
    origin: string;
    pubkey: string;
    ciphertext: string;
  };
  'nostr.nip44.encrypt': {
    id: string;
    action: 'nostr.nip44.encrypt';
    origin: string;
    pubkey: string;
    plaintext: string;
  };
  'nostr.nip44.decrypt': {
    id: string;
    action: 'nostr.nip44.decrypt';
    origin: string;
    pubkey: string;
    ciphertext: string;
  };
  'vault.unlock': {
    id: string;
    action: 'vault.unlock';
    password: string;
  };
  'vault.lock': {
    id: string;
    action: 'vault.lock';
  };
  'vault.isUnlocked': {
    id: string;
    action: 'vault.isUnlocked';
  };
  'permission.check': {
    id: string;
    action: 'permission.check';
    origin: string;
    eventKind: number;
  };
  'permission.grant': {
    id: string;
    action: 'permission.grant';
    origin: string;
    eventKind: number;
    duration: 'session' | 'always';
  };
  'blossom.upload': {
    id: string;
    action: 'blossom.upload';
    base64Data: string;
    fileType: string;
    blossomServer: string;
    uploadId?: string;
  };
  'ping': {
    id: string;
    action: 'ping';
  };
  'vault.getData': {
    id: string;
    action: 'vault.getData';
  };
  'vault.setData': {
    id: string;
    action: 'vault.setData';
    vaultData: VaultData;
  };
  'vault.export': {
    id: string;
    action: 'vault.export';
  };
  'vault.import': {
    id: string;
    action: 'vault.import';
    payload: { encryptedData: string };
  };
  'activity.mark': {
    id: string;
    action: 'activity.mark';
  };
  'vault.updateData': {
    id: string;
    action: 'vault.updateData';
    vaultData: VaultData;
  };
  'vault.create': {
    id: string;
    action: 'vault.create';
    password: string;
    vaultData: VaultData;
  };
  'nostr.approval.respond': {
    id: string;
    action: 'nostr.approval.respond';
    approved: boolean;
    duration: string;
  };
}

// Response mapping
export interface BridgeResponseMap {
  'nostr.getPublicKey': string;
  'nostr.signEvent': {
    id: string;
    pubkey: string;
    created_at: number;
    kind: number;
    tags: string[][];
    content: string;
    sig: string;
  };
  'nostr.getRelays': {
    [url: string]: {
      read: boolean;
      write: boolean;
    };
  };
  'nostr.nip04.encrypt': string;
  'nostr.nip04.decrypt': string;
  'nostr.nip44.encrypt': string;
  'nostr.nip44.decrypt': string;
  'vault.unlock': {
    success: boolean;
    error?: string;
    vaultData?: VaultData | null;
  };
  'vault.lock': { success: boolean };
  'vault.isUnlocked': boolean;
  'permission.check': boolean;
  'permission.grant': boolean;
  'blossom.upload': {
    uploading: boolean;
    error?: string | null;
    url?: string | null;
  };
  'ping': string;
  'vault.getData': { success: boolean; vaultData?: VaultData | null; error?: string };
  'vault.setData': { success: boolean; error?: string };
  'vault.export': { success: boolean; encryptedData?: string; error?: string };
  'vault.import': { success: boolean; error?: string };
  'activity.mark': void;
  'vault.updateData': { success: boolean; error?: string };
  'vault.create': { success: boolean; encryptedVault?: string; error?: string };
  'nostr.approval.respond': boolean;
}

// Error response
export interface BridgeError {
  id: string;
  error: {
    code: string;
    message: string;
  };
}

// Generic bridge response (either success or error)
export type BridgeResponse<T extends BridgeAction> =
  | BridgeResponseMap[T]
  | { id: string; error: { code: string; message: string } };

// Type-safe request function
export type BridgeRequest<T extends BridgeAction> = BridgeRequestMap[T];

// Helper type for response without id
export type BridgeResponsePayload<T extends BridgeAction> =
  BridgeResponseMap[T];

// Union of all requests
export type AnyBridgeRequest = BridgeRequestMap[keyof BridgeRequestMap];

// Union of all responses
export type AnyBridgeResponse = BridgeResponseMap[keyof BridgeResponseMap];

/**
 * Type-safe bridge message utilities
 */

// Generate unique ID for messages
export function generateBridgeId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Create a typed request
export function createBridgeRequest<T extends BridgeAction>(
  action: T,
  payload: Omit<BridgeRequestMap[T], 'id' | 'action'>
): BridgeRequestMap[T] {
  return {
    id: generateBridgeId(),
    action,
    ...payload,
  } as BridgeRequestMap[T];
}

// Type guard for error responses
export function isBridgeError<T extends BridgeAction>(
  response: BridgeResponse<T>
): response is BridgeError {
  return response !== null && typeof response === 'object' && 'error' in response;
}

// Type guard for success responses
export function isBridgeSuccess<T extends BridgeAction>(
  response: BridgeResponse<T>
): response is BridgeResponseMap[T] {
  return response !== null && typeof response === 'object' && !('error' in response);
}
