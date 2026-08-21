import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect } from 'vitest';

/**
 * Every declared bridge action must be reachable, by one path or the other.
 *
 * There are two: `dispatcher.ts`'s switch, used by the raw `chrome.runtime.onMessage` listener, and
 * `bridge.on` registrations in `background.ts`, used by the Quasar bridge. An action declared in the
 * union but wired to neither is a call that silently does nothing — no error, no route, no reply
 * (#173).
 *
 * This reads the source rather than the runtime because `background.ts` cannot be imported: it
 * registers listeners and calls `initialize()` at load, which is the same reason coverage skips it.
 */

const ROOT = resolve(__dirname, '../..');

const read = (path: string): string => readFileSync(resolve(ROOT, path), 'utf8');

const declaredActions = (): string[] => {
  const source = read('src/types/bridge-types.d.ts');
  const union = /export type BridgeAction =(.*?);/s.exec(source)?.[1] ?? '';
  return [...union.matchAll(/'([^']+)'/g)].map(([, action]) => action ?? '');
};

const dispatcherCases = (): string[] =>
  [...read('src-bex/dispatcher.ts').matchAll(/case '([^']+)'/g)].map(([, action]) => action ?? '');

const bridgeRegistrations = (): string[] =>
  [...read('src-bex/background.ts').matchAll(/bridge\.on\('([^']+)'/g)].map(([, action]) => action ?? '');

/**
 * Declared, wired to neither path, and sent by nothing.
 *
 * Recorded rather than fixed here: removing an action from the union is a contract change, and one
 * of these is a permission call, which deserves a deliberate decision rather than a tidy-up.
 */
const KNOWN_UNROUTED = ['permission.check', 'permission.grant', 'vault.setData'];

describe('bridge action routing', () => {
  const actions = declaredActions();
  const routed = new Set([...dispatcherCases(), ...bridgeRegistrations()]);

  it('parses all three sources, so this cannot pass by reading nothing', () => {
    expect(actions.length).toBeGreaterThan(40);
    expect(dispatcherCases().length).toBeGreaterThan(30);
    expect(bridgeRegistrations().length).toBeGreaterThan(30);
  });

  it('routes every declared action except the ones known to be unrouted', () => {
    const unrouted = actions.filter((action) => !routed.has(action));

    expect(unrouted.sort()).toEqual([...KNOWN_UNROUTED].sort());
  });

  it('has no route for an action that was never declared', () => {
    // A typo in a `case` or a `bridge.on` name is otherwise invisible: the action simply never
    // matches, and the caller gets silence.
    const undeclared = [...routed].filter((action) => !actions.includes(action));

    expect(undeclared).toEqual([]);
  });

  it('keeps the unrouted list honest', () => {
    // If one of these gains a route, this fails and the entry should be deleted rather than the
    // expectation loosened.
    for (const action of KNOWN_UNROUTED) {
      expect(actions).toContain(action);
      expect(routed.has(action)).toBe(false);
    }
  });
});
