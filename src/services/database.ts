import Dexie, { type Table } from 'dexie';
import type { StoredKey } from 'src/types';

export class NostrDatabase extends Dexie {
  storedKeys!: Table<StoredKey, string>; // 'id' is the primary key

  constructor() {
    super('NostrDatabase');
    this.version(1).stores({
      storedKeys: 'id, alias, createdAt', // Primary key and indexed fields
    });
  }
}

export const db = new NostrDatabase();
