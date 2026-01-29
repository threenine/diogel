import Dexie, { type Table } from 'dexie';
import type { StoredKey } from '../types';

export interface Vault {
  id: string; // 'master' or some unique ID
  encryptedData: string;
  createdAt: string;
}

export class NostrDatabase extends Dexie {
  storedKeys!: Table<StoredKey, string>; // 'id' is the primary key
  vaults!: Table<Vault, string>;

  constructor() {
    super('NostrDatabase');
    console.log('[Database] Initializing NostrDatabase v2...');
    this.version(2).stores({
      storedKeys: 'id, alias, createdAt', // Primary key and indexed fields
      vaults: 'id',
    });
    this.on('ready', () => {
      console.log('[Database] Dexie is ready');
    });
  }
}

export const db = new NostrDatabase();
