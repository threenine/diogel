import { SimplePool } from 'nostr-tools';
import type { Event, Filter } from 'nostr-tools';

export function useEventService(relayUrls: string[]) {
  const pool = new SimplePool();

  async function getEvents(filter: Filter): Promise<Event[]> {
    const events: Event[] = [];
    return new Promise((resolve) => {
      pool.subscribeMany(relayUrls, filter, {
        onevent(event) {
          events.push(event);
        },
        oneose() {
          resolve(events);
        },
      });
    });
  }

  return {
    relayUrls,
    getEvents,
  };
}
