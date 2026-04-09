export interface RelayCatalogEntry {
  url: string; // canonical relay URL (primary key)
  hostname: string;
  isUserAdded: boolean; // manually added by user
  isSeed: boolean; // comes from hardcoded seeds
  metadata?: {
    name?: string;
    description?: string;
    pubkey?: string;
    contact?: string;
    supported_nips?: number[];
    software?: string;
    version?: string;
    [key: string]: unknown;
  };
  status: 'unknown' | 'online' | 'offline' | 'error';
  lastSeen?: number; // timestamp
  lastChecked?: number; // timestamp
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
  source?: string; // e.g. 'discovery', 'nprofile', 'manual', 'seed'
}

export interface RelayDiscoveryState {
  id: string; // 'global' or some specific discovery task ID
  lastGlobalDiscoveryAt?: number; // timestamp
  isDiscoveryInProgress: boolean;
  discoveryStats?: {
    totalDiscovered: number;
    newFound: number;
    lastError?: string;
  };
  updatedAt: number;
}
