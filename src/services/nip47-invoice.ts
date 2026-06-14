const BOLT11_AMOUNT_PATTERN = /^ln(?:bc|tb|bcrt)(\d+[munp]?)?1/;

const MSAT_MULTIPLIERS: Record<string, number> = {
  m: 100_000_000,
  u: 100_000,
  n: 100,
  p: 0.1,
};

const UNSUFFIXED_MSAT_MULTIPLIER = 100_000_000_000;

/**
 * Parses the amount encoded in a BOLT11 invoice's human-readable part, returning
 * the value in millisatoshis. Returns `undefined` when the invoice has no
 * encoded amount or the amount cannot be parsed.
 */
export function parseBolt11AmountMsat(invoice: string): number | undefined {
  const normalized = invoice.trim().toLowerCase();
  const match = BOLT11_AMOUNT_PATTERN.exec(normalized);
  const amount = match?.[1];
  if (!amount) return undefined;

  const suffix = amount.at(-1);
  const multiplier = suffix ? MSAT_MULTIPLIERS[suffix] : undefined;
  const numericPart = multiplier !== undefined ? amount.slice(0, -1) : amount;
  const value = Number(numericPart);
  if (!Number.isFinite(value)) return undefined;

  return Math.round(value * (multiplier ?? UNSUFFIXED_MSAT_MULTIPLIER));
}

/**
 * Returns a short, display-safe preview of a (potentially very long) invoice
 * string, truncating the middle so the prefix/suffix remain recognisable.
 */
export function previewInvoice(invoice: string): string {
  const normalized = invoice.trim();
  if (normalized.length <= 42) return normalized;
  return `${normalized.slice(0, 24)}…${normalized.slice(-12)}`;
}
