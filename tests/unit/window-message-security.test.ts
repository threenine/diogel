import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  getCurrentWindowOrigin,
  isDiogelWindowMessage,
  isSameWindowOrigin,
} from 'app/src-bex/window-message-security';

const providerSource = readFileSync('src-bex/nostr-provider.js', 'utf8');
const contentScriptSource = readFileSync('src-bex/content-script.ts', 'utf8');

describe('postMessage target origin hardening (Static)', () => {
  it('does not use wildcard or empty target origins in BEX source', () => {
    const source = `${providerSource}\n${contentScriptSource}`;

    // Negative match for postMessage(..., '*') or postMessage(..., "*")
    expect(source).not.toMatch(/postMessage\s*\([\s\S]*?,\s*['"]\*['"]\s*\)/);
    // Negative match for postMessage(..., '') or postMessage(..., "")
    expect(source).not.toMatch(/postMessage\s*\([\s\S]*?,\s*['"]['"]\s*\)/);
  });
});

describe('window-message-security helpers', () => {
  it('getCurrentWindowOrigin returns window.location.origin', () => {
    const originalOrigin = window.location.origin;
    expect(getCurrentWindowOrigin()).toBe(originalOrigin);
  });

  it('isSameWindowOrigin returns true for same-origin events', () => {
    const event = {
      origin: window.location.origin,
    } as MessageEvent;
    expect(isSameWindowOrigin(event)).toBe(true);
  });

  it('isSameWindowOrigin returns false for different-origin events', () => {
    const event = {
      origin: 'https://malicious.com',
    } as MessageEvent;
    expect(isSameWindowOrigin(event)).toBe(false);
  });

  it('isDiogelWindowMessage accepts valid messages', () => {
    expect(isDiogelWindowMessage({ id: '123', type: 'diogel-request' })).toBe(true);
    expect(isDiogelWindowMessage({ id: 'abc', type: 'diogel-ping', extra: 'data' })).toBe(true);
  });

  it('isDiogelWindowMessage rejects invalid messages', () => {
    expect(isDiogelWindowMessage(null)).toBe(false);
    expect(isDiogelWindowMessage(undefined)).toBe(false);
    expect(isDiogelWindowMessage('not an object')).toBe(false);
    expect(isDiogelWindowMessage({})).toBe(false);
    expect(isDiogelWindowMessage({ id: '123' })).toBe(false);
    expect(isDiogelWindowMessage({ type: 'diogel-request' })).toBe(false);
    expect(isDiogelWindowMessage({ id: 123, type: 'diogel-request' })).toBe(false);
  });
});
