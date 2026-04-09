export interface RelayUrlResult {
  valid: boolean;
  url?: string;
  hostname?: string;
  error?: string;
}

/**
 * Normalizes and validates a relay websocket URL.
 *
 * Requirements:
 * - trim whitespace
 * - reject empty values
 * - accept only ws:// and wss:// URLs
 * - reject malformed URLs
 * - normalize hostname casing where safe
 * - normalize trailing slash handling consistently
 * - derive hostname for display/sorting
 * - return structured success/failure output
 *
 * @param input The raw URL string from user input or discovery
 * @returns Structured normalization result
 */
export function normalizeRelayUrl(input: string | null | undefined): RelayUrlResult {
  if (!input || input.trim().length === 0) {
    return {
      valid: false,
      error: 'URL cannot be empty',
    };
  }

  const trimmed = input.trim();

  try {
    const url = new URL(trimmed);

    if (url.protocol !== 'ws:' && url.protocol !== 'wss:') {
      return {
        valid: false,
        error: 'Only ws:// and wss:// protocols are supported',
      };
    }

    // URL constructor already handles:
    // - hostname casing (normalizes to lowercase)
    // - basic malformed URL rejection (throws)

    // Normalize trailing slash: URL object includes a trailing slash for the pathname if it's empty.
    // We want a consistent format. Many Nostr clients prefer no trailing slash if the path is empty.
    // However, if there is a path (e.g. ws://relay.com/path), we should keep it.

    let normalizedUrl = url.toString();

    // If the URL ends with a slash and the pathname was just '/', we trim it for consistency
    // but only if it doesn't have search params or hash which would be unusual for a relay but possible.
    if (url.pathname === '/' && !url.search && !url.hash && normalizedUrl.endsWith('/')) {
      normalizedUrl = normalizedUrl.slice(0, -1);
    }

    return {
      valid: true,
      url: normalizedUrl,
      hostname: url.hostname,
    };
  } catch {
    return {
      valid: false,
      error: 'Invalid URL format',
    };
  }
}
