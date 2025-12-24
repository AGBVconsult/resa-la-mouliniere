import { describe, expect, test } from "vitest";

import {
  buildReminderDedupeKey,
  computeTomorrowDateKey,
  isStuck,
  isExpiredByRetention,
  DEFAULT_RETENTION_POLICY,
  STUCK_THRESHOLD_MS,
} from "../convex/lib/email/ops";

describe("buildReminderDedupeKey", () => {
  test("builds correct format", () => {
    const key = buildReminderDedupeKey("abc123");
    expect(key).toBe("reminder:abc123");
  });

  test("handles different IDs", () => {
    expect(buildReminderDedupeKey("res_001")).toBe("reminder:res_001");
    expect(buildReminderDedupeKey("xyz")).toBe("reminder:xyz");
  });

  test("is deterministic", () => {
    const id = "test-reservation-id";
    expect(buildReminderDedupeKey(id)).toBe(buildReminderDedupeKey(id));
  });
});

describe("computeTomorrowDateKey", () => {
  test("returns YYYY-MM-DD format", () => {
    const now = Date.now();
    const dateKey = computeTomorrowDateKey("Europe/Brussels", now);
    expect(dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("returns tomorrow, not today", () => {
    // Use a fixed date for predictable testing
    const fixedDate = new Date("2024-12-25T12:00:00Z").getTime();
    const tomorrowKey = computeTomorrowDateKey("UTC", fixedDate);
    expect(tomorrowKey).toBe("2024-12-26");
  });

  test("handles timezone correctly", () => {
    // At 23:00 UTC on Dec 25, it's already Dec 26 in Brussels (UTC+1)
    // So tomorrow in Brussels would be Dec 27
    const lateNightUTC = new Date("2024-12-25T23:00:00Z").getTime();
    const tomorrowBrussels = computeTomorrowDateKey("Europe/Brussels", lateNightUTC);
    // In Brussels at 23:00 UTC, it's 00:00 Dec 26, so tomorrow is Dec 27
    expect(tomorrowBrussels).toBe("2024-12-27");
  });

  test("handles different timezones", () => {
    const fixedDate = new Date("2024-06-15T12:00:00Z").getTime();
    const utcTomorrow = computeTomorrowDateKey("UTC", fixedDate);
    expect(utcTomorrow).toBe("2024-06-16");
  });
});

describe("isStuck", () => {
  const stuckMs = 10 * 60 * 1000; // 10 minutes

  test("returns false if lastAttemptAt is null", () => {
    expect(isStuck(null, Date.now(), stuckMs)).toBe(false);
  });

  test("returns false if within threshold", () => {
    const now = Date.now();
    const recentAttempt = now - 5 * 60 * 1000; // 5 minutes ago
    expect(isStuck(recentAttempt, now, stuckMs)).toBe(false);
  });

  test("returns true if beyond threshold", () => {
    const now = Date.now();
    const oldAttempt = now - 15 * 60 * 1000; // 15 minutes ago
    expect(isStuck(oldAttempt, now, stuckMs)).toBe(true);
  });

  test("returns false at exact threshold", () => {
    const now = Date.now();
    const exactThreshold = now - stuckMs;
    expect(isStuck(exactThreshold, now, stuckMs)).toBe(false);
  });

  test("returns true just past threshold", () => {
    const now = Date.now();
    const justPastThreshold = now - stuckMs - 1;
    expect(isStuck(justPastThreshold, now, stuckMs)).toBe(true);
  });
});

describe("isExpiredByRetention", () => {
  const now = Date.now();
  const policy = DEFAULT_RETENTION_POLICY;

  test("queued jobs are never expired", () => {
    const veryOld = now - 365 * 24 * 60 * 60 * 1000; // 1 year ago
    expect(isExpiredByRetention("queued", veryOld, now, policy)).toBe(false);
  });

  test("sent job within retention is not expired", () => {
    const recent = now - 30 * 24 * 60 * 60 * 1000; // 30 days ago
    expect(isExpiredByRetention("sent", recent, now, policy)).toBe(false);
  });

  test("sent job beyond retention is expired", () => {
    const old = now - 100 * 24 * 60 * 60 * 1000; // 100 days ago
    expect(isExpiredByRetention("sent", old, now, policy)).toBe(true);
  });

  test("failed job within retention is not expired", () => {
    const recent = now - 30 * 24 * 60 * 60 * 1000; // 30 days ago
    expect(isExpiredByRetention("failed", recent, now, policy)).toBe(false);
  });

  test("failed job beyond retention is expired", () => {
    const old = now - 100 * 24 * 60 * 60 * 1000; // 100 days ago
    expect(isExpiredByRetention("failed", old, now, policy)).toBe(true);
  });

  test("uses custom policy if provided", () => {
    const customPolicy = {
      sentRetentionMs: 7 * 24 * 60 * 60 * 1000, // 7 days
      failedRetentionMs: 14 * 24 * 60 * 60 * 1000, // 14 days
    };
    const tenDaysAgo = now - 10 * 24 * 60 * 60 * 1000;
    
    expect(isExpiredByRetention("sent", tenDaysAgo, now, customPolicy)).toBe(true);
    expect(isExpiredByRetention("failed", tenDaysAgo, now, customPolicy)).toBe(false);
  });
});

describe("constants", () => {
  test("DEFAULT_RETENTION_POLICY has correct values", () => {
    expect(DEFAULT_RETENTION_POLICY.sentRetentionMs).toBe(90 * 24 * 60 * 60 * 1000);
    expect(DEFAULT_RETENTION_POLICY.failedRetentionMs).toBe(90 * 24 * 60 * 60 * 1000);
  });

  test("STUCK_THRESHOLD_MS is 10 minutes", () => {
    expect(STUCK_THRESHOLD_MS).toBe(10 * 60 * 1000);
  });
});
