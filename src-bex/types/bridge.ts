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
}

export type BridgeErrorCode = 'VAULT_LOCKED' | 'PERMISSION_DENIED' | 'SIGNING_FAILED' | 'NOT_FOUND';

export interface BridgeError {
  code: BridgeErrorCode;
  message: string;
}
