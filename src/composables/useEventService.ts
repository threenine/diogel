import { SimplePool } from 'nostr-tools';
import type { Event, Filter } from 'nostr-tools';

export function useEventService(relayUrls: string[]) {
  const pool = new SimplePool();

  async function getEvents(filter: Filter, timeoutMs = 5000): Promise<Event[]> {
    const events: Event[] = [];
    return new Promise((resolve) => {
      const sub = pool.subscribeMany(relayUrls, filter, {
        onevent(event) {
          events.push(event);
        },
        oneose() {
          sub.close();
          resolve(events);
        },
      });

      if (timeoutMs > 0) {
        setTimeout(() => {
          sub.close();
          resolve(events);
        }, timeoutMs);
      }
    });
  }

  return {
    relayUrls,
    getEvents,
    close: () => pool.close(relayUrls),
  };
}
