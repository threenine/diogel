import { finalizeEvent, getPublicKey, nip19, SimplePool } from 'nostr-tools';
import type { Event as NostrEvent } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';
import type { StoredKey } from 'src/types';
import type {
  ContactInputValidationResult,
  ContactListPublishResult,
  ContactListState,
  ContactListRelayPublishResult,
  Nip02Contact,
} from 'src/types/contact-list';
import useSettingsStore from 'src/stores/settings-store';
import { normalizeRelayUrl } from 'src/services/relay-url';

const CONTACT_LIST_KIND = 3;
const HEX_PUBKEY_PATTERN = /^[0-9a-f]{64}$/i;
const pool = new SimplePool();

function getAccountPubkey(storedKey: StoredKey): string {
  return getPublicKey(hexToBytes(storedKey.account.privkey));
}

export function normalizePubkey(input: string): string | null {
  const trimmed = input.trim();

  if (HEX_PUBKEY_PATTERN.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  try {
    const decoded = nip19.decode(trimmed);
    if (decoded.type === 'npub' && typeof decoded.data === 'string' && HEX_PUBKEY_PATTERN.test(decoded.data)) {
      return decoded.data.toLowerCase();
    }
  } catch {
    return null;
  }

  return null;
}

export function formatContactNpub(pubkey: string): string {
  return nip19.npubEncode(pubkey);
}

export function parseContactTags(tags: string[][]): Nip02Contact[] {
  const seen = new Set<string>();
  const contacts: Nip02Contact[] = [];

  for (const tag of tags) {
    const [name, rawPubkey, rawRelayUrl = '', rawPetname = ''] = tag;
    if (name !== 'p' || !rawPubkey) {
      continue;
    }

    const pubkey = normalizePubkey(rawPubkey);
    if (!pubkey || seen.has(pubkey)) {
      continue;
    }

    const relayUrl = rawRelayUrl.trim();
    const petname = rawPetname.trim();

    contacts.push({ pubkey, relayUrl, petname });
    seen.add(pubkey);
  }

  return contacts;
}

export function buildContactListTags(contacts: Nip02Contact[]): string[][] {
  return contacts.map((contact) => ['p', contact.pubkey, contact.relayUrl.trim(), contact.petname.trim()]);
}

export function validateContactInput(
  pubkeyInput: string,
  relayUrlInput: string,
  petnameInput: string,
  existingContacts: Nip02Contact[],
  originalPubkey?: string,
): ContactInputValidationResult {
  const pubkey = normalizePubkey(pubkeyInput);
  if (!pubkey) {
    return { valid: false, error: 'Enter a valid hex pubkey or npub.' };
  }

  const duplicate = existingContacts.some((contact) => contact.pubkey === pubkey && contact.pubkey !== originalPubkey);
  if (duplicate) {
    return { valid: false, error: 'This contact is already in the list.' };
  }

  const relayUrl = relayUrlInput.trim();
  if (relayUrl) {
    const relayResult = normalizeRelayUrl(relayUrl);
    if (!relayResult.valid || !relayResult.url) {
      return { valid: false, error: relayResult.error ?? 'Enter a valid relay URL.' };
    }

    return {
      valid: true,
      contact: {
        pubkey,
        relayUrl: relayResult.url,
        petname: petnameInput.trim(),
      },
    };
  }

  return {
    valid: true,
    contact: {
      pubkey,
      relayUrl: '',
      petname: petnameInput.trim(),
    },
  };
}

export async function fetchContactList(storedKey: StoredKey): Promise<ContactListState> {
  const settingsStore = useSettingsStore();
  const relays = await settingsStore.getFallbackRelays();
  const pubkey = getAccountPubkey(storedKey);

  const event = await pool.get(relays, {
    authors: [pubkey],
    kinds: [CONTACT_LIST_KIND],
  });

  const state: ContactListState = {
    accountAlias: storedKey.alias,
    pubkey,
    contacts: event ? parseContactTags(event.tags) : [],
    dirty: false,
  };

  if (event) {
    state.sourceEventId = event.id;
    state.sourceCreatedAt = event.created_at;
  }

  return state;
}

function settlePublishResult(relayUrl: string, result: Promise<string>): Promise<ContactListRelayPublishResult> {
  return result
    .then(() => ({ relayUrl, success: true }))
    .catch((error: unknown) => ({
      relayUrl,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }));
}

export async function publishContactList(
  storedKey: StoredKey,
  contacts: Nip02Contact[],
): Promise<ContactListPublishResult> {
  const settingsStore = useSettingsStore();
  const relays = await settingsStore.getFallbackRelays();
  const privateKeyBytes = hexToBytes(storedKey.account.privkey);

  const signedEvent = finalizeEvent(
    {
      kind: CONTACT_LIST_KIND,
      created_at: Math.floor(Date.now() / 1000),
      tags: buildContactListTags(contacts),
      content: '',
    },
    privateKeyBytes,
  ) as NostrEvent;

  const publishResults = pool.publish(relays, signedEvent);
  const relayResults = await Promise.all(
    relays.map((relayUrl, index) => settlePublishResult(relayUrl, publishResults[index] ?? Promise.reject(new Error('Publish was not attempted.')))),
  );

  if (!relayResults.some((result) => result.success)) {
    throw new Error('Failed to publish contact list to any relay.');
  }

  return {
    event: signedEvent,
    relayResults,
  };
}
