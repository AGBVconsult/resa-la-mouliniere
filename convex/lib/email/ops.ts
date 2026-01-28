/**
 * Email operations helpers (pure functions).
 * Used by reminders, cleanup, reaper.
 */

/**
 * Build a stable dedupeKey for reminder emails.
 * Format: "reminder:{reservationId}"
 * 
 * @param reservationId - The reservation ID
 * @returns Stable dedupeKey for reminder
 */
export function buildReminderDedupeKey(reservationId: string): string {
  return `reminder:${reservationId}`;
}

/**
 * Build a stable dedupeKey for review emails.
 * Format: "review:{reservationId}"
 * 
 * @param reservationId - The reservation ID
 * @returns Stable dedupeKey for review
 */
export function buildReviewDedupeKey(reservationId: string): string {
  return `review:${reservationId}`;
}

/**
 * Compute yesterday's date key in YYYY-MM-DD format for a given timezone.
 * Uses Intl.DateTimeFormat for timezone-aware formatting.
 * 
 * @param timezone - IANA timezone string (e.g., "Europe/Brussels")
 * @param nowMs - Current timestamp in milliseconds
 * @returns Date key in YYYY-MM-DD format for yesterday
 */
export function computeYesterdayDateKey(timezone: string, nowMs: number): string {
  const yesterday = new Date(nowMs - 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(yesterday);
}

/**
 * Compute tomorrow's date key in YYYY-MM-DD format for a given timezone.
 * Uses Intl.DateTimeFormat for timezone-aware formatting.
 * 
 * @param timezone - IANA timezone string (e.g., "Europe/Brussels")
 * @param nowMs - Current timestamp in milliseconds
 * @returns Date key in YYYY-MM-DD format for tomorrow
 */
export function computeTomorrowDateKey(timezone: string, nowMs: number): string {
  const tomorrow = new Date(nowMs + 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(tomorrow);
}

/**
 * Compute today's date key in YYYY-MM-DD format for a given timezone.
 * Uses Intl.DateTimeFormat for timezone-aware formatting.
 * 
 * @param timezone - IANA timezone string (e.g., "Europe/Brussels")
 * @param nowMs - Current timestamp in milliseconds
 * @returns Date key in YYYY-MM-DD format for today
 */
export function computeTodayDateKey(timezone: string, nowMs: number): string {
  const today = new Date(nowMs);
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(today);
}

/**
 * Compute the timestamp for a given dateKey and timeKey in a timezone.
 * 
 * @param dateKey - Date in YYYY-MM-DD format
 * @param timeKey - Time in HH:MM format
 * @param timezone - IANA timezone string (e.g., "Europe/Brussels")
 * @returns Timestamp in milliseconds
 */
export function computeReservationTimestamp(dateKey: string, timeKey: string, timezone: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hours, minutes] = timeKey.split(":").map(Number);
  
  // Create a date string that we can parse
  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
  
  // Use Intl to get the offset for this timezone at this date
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  
  // Create a UTC date and adjust for timezone
  const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
  
  // Get the timezone offset by comparing local and UTC representations
  const parts = formatter.formatToParts(utcDate);
  const localHour = parseInt(parts.find(p => p.type === "hour")?.value ?? "0");
  const utcHour = utcDate.getUTCHours();
  
  // Calculate offset (simplified - may not handle DST edge cases perfectly)
  let offsetHours = localHour - utcHour;
  if (offsetHours > 12) offsetHours -= 24;
  if (offsetHours < -12) offsetHours += 24;
  
  // Return the timestamp adjusted for timezone
  return Date.UTC(year, month - 1, day, hours - offsetHours, minutes, 0);
}

/**
 * Check if a job is stuck in processing.
 * A job is considered stuck if lastAttemptAt is set and older than stuckMs.
 * 
 * Note: Schema has no "processing" status, we use lastAttemptAt as processing marker.
 * A job is "in processing" if status=queued AND lastAttemptAt is recent.
 * It's "stuck" if status=queued AND lastAttemptAt is old (> stuckMs).
 * 
 * @param lastAttemptAt - Timestamp when processing started (or null)
 * @param nowMs - Current timestamp
 * @param stuckMs - Threshold in milliseconds
 * @returns true if job is stuck
 */
export function isStuck(
  lastAttemptAt: number | null,
  nowMs: number,
  stuckMs: number
): boolean {
  if (lastAttemptAt === null) return false;
  return nowMs - lastAttemptAt > stuckMs;
}

/**
 * Retention policy for email jobs.
 * Contract §7: emailJobs en `sent` de plus de 90 jours.
 * 
 * TICKET: retention policy for `failed` not specified in contract.
 * Using 90 days for failed as well (audit-friendly).
 */
export interface RetentionPolicy {
  sentRetentionMs: number;
  failedRetentionMs: number;
}

export const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
  sentRetentionMs: 90 * 24 * 60 * 60 * 1000, // 90 days
  failedRetentionMs: 90 * 24 * 60 * 60 * 1000, // 90 days (TICKET: not specified, using same as sent)
};

/**
 * Check if an email job is expired based on retention policy.
 * 
 * @param status - Job status
 * @param updatedAt - Last update timestamp
 * @param nowMs - Current timestamp
 * @param policy - Retention policy
 * @returns true if job should be cleaned up
 */
export function isExpiredByRetention(
  status: "queued" | "sent" | "failed",
  updatedAt: number,
  nowMs: number,
  policy: RetentionPolicy = DEFAULT_RETENTION_POLICY
): boolean {
  if (status === "sent") {
    return nowMs - updatedAt > policy.sentRetentionMs;
  }
  if (status === "failed") {
    return nowMs - updatedAt > policy.failedRetentionMs;
  }
  // queued jobs are never expired by retention
  return false;
}

/**
 * Stuck threshold for reaper.
 * TICKET: stuck threshold not specified in contract/PRD.
 * Using 10 minutes as reasonable default for email sending.
 */
export const STUCK_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
