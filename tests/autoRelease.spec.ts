import { describe, it, expect } from "vitest";
import { shouldAutoRelease, AUTO_RELEASE_DELAY_MS } from "../convex/lib/autoRelease";

describe("shouldAutoRelease", () => {
  const NOW = Date.now();
  const NINETY_MIN = AUTO_RELEASE_DELAY_MS;

  describe("B1 - seated client", () => {
    it("should release when seated for >= 90 min", () => {
      const result = shouldAutoRelease({
        status: "seated",
        seatedAt: NOW - NINETY_MIN,
        slotStartAt: NOW - 120 * 60000,
        now: NOW,
        hasTable: true,
      });
      expect(result.shouldRelease).toBe(true);
      expect(result.reason).toBe("auto_release_seated");
    });

    it("should NOT release when seated for < 90 min", () => {
      const result = shouldAutoRelease({
        status: "seated",
        seatedAt: NOW - (NINETY_MIN - 60000),
        slotStartAt: NOW - 120 * 60000,
        now: NOW,
        hasTable: true,
      });
      expect(result.shouldRelease).toBe(false);
    });

    it("should NOT release seated without seatedAt", () => {
      const result = shouldAutoRelease({
        status: "seated",
        seatedAt: null,
        slotStartAt: NOW - NINETY_MIN,
        now: NOW,
        hasTable: true,
      });
      expect(result.shouldRelease).toBe(false);
    });
  });

  describe("B2 - confirmed/cardPlaced with table, never arrived", () => {
    it("should release confirmed with table when slotStartAt >= 90 min ago", () => {
      const result = shouldAutoRelease({
        status: "confirmed",
        seatedAt: null,
        slotStartAt: NOW - NINETY_MIN,
        now: NOW,
        hasTable: true,
      });
      expect(result.shouldRelease).toBe(true);
      expect(result.reason).toBe("auto_release_not_arrived");
    });

    it("should release cardPlaced with table when slotStartAt >= 90 min ago", () => {
      const result = shouldAutoRelease({
        status: "cardPlaced",
        seatedAt: null,
        slotStartAt: NOW - NINETY_MIN - 5000,
        now: NOW,
        hasTable: true,
      });
      expect(result.shouldRelease).toBe(true);
      expect(result.reason).toBe("auto_release_not_arrived");
    });

    it("should NOT release confirmed without table", () => {
      const result = shouldAutoRelease({
        status: "confirmed",
        seatedAt: null,
        slotStartAt: NOW - NINETY_MIN,
        now: NOW,
        hasTable: false,
      });
      expect(result.shouldRelease).toBe(false);
    });

    it("should NOT release when slotStartAt < 90 min ago", () => {
      const result = shouldAutoRelease({
        status: "confirmed",
        seatedAt: null,
        slotStartAt: NOW - (NINETY_MIN - 60000),
        now: NOW,
        hasTable: true,
      });
      expect(result.shouldRelease).toBe(false);
    });
  });

  describe("other statuses", () => {
    it("should NOT release pending status", () => {
      const result = shouldAutoRelease({
        status: "pending",
        seatedAt: null,
        slotStartAt: NOW - NINETY_MIN * 2,
        now: NOW,
        hasTable: true,
      });
      expect(result.shouldRelease).toBe(false);
    });

    it("should NOT release completed status", () => {
      const result = shouldAutoRelease({
        status: "completed",
        seatedAt: NOW - NINETY_MIN * 2,
        slotStartAt: NOW - NINETY_MIN * 3,
        now: NOW,
        hasTable: true,
      });
      expect(result.shouldRelease).toBe(false);
    });
  });
});
