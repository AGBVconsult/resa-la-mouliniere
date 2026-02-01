/**
 * Date utilities for admin operations.
 * Pure functions, testable.
 */

/**
 * Get today's date key in YYYY-MM-DD format for a given timezone.
 * Uses Intl.DateTimeFormat for timezone-aware formatting.
 * 
 * @param timezone - IANA timezone string (e.g., "Europe/Brussels")
 * @returns Date key in YYYY-MM-DD format
 */
export function getTodayDateKey(timezone: string): string {
  // en-CA locale gives YYYY-MM-DD format
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
}

/**
 * Validate dateKey format (YYYY-MM-DD).
 */
export function isValidDateKey(dateKey: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey);
}

/**
 * Get current time key in HH:MM format for a given timezone.
 * Uses Intl.DateTimeFormat for timezone-aware formatting.
 * 
 * @param timezone - IANA timezone string (e.g., "Europe/Brussels")
 * @returns Time key in HH:MM format
 */
export function getCurrentTimeKey(timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return formatter.format(new Date());
}
