/**
 * Token generation and expiry helpers.
 * Pure functions, testable without Convex runtime.
 */

/**
 * Generate a cryptographically secure token (64 hex chars = 32 bytes).
 * Uses Web Crypto API (available in Convex runtime).
 */
export function generateSecureToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Compute token expiry based on slot start time and settings.
 * Formula: expiresAt = slotStartAtMs - manageTokenExpireBeforeSlotMs
 *
 * @param slotStartAtMs - Timestamp (ms) when the slot starts
 * @param manageTokenExpireBeforeSlotMs - How long before slot the token expires
 * @returns expiresAt timestamp (ms)
 */
export function computeTokenExpiry(
  slotStartAtMs: number,
  manageTokenExpireBeforeSlotMs: number
): number {
  return slotStartAtMs - manageTokenExpireBeforeSlotMs;
}

/**
 * Compute slotStartAt from dateKey, timeKey, and timezone.
 * Returns timestamp in milliseconds.
 *
 * @param dateKey - "YYYY-MM-DD"
 * @param timeKey - "HH:MM"
 * @param timezone - IANA timezone (e.g., "Europe/Brussels")
 */
export function computeSlotStartAt(
  dateKey: string,
  timeKey: string,
  _timezone: string
): number {
  // Parse dateKey and timeKey
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = timeKey.split(":").map(Number);

  // Create date in UTC, then adjust for timezone
  // Note: For proper timezone handling in production, use a library like date-fns-tz
  // For MVP, we assume server runs in the restaurant's timezone or use UTC approximation
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  return date.getTime();
}
