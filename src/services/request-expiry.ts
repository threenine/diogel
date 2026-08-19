/**
 * Approval request expiry bounds (ADR D8).
 *
 * The stored setting is a user preference, not an authority: the background clamps whatever it
 * reads to this range before use, so a corrupted or externally written storage entry cannot widen
 * the approval window. There is deliberately no "off" value.
 *
 * These live under `src/` rather than `src-bex/` because both the background and the settings UI
 * need them, and UI code cannot import from `src-bex`.
 */

export const REQUEST_EXPIRY_MIN_MINUTES = 1;
export const REQUEST_EXPIRY_MAX_MINUTES = 10;
export const REQUEST_EXPIRY_DEFAULT_MINUTES = 5;
export const REQUEST_EXPIRY_OPTION_MINUTES: readonly number[] = [1, 2, 5, 10];

/**
 * Clamp a stored expiry preference to the supported range.
 *
 * An absent value falls back to the default. An explicit out-of-range number clamps to the
 * nearest bound: a stored `0` means someone tried to disable expiry, and expiry cannot be
 * disabled, so it becomes the minimum rather than the default.
 */
export const clampRequestExpiryMinutes = (value: unknown): number => {
  if (value === undefined || value === null || value === '') {
    return REQUEST_EXPIRY_DEFAULT_MINUTES;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return REQUEST_EXPIRY_DEFAULT_MINUTES;
  const rounded = Math.round(parsed);
  if (rounded < REQUEST_EXPIRY_MIN_MINUTES) return REQUEST_EXPIRY_MIN_MINUTES;
  if (rounded > REQUEST_EXPIRY_MAX_MINUTES) return REQUEST_EXPIRY_MAX_MINUTES;
  return rounded;
};
