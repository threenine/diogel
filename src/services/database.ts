import Dexie, { type Table } from 'dexie';

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

  constructor() {
    super('DiogelDatabase');
    console.log('[Database] Initializing NostrDatabase v4...');
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

    this.on('ready', () => {
      console.log('[Database] Dexie is ready');
    });
  }
}

export const db = new DiogelDatabase();
