/**
 * One origin normalisation, used everywhere an origin is stored, matched, or displayed.
 *
 * Grants matched on exact origin strings while the approvals log stored trimmed lowercased
 * hostnames, so the same site was keyed two different ways in two different stores (#116). Anything
 * that decides authority has to agree on what "the same site" means.
 */

/**
 * Returns the canonical origin, or null when the input names no origin we will act on.
 *
 * Only http and https are accepted. A grant or binding for any other scheme is meaningless here:
 * the provider is injected into web pages, and treating `file://` or an extension page as a site
 * would let a non-web context inherit a site's authority.
 */
export const normalizeOrigin = (value: string | undefined | null): string | null => {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    // `URL.origin` already lowercases the host and drops a default port.
    return parsed.origin;
  } catch {
    return null;
  }
};

/** Host without the scheme, for display and for the approvals log. Never used for matching. */
export const originHostname = (value: string): string => {
  const normalized = normalizeOrigin(value);
  if (!normalized) return value.trim().toLowerCase();
  return new URL(normalized).hostname;
};
