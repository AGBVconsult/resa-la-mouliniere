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
