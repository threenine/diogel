import { describe, it, expect } from 'vitest';
import { normalizeRelayUrl } from 'src/services/relay-url';

describe('normalizeRelayUrl', () => {
  it('should validate a valid wss:// URL', () => {
    const result = normalizeRelayUrl('wss://relay.damus.io');
    expect(result.valid).toBe(true);
    expect(result.url).toBe('wss://relay.damus.io');
    expect(result.hostname).toBe('relay.damus.io');
    expect(result.error).toBeUndefined();
  });

  it('should validate a valid ws:// URL', () => {
    const result = normalizeRelayUrl('ws://localhost:8080');
    expect(result.valid).toBe(true);
    expect(result.url).toBe('ws://localhost:8080');
    expect(result.hostname).toBe('localhost');
  });

  it('should trim whitespace', () => {
    const result = normalizeRelayUrl('  wss://relay.damus.io  ');
    expect(result.valid).toBe(true);
    expect(result.url).toBe('wss://relay.damus.io');
  });

  it('should normalize uppercase hostname to lowercase', () => {
    const result = normalizeRelayUrl('WSS://RELAY.DAMUS.IO');
    expect(result.valid).toBe(true);
    expect(result.url).toBe('wss://relay.damus.io');
    expect(result.hostname).toBe('relay.damus.io');
  });

  it('should normalize trailing slash (remove it if path is empty)', () => {
    const result = normalizeRelayUrl('wss://relay.damus.io/');
    expect(result.valid).toBe(true);
    expect(result.url).toBe('wss://relay.damus.io');
  });

  it('should keep trailing slash if there is a path', () => {
    const result = normalizeRelayUrl('wss://relay.damus.io/path/');
    expect(result.valid).toBe(true);
    expect(result.url).toBe('wss://relay.damus.io/path/');
  });

  it('should reject empty string', () => {
    const result = normalizeRelayUrl('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('URL cannot be empty');
  });

  it('should reject string with only whitespace', () => {
    const result = normalizeRelayUrl('   ');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('URL cannot be empty');
  });

  it('should reject null or undefined', () => {
    expect(normalizeRelayUrl(null).valid).toBe(false);
    expect(normalizeRelayUrl(undefined).valid).toBe(false);
  });

  it('should reject non-websocket schemes', () => {
    const result = normalizeRelayUrl('https://relay.damus.io');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Only ws:// and wss:// protocols are supported');
  });

  it('should reject malformed URLs', () => {
    const result = normalizeRelayUrl('not-a-url');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid URL format');
  });

  it('should handle URLs with ports correctly', () => {
    const result = normalizeRelayUrl('wss://relay.pro:443/');
    expect(result.valid).toBe(true);
    expect(result.url).toBe('wss://relay.pro'); // URL constructor might strip default port
    expect(result.hostname).toBe('relay.pro');
  });

  it('should handle custom paths', () => {
    const result = normalizeRelayUrl('wss://relay.damus.io/v1');
    expect(result.valid).toBe(true);
    expect(result.url).toBe('wss://relay.damus.io/v1');
  });
});
