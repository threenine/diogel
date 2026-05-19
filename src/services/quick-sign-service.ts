import { verifyEvent, type Event as NostrEvent, type UnsignedEvent } from 'nostr-tools';
import { db } from './database';
import { get, getActive } from './dexie-storage';
import { LogLevel, logService } from './log-service';
import { sendBexMessage } from './vault-service';
import { isVaultUnlocked } from './vault-service';
import { ErrorCode } from 'src/types/error-codes';
import type { StoredKey } from 'src/types/bridge';

export const QUICK_SIGN_SUPPORTED_KINDS = [0, 1, 3, 7, 30023] as const;
export type QuickSignSupportedKind = (typeof QUICK_SIGN_SUPPORTED_KINDS)[number];
const MAX_EVENT_JSON_BYTES = 16 * 1024;

export interface QuickSignFormInput {
  accountAlias: string;
  eventJson: string;
  publish: boolean;
  selectedRelayUrls: string[];
}

export type QuickSignAvailabilityState = 'ready' | 'locked' | 'no-account' | 'no-relay' | 'invalid-account';

export interface QuickSignAvailabilityResult {
  state: QuickSignAvailabilityState;
  error?: string;
}

export interface QuickSignValidationResult {
  valid: boolean;
  errors: string[];
}

export interface QuickSignPreparedEvent {
  event: UnsignedEvent;
  validation: QuickSignValidationResult;
  normalizedJson: string;
}

export interface QuickSignResult {
  success: boolean;
  signedEvent?: NostrEvent;
  published?: boolean;
  error?: string;
  code?: ErrorCode;
}

export interface QuickSignAccountOption {
  label: string;
  value: string;
  npub: string;
}

interface QuickSignSanitizedInput {
  kind: QuickSignSupportedKind;
  content: string;
  tags: string[][];
  created_at?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function hasBexSuccess(value: unknown): value is { success: boolean; event?: NostrEvent; error?: string; code?: string } {
  if (!isRecord(value) || !('success' in value)) {
    return false;
  }

  return typeof value.success === 'boolean';
}

export async function getQuickSignAvailability(publish: boolean): Promise<QuickSignAvailabilityResult> {
  const unlocked = await isVaultUnlocked();
  if (!unlocked) {
    return { state: 'locked' };
  }

  const activeAlias = await getActive();
  if (!activeAlias) {
    return { state: 'no-account' };
  }

  const accounts = await get();
  if (!accounts[activeAlias]) {
    return { state: 'no-account' };
  }

  if (publish) {
    const onlineRelayCount = (await db.relayCatalog.where('status').equals('online').count()) || 0;
    if (onlineRelayCount <= 0) {
      return { state: 'no-relay' };
    }
  }

  return { state: 'ready' };
}

export async function listQuickSignAccounts(): Promise<QuickSignAccountOption[]> {
  const accounts = await get();

  return Object.values(accounts).map((account: StoredKey) => ({
    label: `${account.alias} (${account.id})`,
    value: account.alias,
    npub: account.id,
  }));
}

export async function listQuickSignOnlineRelayUrls(): Promise<string[]> {
  const onlineRelays = await db.relayCatalog
    .where('status')
    .equals('online')
    .toArray();

  return onlineRelays.map((entry) => entry.url);
}

function isQuickSignSupportedKind(kind: number): kind is QuickSignSupportedKind {
  return QUICK_SIGN_SUPPORTED_KINDS.includes(kind as QuickSignSupportedKind);
}

function parseQuickSignInput(eventJson: string): { value?: QuickSignSanitizedInput; errors: string[] } {
  const errors: string[] = [];
  const payloadSize = new TextEncoder().encode(eventJson).length;
  if (payloadSize > MAX_EVENT_JSON_BYTES) {
    errors.push(`Event JSON is too large (max ${MAX_EVENT_JSON_BYTES} bytes).`);
    return { errors };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(eventJson);
  } catch {
    errors.push('Event must be valid JSON.');
    return { errors };
  }

  if (!isRecord(parsed) || Array.isArray(parsed)) {
    errors.push('Event must be a JSON object.');
    return { errors };
  }

  const kindRaw = parsed.kind;
  if (typeof kindRaw !== 'number' || !Number.isInteger(kindRaw)) {
    errors.push('Event kind must be an integer.');
  } else if (!isQuickSignSupportedKind(kindRaw)) {
    errors.push('Event kind is not supported by quick-sign.');
  }

  const contentRaw = parsed.content;
  if (typeof contentRaw !== 'string') {
    errors.push('Event content must be a string.');
  }

  const tagsRaw = parsed.tags;
  if (!Array.isArray(tagsRaw) || !tagsRaw.every((tag) => Array.isArray(tag) && tag.every((value) => typeof value === 'string'))) {
    errors.push('Event tags must be an array of string arrays.');
  }

  const createdAtRaw = parsed.created_at;
  if (typeof createdAtRaw !== 'undefined' && (typeof createdAtRaw !== 'number' || !Number.isInteger(createdAtRaw))) {
    errors.push('Event created_at must be an integer UNIX timestamp.');
  }

  if (errors.length > 0) {
    return { errors };
  }

  const sanitizedValue: QuickSignSanitizedInput = {
    kind: kindRaw as QuickSignSupportedKind,
    content: contentRaw as string,
    tags: tagsRaw as string[][],
  };

  if (typeof createdAtRaw === 'number') {
    sanitizedValue.created_at = createdAtRaw;
  }

  return {
    value: sanitizedValue,
    errors,
  };
}

export function validateQuickSignInput(input: QuickSignFormInput): QuickSignValidationResult {
  const errors: string[] = [];

  if (!input.accountAlias.trim()) {
    errors.push('Signing account is required.');
  }

  const parsed = parseQuickSignInput(input.eventJson);
  errors.push(...parsed.errors);

  if (input.publish && input.selectedRelayUrls.length === 0) {
    errors.push('Select at least one relay to publish.');
  }

  if (input.selectedRelayUrls.some((url) => url.trim().length === 0)) {
    errors.push('Relay URLs must be valid non-empty strings.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function buildQuickSignPreviewEvent(pubkey: string, input: QuickSignFormInput): QuickSignPreparedEvent {
  const validation = validateQuickSignInput(input);
  const parsed = parseQuickSignInput(input.eventJson);

  const now = Math.floor(Date.now() / 1000);
  const sanitizedInput: QuickSignSanitizedInput = parsed.value || {
    kind: 1,
    content: '',
    tags: [],
    created_at: now,
  };

  const event: UnsignedEvent = {
    kind: sanitizedInput.kind,
    content: sanitizedInput.content,
    tags: sanitizedInput.tags,
    created_at: sanitizedInput.created_at || now,
    pubkey,
  };

  return {
    event,
    validation,
    normalizedJson: JSON.stringify(event, null, 2),
  };
}

async function publishSignedEvent(event: NostrEvent, relayUrls: string[]): Promise<void> {
  if (relayUrls.length === 0) {
    throw new Error('No relays selected for publishing.');
  }

  const { SimplePool } = await import('nostr-tools');
  const pool = new SimplePool();

  await Promise.any(pool.publish(relayUrls, event));
}

export async function quickSignEvent(event: UnsignedEvent, publish: boolean, relayUrls: string[] = []): Promise<QuickSignResult> {
  const response = await sendBexMessage('nostr.signEvent', {
    event,
    origin: 'diogel-dashboard-quick-sign',
  });

  if (!hasBexSuccess(response)) {
    return {
      success: false,
      error: 'Unexpected response from signer.',
      code: ErrorCode.GEN_UNKNOWN,
    };
  }

  if (!response.success || !response.event) {
    return {
      success: false,
      error: response.error || 'Signing failed.',
      code: (response.code as ErrorCode | undefined) || ErrorCode.SIG_FAILED,
    };
  }

  const signedEvent = response.event;
  if (!verifyEvent(signedEvent)) {
    return {
      success: false,
      error: 'Signed event failed verification.',
      code: ErrorCode.SIG_INVALID_EVENT,
    };
  }

  logService.log(LogLevel.INFO, '[QuickSign] Event signed successfully', {
    kind: signedEvent.kind,
    id: signedEvent.id,
  });

  if (publish) {
    try {
      await publishSignedEvent(signedEvent, relayUrls);
      logService.log(LogLevel.INFO, '[QuickSign] Event published successfully', {
        kind: signedEvent.kind,
        id: signedEvent.id,
      });
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        code: ErrorCode.NET_SERVER_ERROR,
      };
    }
  }

  return {
    success: true,
    signedEvent,
    published: publish,
  };
}
