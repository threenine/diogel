import Dexie, { type Table } from 'dexie';

export interface Vault {
  id: string; // 'master' or some unique ID
  encryptedData: string;
  createdAt: string;
}

export class DiogelDatabase extends Dexie {
  vaults!: Table<Vault, string>;

  constructor() {
    super('DiogelDatabase');
    console.log('[Database] Initializing NostrDatabase v3...');
    this.version(3)
      .stores({
        vaults: 'id',
      })
      .upgrade((tx) => {
        // Version 3 removes storedKeys table
        return tx.table('storedKeys').clear();
      });
    this.on('ready', () => {
      console.log('[Database] Dexie is ready');
    });
  }
}

export const db = new DiogelDatabase();
