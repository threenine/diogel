import { finalizeEvent, getPublicKey, SimplePool, nip04 } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';
import type { Event } from 'nostr-tools';
import {
  NIP47_REQUEST_KIND,
  NIP47_RESPONSE_KIND,
  NIP47_WALLET_INFO_KIND,
  type Nip47BalanceResponse,
  type Nip47Command,
  type Nip47Connection,
  type Nip47InfoResponse,
  type Nip47RpcRequest,
  type Nip47RpcResponse,
} from 'src/types/nip47';

function parseJsonRecord(value: string): Record<string, unknown> {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('NIP-47 response was not a JSON object');
  }
  return parsed as Record<string, unknown>;
}

function parseCommands(content: string): Nip47Command[] {
  return content
    .split(/\s+/)
    .map((item) => item.trim())
    .filter((item): item is Nip47Command => item.length > 0);
}

function tagValues(event: Event, tagName: string): string[] {
  return event.tags
    .filter((tag) => tag[0] === tagName)
    .flatMap((tag) => tag.slice(1).join(' ').split(/\s+/))
    .filter((value) => value.length > 0);
}

function parseRpcResponse(content: string): Nip47RpcResponse {
  const record = parseJsonRecord(content);
  const errorRecord = record.error;
  const resultRecord = record.result;
  return {
    ...(typeof record.result_type === 'string' ? { result_type: record.result_type as Nip47Command } : {}),
    ...(resultRecord && typeof resultRecord === 'object' && !Array.isArray(resultRecord)
      ? { result: resultRecord as Record<string, unknown> }
      : {}),
    ...(errorRecord && typeof errorRecord === 'object' && !Array.isArray(errorRecord)
      ? {
          error: {
            code: typeof (errorRecord as Record<string, unknown>).code === 'string'
              ? String((errorRecord as Record<string, unknown>).code)
              : 'UNKNOWN',
            message: typeof (errorRecord as Record<string, unknown>).message === 'string'
              ? String((errorRecord as Record<string, unknown>).message)
              : 'NIP-47 wallet returned an error',
          },
        }
      : {}),
  };
}

export class Nip47Client {
  private readonly pool = new SimplePool();

  async getInfo(connection: Nip47Connection): Promise<Nip47InfoResponse> {
    const event = await this.pool.get(
      connection.relays,
      {
        kinds: [NIP47_WALLET_INFO_KIND],
        authors: [connection.walletServicePubkey],
        limit: 1,
      },
      { maxWait: 5000 },
    );

    if (!event) {
      throw new Error('No NIP-47 wallet info event found on configured relays');
    }

    return {
      pubkey: event.pubkey,
      capabilities: parseCommands(event.content),
      relays: connection.relays,
      encryption: tagValues(event, 'encryption'),
      notifications: tagValues(event, 'notifications'),
      rawContent: event.content,
      checkedAt: new Date().toISOString(),
    };
  }

  async getBalance(connection: Nip47Connection): Promise<Nip47BalanceResponse> {
    const response = await this.sendRequest(connection, { method: 'get_balance', params: {} });
    if (response.error) {
      throw new Error(`${response.error.code}: ${response.error.message}`);
    }

    const balance = response.result?.balance;
    if (typeof balance !== 'number') {
      throw new Error('NIP-47 get_balance response did not include numeric balance');
    }

    return {
      balanceMsat: balance,
      raw: response.result ?? {},
    };
  }

  async sendRequest(connection: Nip47Connection, request: Nip47RpcRequest): Promise<Nip47RpcResponse> {
    const clientSecretBytes = hexToBytes(connection.clientSecret);
    const clientPubkey = getPublicKey(clientSecretBytes);
    const requestId = crypto.randomUUID();
    const requestPayload = JSON.stringify({
      id: requestId,
      method: request.method,
      params: request.params,
    });
    const encryptedContent = nip04.encrypt(clientSecretBytes, connection.walletServicePubkey, requestPayload);

    const since = Math.floor(Date.now() / 1000) - 10;
    const pendingResponse = this.waitForResponse(connection, clientPubkey, requestId, since, clientSecretBytes);

    const event = finalizeEvent(
      {
        kind: NIP47_REQUEST_KIND,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['p', connection.walletServicePubkey]],
        content: encryptedContent,
      },
      clientSecretBytes,
    );

    await Promise.any(this.pool.publish(connection.relays, event, { maxWait: 5000 }));
    return pendingResponse;
  }

  close(): void {
    this.pool.destroy();
  }

  private waitForResponse(
    connection: Nip47Connection,
    clientPubkey: string,
    requestId: string,
    since: number,
    clientSecretBytes: Uint8Array,
  ): Promise<Nip47RpcResponse> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        closer.close('nip47 response timeout');
        reject(new Error('Timed out waiting for NIP-47 wallet response'));
      }, 15000);

      const closer = this.pool.subscribe(
        connection.relays,
        {
          kinds: [NIP47_RESPONSE_KIND],
          authors: [connection.walletServicePubkey],
          '#p': [clientPubkey],
          since,
        },
        {
          maxWait: 15000,
          onevent: (event: Event) => {
            try {
              const decrypted = nip04.decrypt(clientSecretBytes, event.pubkey, event.content);
              const responseRecord = parseJsonRecord(decrypted);
              if (responseRecord.id !== requestId) {
                return;
              }
              clearTimeout(timeout);
              closer.close('nip47 response received');
              resolve(parseRpcResponse(decrypted));
            } catch (error: unknown) {
              clearTimeout(timeout);
              closer.close('nip47 response parse failure');
              reject(error instanceof Error ? error : new Error(String(error)));
            }
          },
          onclose: () => undefined,
        },
      );
    });
  }
}

export const nip47Client = new Nip47Client();
