import { verifyEvent, type Event as NostrEvent, type UnsignedEvent } from 'nostr-tools';
import { db } from './database';
import { get, getActive } from './dexie-storage';
import { LogLevel, logService } from './log-service';
import { sendBexMessage } from './vault-service';
import { isVaultUnlocked } from './vault-service';
import { ErrorCode } from 'src/types/error-codes';

export type QuickSignSupportedKind = 1;

export interface QuickSignFormInput {
  kind: QuickSignSupportedKind;
  content: string;
  publish: boolean;
}

export type QuickSignAvailabilityState = 'ready' | 'locked' | 'no-account' | 'no-relay';

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
}

export interface QuickSignResult {
  success: boolean;
  signedEvent?: NostrEvent;
  published?: boolean;
  error?: string;
  code?: ErrorCode;
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

export function validateQuickSignInput(input: QuickSignFormInput): QuickSignValidationResult {
  const errors: string[] = [];

  if (input.kind !== 1) {
    errors.push('Only kind 1 text notes are supported in quick-sign.');
  }

  if (input.content.trim().length === 0) {
    errors.push('Content is required.');
  }

  if (input.content.length > 5000) {
    errors.push('Content is too long (max 5000 characters).');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function buildQuickSignPreviewEvent(pubkey: string, input: QuickSignFormInput): QuickSignPreparedEvent {
  const validation = validateQuickSignInput(input);
  const event: UnsignedEvent = {
    kind: input.kind,
    content: input.content,
    tags: [],
    created_at: Math.floor(Date.now() / 1000),
    pubkey,
  };

  return { event, validation };
}

async function publishSignedEvent(event: NostrEvent): Promise<void> {
  const onlineRelays = await db.relayCatalog
    .where('status')
    .equals('online')
    .toArray();

  if (onlineRelays.length === 0) {
    throw new Error('No online relays available for publishing.');
  }

  const { SimplePool } = await import('nostr-tools');
  const pool = new SimplePool();
  const relayUrls = onlineRelays.map((entry) => entry.url);

  await Promise.any(pool.publish(relayUrls, event));
}

export async function quickSignEvent(event: UnsignedEvent, publish: boolean): Promise<QuickSignResult> {
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
      await publishSignedEvent(signedEvent);
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
