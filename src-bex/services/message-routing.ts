/**
 * The decision the raw message listener makes before dispatching.
 *
 * Extracted from `background.ts` (#173). The listener itself stays there — it is wiring — but the
 * branching it wraps was unreachable from any test, because importing that module runs
 * `initialize()` and registers a dozen listeners.
 *
 * What it decides is small and worth being sure of: an action scoped to an origin must not be
 * dispatched without one. `checkPermission` and every signing handler key on the origin, so an empty
 * one would be a request from nowhere being answered as though it came from somewhere.
 */

/**
 * Actions that mean nothing without a requesting origin.
 *
 * Every one of them either signs, encrypts, decrypts, pays, or reveals an identity on a site's
 * behalf. The panel and vault actions are deliberately absent: they come from the extension's own
 * surfaces, which have no site origin to give.
 */
export const ORIGIN_SCOPED_ACTIONS: ReadonlySet<string> = new Set([
  'nostr.getPublicKey',
  'nostr.signEvent',
  'nostr.getRelays',
  'nostr.nip04.encrypt',
  'nostr.nip04.decrypt',
  'nostr.nip44.encrypt',
  'nostr.nip44.decrypt',
  'nip57.getCapabilities',
  'nip57.sendZap',
  'webln.enable',
  'webln.getInfo',
  'webln.sendPayment',
]);

export interface RawMessage {
  type?: unknown;
  payload?: unknown;
}

export type RoutingDecision =
  | { dispatch: true; type: string; payload: Record<string, unknown>; origin: string }
  | { dispatch: false; error: string };

/**
 * Whether a raw message may be dispatched, and with what.
 *
 * Returns the origin as a string rather than leaving it `unknown`: a non-string origin on an
 * origin-scoped action is the same failure as a missing one, and collapsing both here means the
 * dispatcher never has to wonder.
 */
export const decideRouting = (message: RawMessage): RoutingDecision => {
  const type = typeof message.type === 'string' ? message.type : '';
  const payload = (message.payload ?? {}) as Record<string, unknown>;
  const rawOrigin = payload.origin;
  const origin = typeof rawOrigin === 'string' ? rawOrigin : '';

  if (ORIGIN_SCOPED_ACTIONS.has(type) && !origin) {
    return { dispatch: false, error: 'Missing origin for origin-scoped action' };
  }

  return { dispatch: true, type, payload, origin };
};
