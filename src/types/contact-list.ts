import type { Event as NostrEvent } from 'nostr-tools';

export interface Nip02Contact {
  pubkey: string;
  relayUrl: string;
  petname: string;
}

export interface ContactProfile {
  pubkey: string;
  name: string;
  displayName: string;
  about: string;
  picture: string;
  nip05: string;
  updatedAt: number;
}

export interface ContactListState {
  accountAlias: string;
  pubkey: string;
  contacts: Nip02Contact[];
  sourceEventId?: string;
  sourceCreatedAt?: number;
  dirty: boolean;
}

export interface ContactListPublishResult {
  event: NostrEvent;
  relayResults: ContactListRelayPublishResult[];
}

export interface ContactListRelayPublishResult {
  relayUrl: string;
  success: boolean;
  error?: string;
}

export interface ContactInputValidationResult {
  valid: boolean;
  contact?: Nip02Contact;
  error?: string;
}
