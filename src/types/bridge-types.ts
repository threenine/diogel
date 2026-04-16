import type { StoredKey } from './index.d';
import type { RelayCatalogEntry, RelayDiscoveryState } from './relay';

/**
 * Common types shared between UI and Background/Content Script
 */

export interface UnsignedNostrEvent {
  kind: number;
  content: string;
  pubkey: string;
  created_at: number;
  tags: string[][];
}

export interface GetPublicKeyRequest {
  origin: string;
}

export interface SignEventRequest {
  event: UnsignedNostrEvent;
  origin: string;
}

export type GetPublicKeyResponse = string;

export interface SignEventResponse {
  id: string;
  pubkey: string;
  sig: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
}

export type BridgeErrorCode = 'VAULT_LOCKED' | 'PERMISSION_DENIED' | 'SIGNING_FAILED' | 'NOT_FOUND';

export interface BridgeError {
  id?: string;
  code?: string;
  message: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

export interface VaultData {
  accounts: StoredKey[];
  mnemonic?: string;
  passphrase?: string;
  createdAt?: string;
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
  | 'nostr.approval.respond'
  | 'relay.browser.list'
  | 'relay.browser.getStatus'
  | 'relay.browser.refresh';

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
    duration: '8h' | 'always';
  };
  'blossom.upload': {
    id: string;
    action: 'blossom.upload';
    base64Data?: string;
    fileType?: string;
    blossomServer?: string;
    uploadId?: string;
    file?: File;
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
  'vault.export': {
    id: string;
    action: 'vault.export';
  };
  'vault.import': {
    id: string;
    action: 'vault.import';
    payload?: { encryptedData: string };
    encryptedData?: string;
  };
  'activity.mark': {
    id: string;
    action: 'activity.mark';
  };
  'nostr.approval.respond': {
    id: string;
    action: 'nostr.approval.respond';
    approved: boolean;
    duration: string;
    requestId?: string;
  };
  'relay.browser.list': {
    id: string;
    action: 'relay.browser.list';
  };
  'relay.browser.getStatus': {
    id: string;
    action: 'relay.browser.getStatus';
  };
  'relay.browser.refresh': {
    id: string;
    action: 'relay.browser.refresh';
    force?: boolean;
  };
}

export interface BridgeResponseMap {
  'nostr.getPublicKey': string;
  'nostr.signEvent': SignEventResponse;
  'nostr.getRelays': Record<string, { read: boolean; write: boolean }>;
  'nostr.nip04.encrypt': string;
  'nostr.nip04.decrypt': string;
  'nostr.nip44.encrypt': string;
  'nostr.nip44.decrypt': string;
  'vault.unlock': { success: boolean; vaultData?: VaultData | null; error?: string };
  'vault.lock': { success: boolean };
  'vault.isUnlocked': boolean;
  'permission.check': boolean;
  'permission.grant': boolean;
  'blossom.upload': { uploading?: boolean; url?: string | null; sha256?: string; error?: string | null };
  'ping': string;
  'vault.getData': { success: boolean; vaultData?: VaultData | null; error?: string };
  'vault.setData': { success: boolean; error?: string };
  'vault.updateData': { success: boolean; error?: string };
  'vault.create': { success: boolean; encryptedVault?: string; error?: string };
  'vault.export': { success: boolean; encryptedData?: string; error?: string };
  'vault.import': { success: boolean; error?: string };
  'activity.mark': boolean | void;
  'nostr.approval.respond': boolean | { success: boolean };
  'relay.browser.list': RelayCatalogEntry[];
  'relay.browser.getStatus': RelayDiscoveryState | null;
  'relay.browser.refresh': boolean | { success: false; error: string };
}

export type BridgeRequest<K extends BridgeAction> = BridgeRequestMap[K];
export type BridgeResponsePayload<K extends BridgeAction> = BridgeResponseMap[K];

export interface BridgeResponse<K extends BridgeAction> {
  id: string;
  action: K;
  data?: BridgeResponsePayload<K>;
  error?: string;
}
