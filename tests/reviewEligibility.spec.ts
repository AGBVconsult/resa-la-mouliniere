import { describe, expect, test } from "vitest";

import {
  isReviewEligibleStatus,
  isWithinReviewCooldown,
  lastMonthKeys,
  normalizeReviewEmail,
  REVIEW_REQUEST_COOLDOWN_MS,
} from "../convex/lib/reviewEligibility";

describe("isReviewEligibleStatus", () => {
  test.each(["pending", "confirmed", "cardPlaced", "seated", "completed"])("%s → envoi", (status) => {
    expect(isReviewEligibleStatus(status)).toBe(true);
  });

  test.each(["cancelled", "noshow", "incident", "refused"])("%s → bloqué", (status) => {
    expect(isReviewEligibleStatus(status)).toBe(false);
  });
});

describe("normalizeReviewEmail", () => {
  test("trims and lowercases", () => {
    expect(normalizeReviewEmail("  Marie.Dupont@Gmail.COM ")).toBe("marie.dupont@gmail.com");
  });

  test("returns null for missing or invalid email", () => {
    expect(normalizeReviewEmail("")).toBeNull();
    expect(normalizeReviewEmail(undefined)).toBeNull();
    expect(normalizeReviewEmail("   ")).toBeNull();
    expect(normalizeReviewEmail("pas-un-email")).toBeNull();
    expect(normalizeReviewEmail("@gmail.com")).toBeNull();
    expect(normalizeReviewEmail("marie@")).toBeNull();
  });
});

describe("isWithinReviewCooldown", () => {
  const now = new Date("2026-10-04T06:30:00Z").getTime();
  const DAY = 24 * 60 * 60 * 1000;

  test("never asked → not in cooldown", () => {
    expect(isWithinReviewCooldown(null, now)).toBe(false);
  });

  test("asked 1 month ago → in cooldown", () => {
    expect(isWithinReviewCooldown(now - 30 * DAY, now)).toBe(true);
  });

  test("asked 364 days ago → in cooldown", () => {
    expect(isWithinReviewCooldown(now - 364 * DAY, now)).toBe(true);
  });

  test("asked exactly 12 months ago → can ask again", () => {
    expect(isWithinReviewCooldown(now - REVIEW_REQUEST_COOLDOWN_MS, now)).toBe(false);
  });
});

describe("lastMonthKeys", () => {
  test("6 months ending in current month, oldest first", () => {
    expect(lastMonthKeys("2026-10-04", 6)).toEqual([
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
  });

  test("crosses year boundary", () => {
    expect(lastMonthKeys("2027-02-15", 4)).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
  });
});
