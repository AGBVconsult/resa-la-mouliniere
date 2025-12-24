/**
 * Email retry policy helpers.
 * Pure functions, testable.
 * 
 * PRD-008 §7.4: 5 attempts, exponential backoff
 * Backoff = 60_000 * 2^(attempt-1)
 * → 1m, 2m, 4m, 8m, 16m
 */

export const MAX_ATTEMPTS = 5;
export const BASE_BACKOFF_MS = 60_000; // 1 minute

/**
 * Compute backoff delay in milliseconds for a given attempt number.
 * 
 * @param nextAttempt - The attempt number (1-indexed, 1..5)
 * @returns Backoff delay in ms, or null if max attempts exceeded
 * 
 * Examples:
 * - nextAttempt=1 → 60_000 (1 min)
 * - nextAttempt=2 → 120_000 (2 min)
 * - nextAttempt=3 → 240_000 (4 min)
 * - nextAttempt=4 → 480_000 (8 min)
 * - nextAttempt=5 → 960_000 (16 min)
 * - nextAttempt>5 → null (failed)
 */
export function computeBackoffMs(nextAttempt: number): number | null {
  if (nextAttempt < 1 || nextAttempt > MAX_ATTEMPTS) {
    return null;
  }
  return BASE_BACKOFF_MS * Math.pow(2, nextAttempt - 1);
}

/**
 * Determine if a job should be marked as failed (no more retries).
 */
export function shouldMarkFailed(attemptCount: number): boolean {
  return attemptCount >= MAX_ATTEMPTS;
}
