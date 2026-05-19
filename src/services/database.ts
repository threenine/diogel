import Dexie, { type Table } from 'dexie';
import type { RelayCatalogEntry, RelayDiscoveryState } from 'src/types/relay';

export interface Vault {
  id: string; // 'master' or some unique ID
  encryptedData: string;
  createdAt: string;
}

export interface ExceptionLog {
  id?: number;
  dateTime: string;
  message: string;
  account?: string | null;
  hostname?: string | null;
}

export interface ApprovalLog {
  id?: number;
  dateTime: string;
  eventKind: number | string;
  hostname: string;
  account?: string | null;
}

export class DiogelDatabase extends Dexie {
  vaults!: Table<Vault, string>;
  exceptions!: Table<ExceptionLog, number>;
  approvals!: Table<ApprovalLog, number>;
  relayCatalog!: Table<RelayCatalogEntry, string>;
  relayDiscoveryState!: Table<RelayDiscoveryState, string>;

  constructor() {
    super('DiogelDatabase');
    this.version(3)
      .stores({
        vaults: 'id',
      })
      .upgrade((tx) => {
        // Version 3 removes storedKeys table
        return tx.table('storedKeys').clear();
      });

    this.version(4).stores({
      vaults: 'id',
      exceptions: '++id, dateTime',
      approvals: '++id, dateTime, eventKind, hostname',
    });

    this.version(5).stores({
      vaults: 'id',
      exceptions: '++id, dateTime, account',
      approvals: '++id, dateTime, eventKind, hostname, account',
    });

    this.version(6).stores({
      vaults: 'id',
      exceptions: '++id, dateTime, account, hostname',
      approvals: '++id, dateTime, eventKind, hostname, account',
    });

    this.version(7).stores({
      vaults: 'id',
      exceptions: '++id, dateTime, account, hostname',
      approvals: '++id, dateTime, eventKind, hostname, account',
      relayCatalog: 'url, hostname, status, lastSeen, createdAt',
      relayDiscoveryState: 'id, lastGlobalDiscoveryAt',
    });
  }
}

export const db = new DiogelDatabase();
