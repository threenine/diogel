import type { Event } from 'nostr-tools';

export const NIP57_ZAP_REQUEST_KIND = 9734 as const;
export const NIP57_ZAP_RECEIPT_KIND = 9735 as const;

export type ZapTarget =
  | {
      type: 'profile';
      recipientPubkey: string;
    }
  | {
      type: 'event';
      recipientPubkey: string;
      eventId: string;
      eventKind: number;
      eventRelays?: string[];
    }
  | {
      type: 'addressable';
      recipientPubkey: string;
      coordinate: string;
      eventKind: number;
      eventRelays?: string[];
    };

export interface SendZapRequest {
  target: ZapTarget;
  amountSats?: number;
  amountMsat?: number;
  comment?: string;
  receiptRelays?: string[];
  lnurl?: string;
  lud16?: string;
  walletConnectionId?: string;
}

export type SendZapStatus = 'paid' | 'failed' | 'cancelled';

export type SendZapErrorCode =
  | 'VAULT_LOCKED'
  | 'NO_ACTIVE_ACCOUNT'
  | 'NO_ACTIVE_WALLET'
  | 'WALLET_UNSUPPORTED'
  | 'USER_REJECTED'
  | 'INVALID_REQUEST'
  | 'INVALID_AMOUNT'
  | 'LNURL_NOT_FOUND'
  | 'LNURL_UNSUPPORTED_NOSTR'
  | 'LNURL_LIMIT_VIOLATION'
  | 'LNURL_CALLBACK_FAILED'
  | 'INVOICE_INVALID'
  | 'PAYMENT_FAILED'
  | 'NETWORK_TIMEOUT';

export interface SendZapResult {
  status: SendZapStatus;
  amountMsat: number;
  recipientPubkey: string;
  zapRequestId?: string;
  invoice?: string;
  paymentHash?: string;
  feesPaidMsat?: number;
  target?: {
    eventId?: string;
    coordinate?: string;
    eventKind?: number;
  };
  error?: string;
  code?: SendZapErrorCode;
}

export interface ZapCapabilities {
  available: boolean;
  activeWalletConnection?: {
    id: string;
    label: string;
    supportsPayInvoice: boolean;
  };
  requiresConfirmation: true;
  supportsComments: true;
  supportsEventZap: true;
  supportsProfileZap: true;
  supportsAddressableZap: true;
}

export interface LnurlPayMetadata {
  callback: string;
  minSendable: number;
  maxSendable: number;
  allowsNostr: boolean;
  nostrPubkey: string;
  metadata?: string;
  commentAllowed?: number;
}

export interface ResolvedLnurlPayTarget extends LnurlPayMetadata {
  lnurl: string;
  lnurlPayUrl: string;
}

export interface LnurlInvoiceResponse {
  invoice: string;
  routes?: unknown[];
}

export interface BuildZapRequestInput {
  senderPubkey: string;
  recipientPubkey: string;
  amountMsat: number;
  lnurl: string;
  relays: string[];
  comment?: string;
  target: ZapTarget;
}

export type SignedZapRequest = Event & { kind: typeof NIP57_ZAP_REQUEST_KIND };

export interface Nip57ZapHistoryEntry {
  id: string;
  origin: string;
  connectionId: string;
  connectionLabel: string;
  senderPubkey: string;
  recipientPubkey: string;
  amountMsat: number;
  comment?: string;
  targetType: ZapTarget['type'];
  eventId?: string;
  coordinate?: string;
  eventKind?: number;
  lnurl: string;
  invoicePreview?: string;
  paymentHash?: string;
  feesPaidMsat?: number;
  zapRequestId?: string;
  status: SendZapStatus;
  error?: string;
  createdAt: string;
}
