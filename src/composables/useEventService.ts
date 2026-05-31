import { SimplePool } from 'nostr-tools';
import type { Event, Filter } from 'nostr-tools';

export function useEventService(relayUrls: string[]) {
  const pool = new SimplePool();

  async function getEvents(filter: Filter, timeoutMs = 5000): Promise<Event[]> {
    const events = new Map<string, Event>();
    let isFinished = false;

    return new Promise((resolve) => {
      const sub = pool.subscribeMany(relayUrls, filter, {
        onevent(event) {
          if (!events.has(event.id)) {
            events.set(event.id, event);
          }
        },
        oneose() {
          if (!isFinished) {
            isFinished = true;
            sub.close();
            resolve(Array.from(events.values()));
          }
        },
      });

      if (timeoutMs > 0) {
        setTimeout(() => {
          if (!isFinished) {
            isFinished = true;
            sub.close();
            resolve(Array.from(events.values()));
          }
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
