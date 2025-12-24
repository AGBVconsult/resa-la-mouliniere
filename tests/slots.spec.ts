import { describe, it, expect } from "vitest";
import {
  buildSlotKey,
  parseSlotKey,
  computeEffectiveOpen,
  TIME_KEY_REGEX,
  DATE_KEY_REGEX,
} from "../convex/slots";

describe("slots", () => {
  describe("buildSlotKey", () => {
    it("builds correct format: dateKey#service#timeKey", () => {
      expect(buildSlotKey("2025-01-15", "lunch", "12:00")).toBe("2025-01-15#lunch#12:00");
      expect(buildSlotKey("2025-12-31", "dinner", "19:30")).toBe("2025-12-31#dinner#19:30");
    });

    it("uses lunch/dinner enums", () => {
      const lunchKey = buildSlotKey("2025-01-15", "lunch", "12:00");
      expect(lunchKey).toContain("#lunch#");

      const dinnerKey = buildSlotKey("2025-01-15", "dinner", "19:00");
      expect(dinnerKey).toContain("#dinner#");
    });
  });

  describe("parseSlotKey", () => {
    it("parses valid slotKey", () => {
      const result = parseSlotKey("2025-01-15#lunch#12:00");
      expect(result).toEqual({
        dateKey: "2025-01-15",
        service: "lunch",
        timeKey: "12:00",
      });
    });

    it("parses dinner slotKey", () => {
      const result = parseSlotKey("2025-12-31#dinner#19:30");
      expect(result).toEqual({
        dateKey: "2025-12-31",
        service: "dinner",
        timeKey: "19:30",
      });
    });

    it("returns null for invalid format", () => {
      expect(parseSlotKey("invalid")).toBeNull();
      expect(parseSlotKey("2025-01-15#brunch#12:00")).toBeNull();
      expect(parseSlotKey("2025-1-15#lunch#12:00")).toBeNull();
      expect(parseSlotKey("2025-01-15#lunch#12")).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(parseSlotKey("")).toBeNull();
    });
  });

  describe("computeEffectiveOpen", () => {
    it("returns true when isOpen=true AND capacity>0", () => {
      expect(computeEffectiveOpen(true, 50)).toBe(true);
      expect(computeEffectiveOpen(true, 1)).toBe(true);
    });

    it("returns false when isOpen=false", () => {
      expect(computeEffectiveOpen(false, 50)).toBe(false);
      expect(computeEffectiveOpen(false, 0)).toBe(false);
    });

    it("returns false when capacity=0", () => {
      expect(computeEffectiveOpen(true, 0)).toBe(false);
    });

    it("returns false when capacity<0", () => {
      expect(computeEffectiveOpen(true, -1)).toBe(false);
    });
  });

  describe("TIME_KEY_REGEX", () => {
    it("accepts valid HH:MM format", () => {
      expect(TIME_KEY_REGEX.test("12:00")).toBe(true);
      expect(TIME_KEY_REGEX.test("00:00")).toBe(true);
      expect(TIME_KEY_REGEX.test("23:59")).toBe(true);
      expect(TIME_KEY_REGEX.test("19:30")).toBe(true);
    });

    it("rejects invalid formats", () => {
      expect(TIME_KEY_REGEX.test("12:0")).toBe(false);
      expect(TIME_KEY_REGEX.test("1:00")).toBe(false);
      expect(TIME_KEY_REGEX.test("12-00")).toBe(false);
      expect(TIME_KEY_REGEX.test("12:00:00")).toBe(false);
    });
  });

  describe("DATE_KEY_REGEX", () => {
    it("accepts valid YYYY-MM-DD format", () => {
      expect(DATE_KEY_REGEX.test("2025-01-15")).toBe(true);
      expect(DATE_KEY_REGEX.test("2025-12-31")).toBe(true);
    });

    it("rejects invalid formats", () => {
      expect(DATE_KEY_REGEX.test("2025-1-15")).toBe(false);
      expect(DATE_KEY_REGEX.test("25-01-15")).toBe(false);
      expect(DATE_KEY_REGEX.test("2025/01/15")).toBe(false);
    });
  });

  describe("slotKey format validation", () => {
    const SLOT_KEY_REGEX = /^\d{4}-\d{2}-\d{2}#(lunch|dinner)#\d{2}:\d{2}$/;

    it("accepts valid slotKey format", () => {
      expect(SLOT_KEY_REGEX.test("2025-01-15#lunch#12:00")).toBe(true);
      expect(SLOT_KEY_REGEX.test("2025-12-31#dinner#19:30")).toBe(true);
    });

    it("rejects invalid service", () => {
      expect(SLOT_KEY_REGEX.test("2025-01-15#brunch#12:00")).toBe(false);
      expect(SLOT_KEY_REGEX.test("2025-01-15#midi#12:00")).toBe(false);
    });

    it("rejects invalid date format", () => {
      expect(SLOT_KEY_REGEX.test("2025-1-15#lunch#12:00")).toBe(false);
      expect(SLOT_KEY_REGEX.test("25-01-15#lunch#12:00")).toBe(false);
    });

    it("rejects invalid time format", () => {
      expect(SLOT_KEY_REGEX.test("2025-01-15#lunch#12")).toBe(false);
      expect(SLOT_KEY_REGEX.test("2025-01-15#lunch#1:00")).toBe(false);
    });
  });

  describe("maxGroupSize accepts null", () => {
    it("null means no limit", () => {
      const maxGroupSize: number | null = null;
      expect(maxGroupSize).toBeNull();
    });

    it("number means limit", () => {
      const maxGroupSize: number | null = 15;
      expect(maxGroupSize).toBe(15);
    });
  });

  describe("service enum", () => {
    const validServices = ["lunch", "dinner"];

    it("accepts lunch", () => {
      expect(validServices.includes("lunch")).toBe(true);
    });

    it("accepts dinner", () => {
      expect(validServices.includes("dinner")).toBe(true);
    });

    it("rejects midi/soir", () => {
      expect(validServices.includes("midi")).toBe(false);
      expect(validServices.includes("soir")).toBe(false);
    });
  });
});
