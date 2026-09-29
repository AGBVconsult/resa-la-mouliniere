import { describe, expect, test } from "vitest";

import { isReviewSuppressionWindowOpen } from "../convex/lib/reviewSuppression";

const TZ = "Europe/Brussels";
// 2026-09-29 (CEST, UTC+2)
const at = (isoLocal: string) => new Date(`${isoLocal}+02:00`).getTime();

describe("isReviewSuppressionWindowOpen", () => {
  test("today is open (lunch time → can anticipate dinner)", () => {
    expect(isReviewSuppressionWindowOpen("2026-09-29", TZ, at("2026-09-29T12:30:00"))).toBe(true);
  });

  test("today is open late in the evening", () => {
    expect(isReviewSuppressionWindowOpen("2026-09-29", TZ, at("2026-09-29T23:59:00"))).toBe(true);
  });

  test("tomorrow is closed", () => {
    expect(isReviewSuppressionWindowOpen("2026-09-30", TZ, at("2026-09-29T12:30:00"))).toBe(false);
  });

  test("yesterday is open before 06:30", () => {
    expect(isReviewSuppressionWindowOpen("2026-09-28", TZ, at("2026-09-29T00:45:00"))).toBe(true);
    expect(isReviewSuppressionWindowOpen("2026-09-28", TZ, at("2026-09-29T06:29:00"))).toBe(true);
  });

  test("yesterday is closed from 06:30", () => {
    expect(isReviewSuppressionWindowOpen("2026-09-28", TZ, at("2026-09-29T06:30:00"))).toBe(false);
    expect(isReviewSuppressionWindowOpen("2026-09-28", TZ, at("2026-09-29T12:00:00"))).toBe(false);
  });

  test("older dates are closed", () => {
    expect(isReviewSuppressionWindowOpen("2026-09-27", TZ, at("2026-09-29T00:30:00"))).toBe(false);
  });

  test("uses restaurant timezone, not UTC (23:30 UTC = 01:30 Brussels next day)", () => {
    const nowMs = Date.parse("2026-09-29T23:30:00Z");
    expect(isReviewSuppressionWindowOpen("2026-09-30", TZ, nowMs)).toBe(true);
    expect(isReviewSuppressionWindowOpen("2026-09-29", TZ, nowMs)).toBe(true);
    expect(isReviewSuppressionWindowOpen("2026-10-01", TZ, nowMs)).toBe(false);
  });
});
