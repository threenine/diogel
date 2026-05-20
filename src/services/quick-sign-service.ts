import { verifyEvent, type Event as NostrEvent, type UnsignedEvent } from 'nostr-tools';
import { db } from './database';
import { get, getActive } from './dexie-storage';
import { LogLevel, logService } from './log-service';
import { sendBexMessage } from './vault-service';
import { isVaultUnlocked } from './vault-service';
import { parseRelayListEvent, normalizeAndDeduplicateRelays } from './relay-discovery';
import useSettingsStore from 'src/stores/settings-store';
import { ErrorCode } from 'src/types/error-codes';
import type { StoredKey } from 'src/types/bridge';

export const QUICK_SIGN_SUPPORTED_KINDS = [1, 30023] as const;
export type QuickSignSupportedKind = (typeof QUICK_SIGN_SUPPORTED_KINDS)[number];

export type QuickSignTagType = 'p' | 'a' | 't' | 'e';

export interface QuickSignTagInput {
  type: QuickSignTagType;
  value: string;
}

export interface QuickSignFormInput {
  accountAlias: string;
  kind: QuickSignSupportedKind;
  content: string;
  tags: QuickSignTagInput[];
}

export interface QuickSignPublishInput {
  relayUrls: string[];
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

export interface QuickSignContentValidationResult {
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
  tags: QuickSignTagInput[];
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

function isQuickSignTagType(value: string): value is QuickSignTagType {
  return value === 'p' || value === 'a' || value === 't' || value === 'e';
}

function containsRawHtml(content: string): boolean {
  return /<[^>]+>/.test(content);
}

function containsLikelyMarkdown(content: string): boolean {
  // This is intentionally conservative for MVP. We only block obvious Markdown
  // markers and do not attempt full Markdown parsing.
  // - May miss uncommon Markdown constructs.
  // - May flag plain text that intentionally starts with markdown-like prefixes.
  return /(^|\n)\s{0,3}(#{1,6}\s|[-*+]\s|\d+\.\s|>\s)|\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|__[^_]+__|`[^`]+`/.test(content);
}

export function validateQuickSignContent(
  kind: QuickSignSupportedKind,
  content: string,
): QuickSignContentValidationResult {
  const errors: string[] = [];

  if (content.trim().length === 0) {
    errors.push('Event content is required.');
  }

  // Intentionally blocks obvious raw HTML tags (opening/closing). Comparison
  // text like `1 < 2` is allowed because it does not match the tag pattern.
  if (containsRawHtml(content)) {
    errors.push('Event content cannot contain raw HTML tags.');
  }

  if (kind === 1 && containsLikelyMarkdown(content)) {
    errors.push('Kind 1 content cannot contain Markdown formatting.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function isValidRelayUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'ws:' || parsed.protocol === 'wss:';
  } catch {
    return false;
  }
}

export async function getQuickSignAvailability(publish: boolean, relayUrls: string[] = []): Promise<QuickSignAvailabilityResult> {
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
    const hasEligibleRelay = relayUrls.some((url) => url.trim().length > 0);
    if (!hasEligibleRelay) {
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

export async function listQuickSignAccountRelayUrls(accountAlias: string): Promise<string[]> {
  const alias = accountAlias.trim();
  if (!alias) {
    return [];
  }

  const keys = await get();
  const selectedAccount = keys[alias];
  if (!selectedAccount) {
    return [];
  }

  const settingsStore = useSettingsStore();
  if (settingsStore.fallbackRelays.length === 0) {
    await settingsStore.getSettings();
  }

  const fallbackRelays = settingsStore.fallbackRelays;
  if (fallbackRelays.length === 0) {
    return [];
  }

  const { SimplePool } = await import('nostr-tools');
  const pool = new SimplePool();

  try {
    const event = await pool.get(fallbackRelays, {
      kinds: [10002],
      authors: [selectedAccount.id],
    });

    if (!event) {
      return [];
    }

    const relayUrls = parseRelayListEvent(event);
    return normalizeAndDeduplicateRelays(relayUrls);
  } catch {
    return [];
  } finally {
    pool.close(fallbackRelays);
  }
}

function isQuickSignSupportedKind(kind: number): kind is QuickSignSupportedKind {
  return QUICK_SIGN_SUPPORTED_KINDS.includes(kind as QuickSignSupportedKind);
}

function parseQuickSignInput(input: QuickSignFormInput): { value?: QuickSignSanitizedInput; errors: string[] } {
  const errors: string[] = [];

  const kindRaw: number = input.kind;
  if (!Number.isInteger(kindRaw)) {
    errors.push('Event kind must be an integer.');
  } else if (!isQuickSignSupportedKind(kindRaw)) {
    errors.push('Event kind is not supported by quick-sign.');
  }

  const contentRaw = input.content;
  if (typeof contentRaw !== 'string') {
    errors.push('Event content must be a string.');
  } else {
    if (isQuickSignSupportedKind(kindRaw)) {
      const contentValidation = validateQuickSignContent(kindRaw, contentRaw);
      errors.push(...contentValidation.errors);
    } else if (contentRaw.trim().length === 0) {
      errors.push('Event content is required.');
    }
  }

  const tagsRaw = input.tags;
  if (!Array.isArray(tagsRaw)) {
    errors.push('Event tags must be an array.');
  } else {
    tagsRaw.forEach((tag, index) => {
      if (!isRecord(tag)) {
        errors.push(`Tag #${index + 1} is invalid.`);
        return;
      }

      if (!('type' in tag) || typeof tag.type !== 'string' || !isQuickSignTagType(tag.type)) {
        errors.push(`Tag #${index + 1} has unsupported type.`);
      }

      if (!('value' in tag) || typeof tag.value !== 'string' || tag.value.trim().length === 0) {
        errors.push(`Tag #${index + 1} value is required.`);
      }
    });
  }

  if (errors.length > 0) {
    return { errors };
  }

  const sanitizedValue: QuickSignSanitizedInput = {
    kind: kindRaw as QuickSignSupportedKind,
    content: contentRaw,
    tags: tagsRaw,
  };

  return {
    value: sanitizedValue,
    errors,
  };
}

export function validateQuickSignInput(input: QuickSignFormInput, publishInput?: QuickSignPublishInput): QuickSignValidationResult {
  const errors: string[] = [];

  if (!input.accountAlias.trim()) {
    errors.push('Signing account is required.');
  }

  const parsed = parseQuickSignInput(input);
  errors.push(...parsed.errors);

  if (publishInput) {
    if (publishInput.relayUrls.length === 0) {
      errors.push('Select at least one relay to publish.');
    }

    if (publishInput.relayUrls.some((url) => url.trim().length === 0 || !isValidRelayUrl(url.trim()))) {
      errors.push('Relay URLs must be valid ws:// or wss:// URLs.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function buildQuickSignPreviewEvent(pubkey: string, input: QuickSignFormInput): QuickSignPreparedEvent {
  const validation = validateQuickSignInput(input);
  const parsed = parseQuickSignInput(input);

  const now = Math.floor(Date.now() / 1000);
  const sanitizedInput: QuickSignSanitizedInput = parsed.value || {
    kind: 1,
    content: '',
    tags: [],
  };

  const event: UnsignedEvent = {
    kind: sanitizedInput.kind,
    content: sanitizedInput.content,
    tags: sanitizedInput.tags.map((tag) => [tag.type, tag.value]),
    created_at: now,
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
