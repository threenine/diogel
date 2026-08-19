/**
 * Approval presentation rules.
 *
 * Owns the labels, the event-kind risk classification, and the grant options each class may be
 * offered (ADR D11, D12). Kept out of the components so the panel and any remaining approval
 * surface describe a request identically, and so the rules are testable on their own.
 */

import type { ApprovalDuration } from 'app/src-bex/types/background';

export type RequestRiskClass = 'standard' | 'elevated' | 'unknown' | 'payment';

export interface UnsignedEventPreview {
  kind: number;
  content: string;
  tags: string[][];
  created_at: number;
  pubkey?: string;
}

export const REQUEST_TYPE_LABELS: Readonly<Record<string, string>> = {
  get_public_key: 'Public key request',
  get_relays: 'Relay list request',
  sign_event: 'Sign event request',
  nip04_encrypt: 'NIP-04 encryption request',
  nip04_decrypt: 'NIP-04 decryption request',
  nip44_encrypt: 'NIP-44 encryption request',
  nip44_decrypt: 'NIP-44 decryption request',
  send_zap: 'Lightning zap payment request',
  webln_enable: 'WebLN wallet access request',
  webln_send_payment: 'WebLN payment request',
};

export const NOSTR_KIND_LABELS: Readonly<Record<number, string>> = {
  0: 'Profile metadata',
  1: 'Text note',
  3: 'Contact list',
  4: 'Encrypted direct message',
  5: 'Event deletion',
  6: 'Repost',
  7: 'Reaction',
  40: 'Channel creation',
  41: 'Channel metadata',
  42: 'Channel message',
  44: 'Channel mute user',
  1063: 'File metadata',
  1984: 'Reporting',
  9734: 'Zap request',
  9735: 'Zap receipt',
  10002: 'Relay list metadata',
  22242: 'Client authentication',
  30023: 'Long-form content',
};

/**
 * Kinds that change identity-visible state or grant session access (D12).
 *
 * These are not the kinds users see most often; they are the ones where a standing grant does
 * the most damage.
 */
export const ELEVATED_EVENT_KINDS: readonly number[] = [3, 5, 9734, 10002, 22242];

const PAYMENT_REQUEST_TYPES: readonly string[] = ['webln_send_payment', 'send_zap'];

/** Effects named in the warning, so the user is told what the kind actually does. */
const ELEVATED_KIND_EFFECTS: Readonly<Record<number, string>> = {
  3: 'replace the list of accounts you follow',
  5: 'request deletion of events you previously published',
  9734: 'authorise a Lightning payment',
  10002: 'replace the list of relays your identity advertises',
  22242: 'prove your identity to this site for a session',
};

export const isKnownEventKind = (kind: number): boolean =>
  Object.prototype.hasOwnProperty.call(NOSTR_KIND_LABELS, kind);

export const getRequestTypeLabel = (requestType: string): string =>
  REQUEST_TYPE_LABELS[requestType] ?? 'Signer request';

export const getEventKindLabel = (kind: number): string => {
  if (!Number.isInteger(kind) || kind < 0) return 'No Nostr event kind';
  const label = NOSTR_KIND_LABELS[kind];
  return label ? `${label} (${kind})` : `Unrecognised event kind (${kind})`;
};

export const classifyRequest = (requestType: string, eventKind: number): RequestRiskClass => {
  if (PAYMENT_REQUEST_TYPES.includes(requestType)) return 'payment';
  // -1 means the request carries no event kind, not "any kind".
  if (eventKind < 0) return 'standard';
  if (ELEVATED_EVENT_KINDS.includes(eventKind)) return 'elevated';
  if (!isKnownEventKind(eventKind)) return 'unknown';
  return 'standard';
};

export const getRiskWarning = (
  riskClass: RequestRiskClass,
  eventKind: number,
): string | undefined => {
  if (riskClass === 'elevated') {
    const effect = ELEVATED_KIND_EFFECTS[eventKind];
    return effect
      ? `Approving this lets the site ${effect}.`
      : 'This request has a lasting effect on your identity.';
  }
  if (riskClass === 'unknown') {
    return 'Porwr does not recognise this event kind. Read the full event before approving.';
  }
  return undefined;
};

/**
 * Grant options a request may be offered.
 *
 * Payments are one-time whatever else is true (D11). Unknown kinds may only be approved once, and
 * elevated kinds may never be granted `always` (D12). Options that are not available are omitted
 * rather than shown disabled.
 */
export const getAllowedDurations = (
  riskClass: RequestRiskClass,
  allowRemember: boolean,
): ApprovalDuration[] => {
  if (!allowRemember || riskClass === 'payment' || riskClass === 'unknown') return ['once'];
  if (riskClass === 'elevated') return ['once', '8h'];
  return ['once', '8h', 'always'];
};

/** Whether the full event should be open by default rather than the formatted summary (D12). */
export const shouldDefaultToFullEvent = (riskClass: RequestRiskClass): boolean =>
  riskClass === 'unknown';

export interface FormattedEventField {
  label: string;
  value: string;
}

/** Human-readable view of the meaningful fields, for the formatted preview mode. */
export const formatEventFields = (event: UnsignedEventPreview): FormattedEventField[] => {
  const fields: FormattedEventField[] = [
    { label: 'Kind', value: getEventKindLabel(event.kind) },
    { label: 'Created', value: new Date(event.created_at * 1000).toLocaleString() },
  ];

  const mentions = event.tags.filter((tag) => tag[0] === 'p').length;
  if (mentions > 0) fields.push({ label: 'Mentions', value: String(mentions) });

  const references = event.tags.filter((tag) => tag[0] === 'e').length;
  if (references > 0) fields.push({ label: 'References events', value: String(references) });

  if (event.tags.length > 0) fields.push({ label: 'Tags', value: String(event.tags.length) });

  return fields;
};

export const MAX_PREVIEW_CHARACTERS = 600;

export interface TruncatedContent {
  text: string;
  truncated: boolean;
  fullLength: number;
}

/** Truncation is always visible to the user; nothing is silently shortened (specification §6). */
export const truncateForPreview = (
  content: string,
  limit: number = MAX_PREVIEW_CHARACTERS,
): TruncatedContent => {
  const normalized = content ?? '';
  if (normalized.length <= limit) {
    return { text: normalized, truncated: false, fullLength: normalized.length };
  }
  return { text: normalized.slice(0, limit), truncated: true, fullLength: normalized.length };
};
