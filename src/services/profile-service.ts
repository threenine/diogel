import { finalizeEvent, getPublicKey, SimplePool } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';
import type { NostrProfile } from '../types';

const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://purplepag.es',
];

const pool = new SimplePool();

export const profileService = {
  async fetchProfile(pubkey: string): Promise<NostrProfile | null> {
    if (!pubkey) return null;

    try {
      const event = await pool.get(DEFAULT_RELAYS, {
        authors: [pubkey],
        kinds: [0],
      });

      if (event && event.content) {
        return JSON.parse(event.content) as NostrProfile;
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
    return null;
  },

  async saveProfile(privkey: string, profile: NostrProfile): Promise<void> {
    const sk = hexToBytes(privkey);
    const pk = getPublicKey(sk);

    // Fetch latest profile to avoid overwriting other fields (like picture/banner)
    const latestProfile = await this.fetchProfile(pk);

    const updatedProfile = {
      ...latestProfile,
      ...profile,
    };

    const eventTemplate = {
      kind: 0,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: JSON.stringify(updatedProfile),
      pubkey: pk,
    };

    const signedEvent = finalizeEvent(eventTemplate, sk);

    await Promise.any(pool.publish(DEFAULT_RELAYS, signedEvent));
  },
};
