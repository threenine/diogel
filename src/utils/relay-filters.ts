import type { RelayCatalogEntry } from 'src/types/relay';

export function filterAndSortRelays(
  relays: RelayCatalogEntry[],
  searchText: string,
  searchOnly: boolean,
): RelayCatalogEntry[] {
  const normalizedSearch = searchText.toLowerCase().trim();

  return relays
    .filter((relay) => {
      // 1. Filter by searchCapable (NIP-50)
      if (searchOnly) {
        const supportedNips = relay.metadata?.supported_nips || [];
        if (!supportedNips.includes(50)) {
          return false;
        }
      }

      // 2. Filter by text (name, hostname, URL)
      if (normalizedSearch) {
        const name = (relay.metadata?.name || '').toLowerCase();
        const hostname = (relay.hostname || '').toLowerCase();
        const url = (relay.url || '').toLowerCase();

        if (
          !name.includes(normalizedSearch) &&
          !hostname.includes(normalizedSearch) &&
          !url.includes(normalizedSearch)
        ) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      // 3. Deterministic Sort (Name/Hostname first, then URL)
      const nameA = (a.metadata?.name || a.hostname || a.url).toLowerCase();
      const nameB = (b.metadata?.name || b.hostname || b.url).toLowerCase();

      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;

      // If names are identical, fallback to URL for stability
      if (a.url < b.url) return -1;
      if (a.url > b.url) return 1;

      return 0;
    });
}
