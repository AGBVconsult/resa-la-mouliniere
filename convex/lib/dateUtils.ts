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
