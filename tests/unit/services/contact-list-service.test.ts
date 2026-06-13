import { describe, expect, it } from 'vitest';
import { nip19 } from 'nostr-tools';
import {
  buildContactListTags,
  normalizePubkey,
  parseContactTags,
  validateContactInput,
} from 'src/services/contact-list-service';
import type { Nip02Contact } from 'src/types/contact-list';

const pubkeyOne = '0'.repeat(63) + '1';
const pubkeyTwo = '0'.repeat(63) + '2';
const pubkeyThree = '0'.repeat(63) + '3';

describe('contact-list-service', () => {
  describe('normalizePubkey', () => {
    it('normalizes hex pubkeys to lowercase', () => {
      expect(normalizePubkey(pubkeyOne.toUpperCase())).toBe(pubkeyOne);
    });

    it('normalizes npub values to hex pubkeys', () => {
      const npub = nip19.npubEncode(pubkeyTwo);

      expect(normalizePubkey(npub)).toBe(pubkeyTwo);
    });

    it('rejects invalid pubkeys', () => {
      expect(normalizePubkey('not-a-pubkey')).toBeNull();
      expect(normalizePubkey('f'.repeat(63))).toBeNull();
    });
  });

  describe('parseContactTags', () => {
    it('parses valid NIP-02 p tags in order', () => {
      const contacts = parseContactTags([
        ['p', pubkeyOne, 'wss://relay.one', 'alice'],
        ['e', 'ignored'],
        ['p', pubkeyTwo, '', 'bob'],
      ]);

      expect(contacts).toEqual<Nip02Contact[]>([
        { pubkey: pubkeyOne, relayUrl: 'wss://relay.one', petname: 'alice' },
        { pubkey: pubkeyTwo, relayUrl: '', petname: 'bob' },
      ]);
    });

    it('ignores invalid and duplicate p tags', () => {
      const contacts = parseContactTags([
        ['p'],
        ['p', 'bad-key', 'wss://relay.bad', 'bad'],
        ['p', pubkeyOne, 'wss://relay.one', 'alice'],
        ['p', pubkeyOne, 'wss://relay.duplicate', 'duplicate'],
      ]);

      expect(contacts).toEqual<Nip02Contact[]>([
        { pubkey: pubkeyOne, relayUrl: 'wss://relay.one', petname: 'alice' },
      ]);
    });
  });

  describe('buildContactListTags', () => {
    it('builds canonical NIP-02 p tags', () => {
      expect(
        buildContactListTags([
          { pubkey: pubkeyOne, relayUrl: ' wss://relay.one ', petname: ' alice ' },
          { pubkey: pubkeyTwo, relayUrl: '', petname: '' },
        ]),
      ).toEqual([
        ['p', pubkeyOne, 'wss://relay.one', 'alice'],
        ['p', pubkeyTwo, '', ''],
      ]);
    });
  });

  describe('validateContactInput', () => {
    it('accepts a valid hex pubkey and optional fields', () => {
      const result = validateContactInput(pubkeyOne, '', 'alice', []);

      expect(result.valid).toBe(true);
      expect(result.contact).toEqual<Nip02Contact>({
        pubkey: pubkeyOne,
        relayUrl: '',
        petname: 'alice',
      });
    });

    it('accepts and normalizes a valid relay URL', () => {
      const result = validateContactInput(pubkeyOne, ' wss://relay.example.com/ ', 'alice', []);

      expect(result.valid).toBe(true);
      expect(result.contact?.relayUrl).toBe('wss://relay.example.com');
    });

    it('rejects duplicate contacts', () => {
      const result = validateContactInput(pubkeyOne, '', '', [
        { pubkey: pubkeyOne, relayUrl: '', petname: '' },
      ]);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('already');
    });

    it('allows editing the original contact without treating it as duplicate', () => {
      const result = validateContactInput(
        pubkeyOne,
        '',
        'alice edited',
        [
          { pubkey: pubkeyOne, relayUrl: '', petname: 'alice' },
          { pubkey: pubkeyThree, relayUrl: '', petname: 'carol' },
        ],
        pubkeyOne,
      );

      expect(result.valid).toBe(true);
      expect(result.contact?.petname).toBe('alice edited');
    });

    it('rejects invalid relay URLs', () => {
      const result = validateContactInput(pubkeyOne, 'https://relay.example.com', '', []);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('protocols');
    });
  });
});
